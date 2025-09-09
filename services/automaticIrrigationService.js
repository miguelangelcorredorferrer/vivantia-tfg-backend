import { pool } from '../config/db.js';
import { sendDownlinkForConfig } from './ttnService.js';

import {
  createCropThresholdAlert,
  createAutomaticIrrigationStartedAlert,
  createAutomaticIrrigationStoppedAlert,
  createAutomaticConfigSavedAlert,
  createAutomaticConfigCancelledAlert,
  createAutomaticActivatedTemperatureAlert,
  createAutomaticActivatedSoilHumidityAlert,
  createAutomaticActivatedAirHumidityAlert,
  createAutomaticDeactivatedOptimalAlert,
  createAutomaticDeactivatedSoilOptimalAlert,
  createIrrigationStartedAlert,
  createIrrigationEndedAlert
} from './irrigationAlertService.js';

/**
 * Evalúa si debe activar o desactivar el riego automático basado en datos de sensores
 * Se ejecuta cada vez que llegan nuevos datos del TTN webhook
 */
// Mapa para evitar evaluaciones múltiples simultáneas por dispositivo
const evaluationLocks = new Map();

const evaluateAutomaticIrrigation = async (deviceId, sensorData) => {
  // Prevenir evaluaciones múltiples simultáneas para el mismo dispositivo
  const lockKey = `device_${deviceId}`;
  if (evaluationLocks.has(lockKey)) {
    console.log('⏸️ [AUTO] Evaluación ya en progreso para dispositivo:', deviceId);
    return;
  }
  
  evaluationLocks.set(lockKey, true);
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🤖 [AUTO] Iniciando evaluación automática para dispositivo:', deviceId);
    console.log('📊 [AUTO] Datos de sensores:', sensorData);

    // 1. Buscar configuración automática activa para este dispositivo
    const configQuery = `
      SELECT 
        ic.id as config_id,
        ic.user_id,
        ic.crop_id,
        c.name as crop_name,
        c.soil_humidity_min,
        c.soil_humidity_max,
        c.air_humidity_min,
        c.air_humidity_max,
        c.temperature_max,
        d.device_name
      FROM irrigation_configs ic
      INNER JOIN crops c ON c.id = ic.crop_id
      INNER JOIN devices d ON d.user_id = ic.user_id AND d.id = $1
      WHERE ic.mode_type = 'automatic' 
        AND d.is_active_communication = true
      LIMIT 1
    `;
    
    const configResult = await client.query(configQuery, [deviceId]);
    
    if (configResult.rows.length === 0) {
      console.log('ℹ️ [AUTO] No hay configuración automática activa para este dispositivo');
      await client.query('COMMIT');
      return;
    }
    
    const config = configResult.rows[0];
    console.log('✅ [AUTO] Configuración automática encontrada:', config);

    // 2. Verificar estado actual de la bomba
    const pumpQuery = `
      SELECT id, status, started_at 
      FROM pump_activations 
      WHERE irrigation_config_id = $1 
        AND status IN ('active', 'paused')
      ORDER BY started_at DESC 
      LIMIT 1
    `;
    const pumpResult = await client.query(pumpQuery, [config.config_id]);
    const activePump = pumpResult.rows[0];
    
    console.log('🚰 [AUTO] Estado actual de la bomba:', activePump?.status || 'inactiva');

    // 3. Evaluar condiciones para activar/desactivar
    const shouldActivate = evaluateActivationConditions(sensorData, config);
    const shouldDeactivate = evaluateDeactivationConditions(sensorData, config);
    
    console.log('🔍 [AUTO] Evaluación de condiciones:', { shouldActivate, shouldDeactivate });

    if (!activePump && shouldActivate) {
      // 🟢 ACTIVAR RIEGO
      console.log('🟢 [AUTO] Activando riego automático');
      
      // Verificar que no hay otra bomba activa para esta configuración (protección extra)
      const doubleCheckQuery = `
        SELECT id FROM pump_activations 
        WHERE irrigation_config_id = $1 AND status IN ('active', 'paused')
        LIMIT 1
      `;
      const doubleCheck = await client.query(doubleCheckQuery, [config.config_id]);
      
      if (doubleCheck.rows.length > 0) {
        console.log('⚠️ [AUTO] Ya hay una bomba activa para esta configuración - evitando duplicado');
        await client.query('COMMIT');
        return;
      }
      
      // Marcar la configuración como activa
      await client.query(
        `UPDATE irrigation_configs SET is_active = true WHERE id = $1`,
        [config.config_id]
      );
      console.log('✅ [AUTO] Configuración marcada como activa');
      
      // Crear pump_activation (sin duration_minutes para modo automático)
      const insertPumpQuery = `
        INSERT INTO pump_activations (irrigation_config_id, started_at, status, duration_minutes)
        VALUES ($1, NOW(), 'active', NULL)
        RETURNING id
      `;
      const pumpActivationResult = await client.query(insertPumpQuery, [config.config_id]);
      
      // Enviar comando ON para activar la bomba
      try {
        console.log(`🚀 [AUTO] ENVIANDO COMANDO ON para config ${config.config_id}, usuario ${config.user_id}, cultivo ${config.crop_name}`);
        await sendDownlinkForConfig(config.config_id, 'ON');
        console.log('✅ [AUTO] Comando ON enviado exitosamente desde backend');
      } catch (downlinkError) {
        console.error('❌ [AUTO] Error enviando comando ON:', downlinkError);
      }
      
      // Crear alertas específicas según la condición que se cumplió
      const { temperature, soil_humidity, air_humidity } = sensorData;
      const soilHumidityLow = soil_humidity <= config.soil_humidity_min;
      
      // Crear alerta general de riego iniciado
      await createIrrigationStartedAlert(
        config.user_id, 
        config.crop_name, 
        'automático',
        `Temp: ${temperature}°C, Hum.Suelo: ${soil_humidity}%, Hum.Aire: ${air_humidity}%`
      );
      
      if (soilHumidityLow) {
        await createAutomaticActivatedSoilHumidityAlert(
          config.user_id, config.crop_name, soil_humidity, config.soil_humidity_min
        );
      }
      
    } else if (activePump && activePump.status === 'active' && shouldDeactivate) {
      // 🔴 DESACTIVAR RIEGO
      console.log('🔴 [AUTO] Desactivando riego automático');
      
      // Completar pump_activation
      const updatePumpQuery = `
        UPDATE pump_activations 
        SET status = 'completed', ended_at = NOW()
        WHERE id = $1
      `;
      await client.query(updatePumpQuery, [activePump.id]);
      
      // Enviar comando OFF
      try {
        await sendDownlinkForConfig(config.config_id, 'OFF');
        console.log('✅ [AUTO] Comando OFF enviado exitosamente');
      } catch (downlinkError) {
        console.error('❌ [AUTO] Error enviando comando OFF:', downlinkError);
      }
      
      // Crear alertas de desactivación
      const { temperature, soil_humidity, air_humidity } = sensorData;
      
      // Alerta general de riego finalizado
      await createIrrigationEndedAlert(
        config.user_id,
        config.crop_name,
        'automático',
        Math.round((new Date() - new Date(activePump.started_at)) / 60000) // duración en minutos
      );
      
      // Alerta específica de desactivación por condiciones óptimas
      await createAutomaticDeactivatedOptimalAlert(
        config.user_id,
        config.crop_name,
        `Temp: ${temperature}°C, Hum.Suelo: ${soil_humidity}%, Hum.Aire: ${air_humidity}%`
      );
      
      // Actualizar última fecha de riego
      await client.query(
        'UPDATE irrigation_configs SET last_irrigation_at = NOW() WHERE id = $1',
        [config.config_id]
      );
      
      // Cancelar configuración automática para desbloquear otros modos
      try {
        // Eliminar automatic_settings (mantener irrigation_configs para historial)
        await client.query(`DELETE FROM automatic_settings WHERE config_id = $1`, [config.config_id]);
        
        // Desactivar irrigation_config
        await client.query(`UPDATE irrigation_configs SET is_active = false WHERE id = $1`, [config.config_id]);
        
        console.log('🗑️ [AUTO] Configuración automática cancelada - otros modos desbloqueados');
        
        // Crear alerta de configuración cancelada
        await createAutomaticConfigCancelledAlert(config.user_id, config.crop_name);
        
      } catch (cancelError) {
        console.error('❌ [AUTO] Error cancelando configuración automática:', cancelError);
      }
    }

    await client.query('COMMIT');
    console.log('✅ [AUTO] Evaluación automática completada');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ [AUTO] Error en evaluación automática:', error);
    throw error;
  } finally {
    client.release();
    // Liberar el lock para permitir futuras evaluaciones
    evaluationLocks.delete(lockKey);
  }
};

/**
 * Evalúa si debe activarse el riego basado SOLO en humedad del suelo
 */
const evaluateActivationConditions = (sensorData, config) => {
  const { soil_humidity } = sensorData;
  
  // ÚNICA CONDICIÓN para activar riego: humedad del suelo inferior al mínimo
  const soilHumidityLow = soil_humidity <= config.soil_humidity_min;
  
  console.log('🔍 [AUTO] Condición de activación:', {
    soilHumidityLow: `${soil_humidity}% <= ${config.soil_humidity_min}% = ${soilHumidityLow}`
  });
  
  // ✅ ACTIVAR SOLO si la humedad del suelo es baja
  console.log(`🔍 [AUTO] Resultado activación: ${soilHumidityLow}`);
  return soilHumidityLow;
};

/**
 * Evalúa si debe desactivarse el riego basado SOLO en humedad del suelo
 */
const evaluateDeactivationConditions = (sensorData, config) => {
  const { soil_humidity } = sensorData;
  
  // Condiciones para desactivar riego (SOLO humedad del suelo):
  // 1. Humedad del suelo en rango óptimo
  const soilHumidityInRange = soil_humidity >= config.soil_humidity_min && 
                             soil_humidity <= config.soil_humidity_max;
  
  // 2. Humedad del suelo demasiado alta
  const soilHumidityTooHigh = soil_humidity > config.soil_humidity_max;
  
  console.log('🔍 [AUTO] Condiciones de desactivación:', {
    soilHumidityInRange: `${soil_humidity}% (${config.soil_humidity_min}%-${config.soil_humidity_max}%) = ${soilHumidityInRange}`,
    soilHumidityTooHigh: `${soil_humidity}% > ${config.soil_humidity_max}% = ${soilHumidityTooHigh}`
  });
  
  // Desactivar cuando la humedad está en rango óptimo O cuando está demasiado alta
  const shouldDeactivate = soilHumidityInRange || soilHumidityTooHigh;
  console.log(`🎯 [AUTO] shouldDeactivate = ${shouldDeactivate}`);
  
  return shouldDeactivate;
};

/**
 * Obtiene el estado actual de configuraciones automáticas para un usuario
 */
const getAutomaticIrrigationStatus = async (userId) => {
  try {
    console.log('🔎 [AUTO] Iniciando getAutomaticIrrigationStatus para userId:', userId);

    const query = `
      SELECT
        ic.id as config_id,
        ic.mode_type,
        ic.is_active,
        c.name as crop_name,
        c.soil_humidity_min,
        c.soil_humidity_max,
        c.air_humidity_min,
        c.air_humidity_max,
        c.temperature_max,
        d.device_name,
        pa.id as pump_activation_id,
        pa.status as pump_status,
        pa.started_at
      FROM irrigation_configs ic
      INNER JOIN crops c ON c.id = ic.crop_id
      LEFT JOIN devices d ON d.user_id = ic.user_id AND d.is_active_communication = true
      LEFT JOIN pump_activations pa ON pa.irrigation_config_id = ic.id AND pa.status IN ('active', 'paused')
      WHERE ic.user_id = $1
        AND ic.mode_type = 'automatic'
      ORDER BY ic.created_at DESC
      LIMIT 1
    `;

    console.log('📝 [AUTO] Ejecutando query con userId:', userId);
    const result = await pool.query(query, [userId]);
    console.log('✅ [AUTO] Query ejecutada, resultados:', result.rows.length);
    console.log('📊 [AUTO] Datos obtenidos:', result.rows[0]);

    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ [AUTO] Error obteniendo estado automático:', error);
    console.error('❌ [AUTO] SQL Error details:', error.detail);
    console.error('❌ [AUTO] SQL Error code:', error.code);
    throw error;
  }
};

export {
  evaluateAutomaticIrrigation,
  getAutomaticIrrigationStatus,
  evaluateActivationConditions,
  evaluateDeactivationConditions
};
