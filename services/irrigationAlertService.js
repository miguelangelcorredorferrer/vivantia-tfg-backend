import { pool } from '../config/db.js';
import Alert from '../models/Alert.js';

/**
 * Servicio para manejar alertas relacionadas con riego
 */

// Cache para evitar alertas duplicadas en 5 segundos
const alertCache = new Map();

// Función auxiliar para crear alertas de riego
const createIrrigationAlert = async (user_id, alert_subtype, title, message, severity = 'info') => {
  try {
    const query = `
      INSERT INTO alerts (user_id, alert_type, alert_subtype, severity, title, message, is_resolved)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [user_id, 'irrigation', alert_subtype, severity, title, message, false];
    const result = await pool.query(query, values);
    
    return new Alert(result.rows[0]);
  } catch (error) {
    console.error(`Error creando alerta de riego (${alert_subtype}):`, error.message);
    throw error;
  }
};

// Crear alerta de riego manual iniciado
export const createManualStartedAlert = async (user_id, cropName, durationMinutes) => {
  const title = 'Riego manual iniciado';
  const message = `Se ha iniciado el riego manual para ${cropName} con una duración de ${durationMinutes} minutos.`;
  
  return await createIrrigationAlert(user_id, 'manual_started', title, message, 'info');
};

// Crear alerta de parada de emergencia
export const createEmergencyStopAlert = async (user_id, cropName) => {
  const title = '🚨 Parada de emergencia';
  const message = `El riego de ${cropName} ha sido detenido de forma manual. Revisa el estado del sistema.`;
  
  return await createIrrigationAlert(user_id, 'emergency_stop', title, message, 'warning');
};


// ===== ALERTAS GENERALES DE RIEGO =====

// Crear alerta de riego iniciado (genérica para manual y programado)
export const createIrrigationStartedAlert = async (user_id, mode, cropName, durationMinutes) => {
  const modeText = mode === 'manual' ? 'manual' : 'programado';
  const title = `Riego ${modeText} iniciado`;
  const message = `Se ha iniciado el riego ${modeText} para ${cropName} con una duración de ${durationMinutes} minutos.`;
  
  return await createIrrigationAlert(user_id, 'irrigation_started', title, message, 'info');
};

// Crear alerta de riego pausado
export const createIrrigationPausedAlert = async (user_id, mode, cropName) => {
  const modeText = mode === 'manual' ? 'manual' : 'programado';
  const title = `Riego ${modeText} pausado`;
  const message = `El riego ${modeText} de ${cropName} ha sido pausado. Puedes reanudarlo cuando desees.`;
  
  return await createIrrigationAlert(user_id, 'irrigation_paused', title, message, 'warning');
};

// Crear alerta de riego reanudado
export const createIrrigationResumedAlert = async (user_id, mode, cropName) => {
  const modeText = mode === 'manual' ? 'manual' : 'programado';
  const title = `Riego ${modeText} reanudado`;
  const message = `El riego ${modeText} de ${cropName} ha sido reanudado y continuará hasta completarse.`;
  
  return await createIrrigationAlert(user_id, 'irrigation_resumed', title, message, 'info');
};

// Crear alerta de riego terminado/completado
export const createIrrigationEndedAlert = async (user_id, mode, cropName, wasCompleted = true) => {
  // Cache para evitar alertas duplicadas en 5 segundos
  const cacheKey = `${user_id}_irrigation_ended_${mode}_${cropName}`;
  const now = Date.now();
  const lastCreated = alertCache.get(cacheKey);
  
  if (lastCreated && (now - lastCreated) < 5000) {
    console.log('🚨 [ALERT-CACHE] Ignorando alerta irrigation_ended duplicada enviada hace', Math.round((now - lastCreated) / 1000), 'segundos');
    return null; // Retornar null para indicar que se ignoró
  }
  
  alertCache.set(cacheKey, now);
  console.log('🚨 [ALERT-CACHE] Alerta irrigation_ended creada, cache actualizado');
  
  const modeText = mode === 'manual' ? 'manual' : 'programado';
  const actionText = wasCompleted ? 'completado exitosamente' : 'terminado';
  const title = `Riego ${modeText} ${actionText}`;
  const message = `El riego ${modeText} de ${cropName} ha ${actionText}. La bomba se ha detenido.`;
  
  return await createIrrigationAlert(user_id, 'irrigation_ended', title, message, 'success');
};

// Crear alerta de riego cancelado
export const createIrrigationCancelledAlert = async (user_id, mode, cropName) => {
  const modeText = mode === 'manual' ? 'manual' : 'programado';
  const title = `Riego ${modeText} cancelado`;
  const message = `El riego ${modeText} de ${cropName} ha sido cancelado antes de completarse.`;
  
  return await createIrrigationAlert(user_id, 'irrigation_cancelled', title, message, 'warning');
};

// Crear alerta de riego completado
export const createIrrigationCompletedAlert = async (user_id, cropName, modeType) => {
  const title = 'Riego completado exitosamente';
  const message = `El riego ${modeType} de ${cropName} se ha completado exitosamente.`;
  
  return await createIrrigationAlert(user_id, 'irrigation_completed', title, message, 'success');
};

// Crear alerta de riego programado iniciado
export const createProgrammedStartedAlert = async (user_id, cropName, durationMinutes) => {
  const title = 'Riego programado iniciado';
  const message = `Se ha iniciado automáticamente el riego programado para ${cropName} con una duración de ${durationMinutes} minutos.`;
  
  return await createIrrigationAlert(user_id, 'programmed_started', title, message, 'info');
};

// Crear alerta de riego automático iniciado
export const createAutomaticStartedAlert = async (user_id, cropName, durationMinutes, triggerReason) => {
  const title = 'Riego automático activado';
  const message = `El sistema ha iniciado automáticamente el riego de ${cropName} por ${durationMinutes} minutos. Motivo: ${triggerReason}`;
  
  return await createIrrigationAlert(user_id, 'automatic_started', title, message, 'info');
};

// Crear alerta de configuración de riego actualizada
export const createIrrigationConfigUpdatedAlert = async (user_id, modeType, cropName) => {
  const title = 'Configuración de riego actualizada';
  const message = `La configuración del riego ${modeType} para ${cropName} ha sido actualizada exitosamente.`;
  
  return await createIrrigationAlert(user_id, 'config_updated', title, message, 'info');
};

// ========== ALERTAS PARA MODO PROGRAMADO ==========

// Crear alerta de configuración programada guardada
export const createProgrammedSavedAlert = async (user_id, cropName, startDateTime, frequencyType) => {
  const title = 'Configuración programada guardada';
  const scheduledDate = new Date(startDateTime).toLocaleString('es-ES');
  let frequencyText = '';
  
  switch (frequencyType) {
    case 'once':
      frequencyText = 'una vez';
      break;
    case 'daily':
      frequencyText = 'diariamente';
      break;
    case 'custom':
      frequencyText = 'días personalizados';
      break;
  }
  
  const message = `Se ha programado el riego de ${cropName} para ${scheduledDate} (${frequencyText}).`;
  
  return await createIrrigationAlert(user_id, 'programmed_saved', title, message, 'success');
};

// Crear alerta de recordatorio programado (5 min antes)
export const createProgrammedReminderAlert = async (user_id, cropName, minutesUntilStart) => {
  const title = '⏰ Recordatorio de riego programado';
  const message = `El riego programado de ${cropName} comenzará en ${minutesUntilStart} minutos.`;
  
  return await createIrrigationAlert(user_id, 'programmed_reminder', title, message, 'info');
};

// Crear alerta de riego programado iniciado automáticamente
export const createProgrammedScheduleAlert = async (user_id, cropName, durationMinutes) => {
  const title = 'Riego programado iniciado';
  const message = `Se ha iniciado automáticamente el riego programado de ${cropName} con duración de ${durationMinutes} minutos.`;
  
  return await createIrrigationAlert(user_id, 'programmed_schedule', title, message, 'info');
};

// Crear alerta de configuración programada cancelada
export const createProgrammedCancelledAlert = async (user_id, cropName, wasActive = false) => {
  const title = wasActive ? 'Riego programado cancelado' : 'Configuración programada cancelada';
  const message = wasActive 
    ? `El riego programado activo de ${cropName} ha sido cancelado.`
    : `La configuración programada de ${cropName} ha sido cancelada.`;
  
  return await createIrrigationAlert(user_id, 'programmed_cancelled', title, message, 'warning');
};

// ===== ALERTAS ESPECÍFICAS PARA MODO AUTOMÁTICO =====

// Crear alerta de umbral de cultivo superado
export const createCropThresholdAlert = async (user_id, cropName, thresholdType, currentValue, thresholdValue) => {
  const title = `Umbral de ${thresholdType} superado`;
  let message = '';
  
  switch (thresholdType) {
    case 'temperatura':
      message = `La temperatura actual (${currentValue}°C) ha superado el umbral máximo de ${cropName} (${thresholdValue}°C).`;
      break;
    case 'humedad_suelo_baja':
      message = `La humedad del suelo (${currentValue}%) está por debajo del mínimo requerido para ${cropName} (${thresholdValue}%).`;
      break;
    case 'humedad_aire_baja':
      message = `La humedad del aire (${currentValue}%) está por debajo del mínimo para ${cropName} (${thresholdValue}%).`;
      break;
    default:
      message = `Se ha detectado una condición de umbral para ${cropName}.`;
  }
  
  return await createIrrigationAlert(user_id, 'temperature_high', title, message, 'warning');
};

// Crear alerta de riego automático iniciado
export const createAutomaticIrrigationStartedAlert = async (user_id, cropName, sensorDetails) => {
  const title = 'Riego automático iniciado';
  const message = `El sistema ha iniciado el riego automático para ${cropName} basado en las condiciones detectadas: ${sensorDetails}`;
  
  return await createIrrigationAlert(user_id, 'automatic_started', title, message, 'success');
};

// Crear alerta de riego automático detenido
export const createAutomaticIrrigationStoppedAlert = async (user_id, cropName, reason) => {
  const title = 'Riego automático finalizado';
  const message = `El riego automático de ${cropName} ha finalizado. ${reason}`;
  
  return await createIrrigationAlert(user_id, 'automatic_stopped', title, message, 'info');
};

// Crear alerta de configuración automática guardada
export const createAutomaticConfigSavedAlert = async (user_id, cropName) => {
  const title = 'Configuración automática guardada';
  const message = `El modo automático ha sido configurado para ${cropName}. El sistema monitoreará los sensores automáticamente.`;
  
  return await createIrrigationAlert(user_id, 'automatic_saved', title, message, 'success');
};

// Crear alerta de configuración automática cancelada
export const createAutomaticConfigCancelledAlert = async (user_id, cropName) => {
  const title = 'Configuración automática cancelada';
  const message = `La configuración automática de ${cropName} ha sido cancelada. El monitoreo automático se ha desactivado.`;
  
  return await createIrrigationAlert(user_id, 'automatic_cancelled', title, message, 'warning');
};

// ===== NUEVAS ALERTAS DE ACTIVACIÓN POR UMBRALES =====

// Crear alerta de activación por temperatura alta
export const createAutomaticActivatedTemperatureAlert = async (user_id, cropName, temperature, maxTemp) => {
  const title = 'Riego activado por temperatura alta';
  const message = `El riego automático se ha activado para ${cropName} porque la temperatura (${temperature}°C) superó el límite máximo (${maxTemp}°C).`;
  
  return await createIrrigationAlert(user_id, 'automatic_activated_temperature', title, message, 'warning');
};

// Crear alerta de activación por humedad del suelo baja
export const createAutomaticActivatedSoilHumidityAlert = async (user_id, cropName, soilHumidity, minHumidity) => {
  const title = 'Riego activado por baja humedad del suelo';
  const message = `El riego automático se ha activado para ${cropName} porque la humedad del suelo (${soilHumidity}%) está por debajo del mínimo requerido (${minHumidity}%).`;
  
  return await createIrrigationAlert(user_id, 'automatic_activated_soil_humidity', title, message, 'warning');
};

// Crear alerta de activación por humedad del aire baja
export const createAutomaticActivatedAirHumidityAlert = async (user_id, cropName, airHumidity, minAirHumidity) => {
  const title = 'Riego activado por baja humedad ambiental';
  const message = `El riego automático se ha activado para ${cropName} porque la humedad ambiental (${airHumidity}%) está por debajo del mínimo requerido (${minAirHumidity}%).`;
  
  return await createIrrigationAlert(user_id, 'automatic_activated_air_humidity', title, message, 'warning');
};

// ===== NUEVAS ALERTAS DE DESACTIVACIÓN =====

// Crear alerta de desactivación por condiciones óptimas
export const createAutomaticDeactivatedOptimalAlert = async (user_id, cropName, sensorDetails) => {
  const title = 'Riego desactivado - condiciones óptimas';
  const message = `El riego automático para ${cropName} se ha desactivado porque todas las condiciones están en rango óptimo. Valores actuales: ${sensorDetails}`;
  
  return await createIrrigationAlert(user_id, 'automatic_deactivated_optimal_conditions', title, message, 'success');
};

// Crear alerta de desactivación por humedad óptima del suelo
export const createAutomaticDeactivatedSoilOptimalAlert = async (user_id, cropName, soilHumidity, maxHumidity) => {
  const title = 'Riego desactivado - humedad del suelo óptima';
  const message = `El riego automático para ${cropName} se ha desactivado porque la humedad del suelo (${soilHumidity}%) ha alcanzado el nivel óptimo (máximo: ${maxHumidity}%).`;
  
  return await createIrrigationAlert(user_id, 'automatic_deactivated_soil_optimal', title, message, 'success');
};

