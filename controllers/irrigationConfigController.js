import { pool } from '../config/db.js';
import { IrrigationConfig, AutomaticConfig, ProgrammedConfig } from '../models/IrrigationConfig.js';
import { handleNotFoundError, handleBadRequestError, handleInternalServerError, handleSuccessResponse } from '../utils/index.js';
import {
  createProgrammedSavedAlert,
  createProgrammedReminderAlert,
  createProgrammedScheduleAlert,
  createAutomaticConfigSavedAlert,
  createAutomaticConfigCancelledAlert,
  createIrrigationStartedAlert,
  createIrrigationEndedAlert,
  createIrrigationCancelledAlert,
  createIrrigationPausedAlert,
  createIrrigationResumedAlert
} from '../services/irrigationAlertService.js';
import { evaluateAutomaticIrrigation, getAutomaticIrrigationStatus } from '../services/automaticIrrigationService.js';

// Crear nueva configuración de riego
const createIrrigationConfig = async (req, res) => {
  try {
    const { user_id, crop_id, mode_type, duration_minutes, is_active = false } = req.body;

    if (!user_id || !crop_id || !mode_type || !duration_minutes) {
      return handleBadRequestError('User ID, crop ID, tipo de modo y duración son obligatorios', res);
    }

    const query = `
      INSERT INTO irrigation_configs (user_id, crop_id, mode_type, duration_minutes, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [user_id, crop_id, mode_type, duration_minutes, is_active];
    const result = await pool.query(query, values);
    const config = new IrrigationConfig(result.rows[0]);

    res.status(201).json({
      success: true,
      message: 'Configuración de riego creada exitosamente',
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear configuración de riego',
      error: error.message
    });
  }
};

// Buscar por ID
const findIrrigationConfigById = async (id) => {
  try {
    const query = 'SELECT * FROM irrigation_configs WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return new IrrigationConfig(result.rows[0]);
  } catch (error) {
    throw new Error(`Error al buscar configuración: ${error.message}`);
  }
};

// Obtener configuración por ID
const getIrrigationConfigById = async (req, res) => {
  try {
    const { id } = req.params;
    const config = await findIrrigationConfigById(id);

    if (!config) {
      return handleNotFoundError('Configuración no encontrada', res);
    }

    return handleSuccessResponse(res, config, 'Configuración obtenida exitosamente');
  } catch (error) {
    return handleInternalServerError('Error al obtener configuración', res, error);
  }
};

// Buscar configuraciones activas por usuario
const getActiveIrrigationConfigsByUser = async (req, res) => {
  try {
    const { user_id } = req.params;

    const query = 'SELECT * FROM irrigation_configs WHERE user_id = $1 AND is_active = true';
    const result = await pool.query(query, [user_id]);
    
    const configs = result.rows.map(row => new IrrigationConfig(row));

    res.status(200).json({
      success: true,
      count: configs.length,
      data: configs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener configuraciones activas',
      error: error.message
    });
  }
};

// Activar configuración
const activateIrrigationConfig = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const existingConfig = await findIrrigationConfigById(id);
    if (!existingConfig) {
      return res.status(404).json({
        success: false,
        message: 'Configuración no encontrada'
      });
    }

    await client.query('BEGIN');

    // Desactivar todas las configuraciones del usuario
    await client.query(
      'UPDATE irrigation_configs SET is_active = false WHERE user_id = $1',
      [existingConfig.user_id]
    );

    // Activar esta configuración
    const result = await client.query(
      'UPDATE irrigation_configs SET is_active = true WHERE id = $1 RETURNING *',
      [id]
    );

    await client.query('COMMIT');
    
    const activatedConfig = new IrrigationConfig(result.rows[0]);

    res.status(200).json({
      success: true,
      message: 'Configuración activada exitosamente',
      data: activatedConfig
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({
      success: false,
      message: 'Error al activar configuración',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// Desactivar configuración de riego
const deactivateIrrigationConfig = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const existingConfig = await findIrrigationConfigById(id);
    if (!existingConfig) {
      return res.status(404).json({
        success: false,
        message: 'Configuración no encontrada'
      });
    }

    await client.query('BEGIN');

    // Desactivar esta configuración específica
    const result = await client.query(
      'UPDATE irrigation_configs SET is_active = false WHERE id = $1 RETURNING *',
      [id]
    );

    await client.query('COMMIT');
    
    const deactivatedConfig = new IrrigationConfig(result.rows[0]);

    res.status(200).json({
      success: true,
      message: 'Configuración desactivada exitosamente',
      data: deactivatedConfig
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({
      success: false,
      message: 'Error al desactivar configuración',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// Las configuraciones manuales ahora están integradas en irrigation_configs
// No se necesita función separada para crear configuración manual

// Crear configuración automática
const createAutomaticConfig = async (req, res) => {
  try {
    const {
      config_id, humidity_min_threshold, humidity_max_threshold,
      temperature_max_threshold, use_crop_thresholds = true
    } = req.body;

    if (!config_id || !humidity_min_threshold || !humidity_max_threshold || !temperature_max_threshold) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos obligatorios deben ser proporcionados'
      });
    }

    const query = `
      INSERT INTO automatic_settings (
        config_id, humidity_min_threshold, humidity_max_threshold,
        temperature_max_threshold, use_crop_thresholds
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [
      config_id, humidity_min_threshold, humidity_max_threshold,
      temperature_max_threshold, use_crop_thresholds
    ];
    
    const result = await pool.query(query, values);
    const config = new AutomaticConfig(result.rows[0]);

    // Crear alerta de configuración automática guardada
    try {
      // Obtener información del usuario y cultivo
      const userCropQuery = `
        SELECT ic.user_id, c.name as crop_name
        FROM irrigation_configs ic
        LEFT JOIN crops c ON ic.crop_id = c.id
        WHERE ic.id = $1
      `;
      const userCropResult = await pool.query(userCropQuery, [config_id]);
      const userData = userCropResult.rows[0];
      
      if (userData) {
        await createAutomaticSavedAlert(userData.user_id, userData.crop_name || 'Cultivo');
      }
    } catch (alertError) {
      console.warn('Error al crear alerta de configuración automática:', alertError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Configuración automática creada exitosamente',
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear configuración automática',
      error: error.message
    });
  }
};

// Eliminar configuración de riego
const deleteIrrigationConfig = async (req, res) => {
  try {
    const { id } = req.params;

    const existingConfig = await findIrrigationConfigById(id);
    if (!existingConfig) {
      return res.status(404).json({
        success: false,
        message: 'Configuración no encontrada'
      });
    }

    const query = 'DELETE FROM irrigation_configs WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Configuración no encontrada'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Configuración eliminada exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar configuración',
      error: error.message
    });
  }
};

// Buscar configuraciones por usuario y tipo
const getIrrigationConfigsByUserAndType = async (req, res) => {
  try {
    const { user_id, mode_type } = req.params;

    const query = 'SELECT * FROM irrigation_configs WHERE user_id = $1 AND mode_type = $2';
    const result = await pool.query(query, [user_id, mode_type]);
    
    const configs = result.rows.map(row => new IrrigationConfig(row));

    res.status(200).json({
      success: true,
      count: configs.length,
      data: configs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener configuraciones por tipo',
      error: error.message
    });
  }
};

// Buscar todas las configuraciones por usuario
const getIrrigationConfigsByUser = async (req, res) => {
  try {
    const { user_id } = req.params;

    const query = 'SELECT * FROM irrigation_configs WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [user_id]);
    
    const configs = result.rows.map(row => new IrrigationConfig(row));

    res.status(200).json({
      success: true,
      count: configs.length,
      data: configs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener configuraciones del usuario',
      error: error.message
    });
  }
};

// Actualizar última fecha de riego
const updateLastIrrigation = async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'UPDATE irrigation_configs SET last_irrigation_at = NOW() WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Configuración no encontrada'
      });
    }
    
    const updatedConfig = new IrrigationConfig(result.rows[0]);

    res.status(200).json({
      success: true,
      message: 'Última fecha de riego actualizada',
      data: updatedConfig
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar último riego',
      error: error.message
    });
  }
};

// Obtener última fecha de riego del usuario
const getLastIrrigationDate = async (req, res) => {
  try {
    const { user_id } = req.params;

    // Obtener la configuración con la fecha de último riego más reciente
    const query = `
      SELECT last_irrigation_at, mode_type, crop_id
      FROM irrigation_configs 
      WHERE user_id = $1 
      AND last_irrigation_at IS NOT NULL
      ORDER BY last_irrigation_at DESC 
      LIMIT 1
    `;
    
    const result = await pool.query(query, [user_id]);
    
    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No hay registros de riego'
      });
    }
    
    const lastIrrigation = result.rows[0];

    res.status(200).json({
      success: true,
      data: {
        last_irrigation_at: lastIrrigation.last_irrigation_at,
        mode_type: lastIrrigation.mode_type,
        crop_id: lastIrrigation.crop_id
      },
      message: 'Última fecha de riego obtenida'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener última fecha de riego',
      error: error.message
    });
  }
};

// Obtener configuración específica según el tipo
const getSpecificConfig = async (req, res) => {
  try {
    const { id } = req.params;

    // Primero obtener la configuración principal
    const config = await findIrrigationConfigById(id);
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuración no encontrada'
      });
    }

    let query, tableName;
    
    switch (config.mode_type) {
      case 'manual':
        // Para manual, devolver la configuración principal (ya incluye duration_minutes)
        return res.status(200).json({
          success: true,
          data: config
        });
      case 'automatic':
        tableName = 'automatic_settings';
        break;
      case 'programmed':
        tableName = 'programmed_settings';
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Tipo de configuración no válido'
        });
    }

    query = `SELECT * FROM ${tableName} WHERE config_id = $1`;
    const result = await pool.query(query, [id]);

    res.status(200).json({
      success: true,
      data: result.rows[0] || null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener configuración específica',
      error: error.message
    });
  }
};

// Crear configuración programada
const createProgrammedConfig = async (req, res) => {
  const client = await pool.connect();
  try {
    console.log('📝 Datos recibidos en createProgrammedConfig:', req.body);
    
    const {
      user_id,
      crop_id, 
      start_datetime, 
      end_date, 
      duration_minutes,
      frequency_type, 
      custom_days,
      notify_before_minutes = 5,
      notify_at_start = true, 
      notify_at_end = true
    } = req.body;

    console.log('🔍 Validando datos:', {
      user_id,
      crop_id,
      start_datetime,
      duration_minutes,
      frequency_type,
      custom_days
    });

    if (!user_id || !crop_id || !start_datetime || !duration_minutes || !frequency_type) {
      return res.status(400).json({
        success: false,
        message: 'Los campos user_id, crop_id, start_datetime, duration_minutes y frequency_type son obligatorios'
      });
    }

    // Validar frequency_type
    if (!['once', 'daily', 'custom'].includes(frequency_type)) {
      return res.status(400).json({
        success: false,
        message: 'frequency_type debe ser: once, daily o custom'
      });
    }

    // Validar custom_days si frequency_type es 'custom'
    if (frequency_type === 'custom' && (!custom_days || !Array.isArray(custom_days) || custom_days.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'custom_days es obligatorio cuando frequency_type es custom'
      });
    }

    console.log('🚀 Iniciando transacción...');
    await client.query('BEGIN');

    // 1. Buscar o crear configuración de riego programado
    console.log('1️⃣ Buscando configuración existente...');
    let irrigationConfig;
    const existingConfigQuery = `
      SELECT * FROM irrigation_configs 
      WHERE user_id = $1 AND crop_id = $2 AND mode_type = 'programmed'
    `;
    const existingConfigResult = await client.query(existingConfigQuery, [user_id, crop_id]);
    console.log('📊 Configuraciones existentes encontradas:', existingConfigResult.rows.length);

    if (existingConfigResult.rows.length > 0) {
      // Actualizar configuración existente
      irrigationConfig = existingConfigResult.rows[0];
      console.log('✅ Configuración programada existente encontrada:', irrigationConfig.id);
      
      // Actualizar duration_minutes de la configuración existente
      const updateExistingQuery = `
        UPDATE irrigation_configs 
        SET duration_minutes = $1 
        WHERE id = $2
        RETURNING *
      `;
      const updateResult = await client.query(updateExistingQuery, [duration_minutes, irrigationConfig.id]);
      irrigationConfig = updateResult.rows[0];
      console.log('✅ Duración actualizada en configuración existente');
    } else {
      // Crear nueva configuración
      const createConfigQuery = `
        INSERT INTO irrigation_configs (user_id, crop_id, mode_type, is_active, duration_minutes)
        VALUES ($1, $2, 'programmed', false, $3)
        RETURNING *
      `;
      const createConfigResult = await client.query(createConfigQuery, [user_id, crop_id, duration_minutes]);
      irrigationConfig = createConfigResult.rows[0];
      console.log('✅ Nueva configuración programada creada:', irrigationConfig.id);
    }

    // 2. Eliminar configuración programada anterior si existe
    const deletePrevProgrammedQuery = `
      DELETE FROM programmed_settings 
      WHERE config_id = $1
    `;
    await client.query(deletePrevProgrammedQuery, [irrigationConfig.id]);

    // 3. Crear nueva configuración programada
    console.log('3️⃣ Creando nueva configuración programada...');
    const createProgrammedQuery = `
      INSERT INTO programmed_settings (
        config_id, start_datetime, frequency_type, custom_days, 
        notify_before_minutes, notify_at_start, notify_at_end, next_execution
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $2)
      RETURNING *
    `;
    
    const programmedValues = [
      irrigationConfig.id, 
      start_datetime, 
      frequency_type, 
      custom_days || [],
      notify_before_minutes,
      notify_at_start, 
      notify_at_end
    ];
    
    console.log('📋 Valores para programmed_settings:', programmedValues);
    const programmedResult = await client.query(createProgrammedQuery, programmedValues);
    console.log('✅ Programmed settings creada:', programmedResult.rows[0]);
    
    // Crear el modelo ProgrammedConfig
    let programmedConfig;
    try {
      programmedConfig = new ProgrammedConfig(programmedResult.rows[0]);
      console.log('📦 Modelo ProgrammedConfig creado correctamente');
    } catch (modelError) {
      console.error('❌ Error creando modelo ProgrammedConfig:', modelError);
      throw new Error(`Error en modelo ProgrammedConfig: ${modelError.message}`);
    }

    // 4. Crear registro en pump_activations con status 'programmed'
    const createPumpActivationQuery = `
      INSERT INTO pump_activations (
        irrigation_config_id, started_at, duration_minutes, status
      )
      VALUES ($1, $2, $3, 'programmed')
      RETURNING *
    `;
    
    const pumpActivationResult = await client.query(createPumpActivationQuery, [
      irrigationConfig.id,
      start_datetime,
      duration_minutes
    ]);

    await client.query('COMMIT');

    // Crear alerta de configuración programada guardada
    try {
      // Obtener nombre del cultivo
      const cropQuery = 'SELECT name FROM crops WHERE id = $1';
      const cropResult = await client.query(cropQuery, [crop_id]);
      const cropName = cropResult.rows[0]?.name || 'Cultivo';
      
      await createProgrammedSavedAlert(user_id, cropName, start_datetime, frequency_type);
    } catch (alertError) {
      console.warn('Error al crear alerta de configuración programada:', alertError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Configuración programada creada exitosamente',
      data: {
        irrigationConfig: new IrrigationConfig(irrigationConfig),
        programmedConfig,
        pumpActivation: pumpActivationResult.rows[0]
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error completo creando configuración programada:', error);
    console.error('❌ Stack trace:', error.stack);
    console.error('❌ Tipo de error:', error.constructor.name);
    res.status(500).json({
      success: false,
      message: 'Error al crear configuración programada',
      error: error.message,
      debug: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        type: error.constructor.name
      } : undefined
    });
  } finally {
    client.release();
  }
};

// Cancelar configuración programada COMPLETA (eliminar configuración)
const cancelProgrammedConfig = async (req, res) => {
  const client = await pool.connect();
  try {
    const { irrigation_config_id } = req.params;

    await client.query('BEGIN');

    // 1. Actualizar pump_activations a 'cancelled'
    const updatePumpActivationQuery = `
      UPDATE pump_activations 
      SET status = 'cancelled', ended_at = NOW() 
      WHERE irrigation_config_id = $1 AND status IN ('programmed', 'active', 'paused')
      RETURNING *
    `;
    await client.query(updatePumpActivationQuery, [irrigation_config_id]);

    // 2. Eliminar configuración programada
    const deleteProgrammedQuery = `
      DELETE FROM programmed_settings 
      WHERE config_id = $1
      RETURNING *
    `;
    const deleteResult = await client.query(deleteProgrammedQuery, [irrigation_config_id]);

    // 3. Desactivar configuración de riego
    const deactivateConfigQuery = `
      UPDATE irrigation_configs 
      SET is_active = false 
      WHERE id = $1
      RETURNING *
    `;
    const configResult = await client.query(deactivateConfigQuery, [irrigation_config_id]);

    await client.query('COMMIT');

    // NOTA: La alerta de configuración cancelada se crea automáticamente en pumpActivationController
    // cuando se actualiza el estado de pump_activations a 'cancelled'

    res.status(200).json({
      success: true,
      message: 'Configuración programada cancelada exitosamente',
      data: {
        irrigationConfig: configResult.rows[0],
        deletedProgrammedConfig: deleteResult.rows[0]
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error cancelando configuración programada:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cancelar configuración programada',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// Eliminar solo programmed_settings (deshacer configuración, mantener irrigation_configs)
const deleteProgrammedSettings = async (req, res) => {
  const client = await pool.connect();
  try {
    const { irrigation_config_id } = req.params;

    await client.query('BEGIN');

    // 1. Eliminar pump_activations programadas (sin cambiar a cancelled)
    const deletePumpActivationsQuery = `
      DELETE FROM pump_activations 
      WHERE irrigation_config_id = $1 AND status = 'programmed'
      RETURNING *
    `;
    await client.query(deletePumpActivationsQuery, [irrigation_config_id]);

    // 2. Eliminar configuración programada específica
    const deleteProgrammedSettingsQuery = `
      DELETE FROM programmed_settings 
      WHERE config_id = $1
      RETURNING *
    `;
    const deleteResult = await client.query(deleteProgrammedSettingsQuery, [irrigation_config_id]);

    if (deleteResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'No se encontró configuración programada para eliminar'
      });
    }

    await client.query('COMMIT');

    console.log('✅ [PROGRAMMED] Configuración programada eliminada (irrigation_configs conservado):', {
      configId: irrigation_config_id,
      deletedSettings: deleteResult.rows[0]
    });

    res.status(200).json({
      success: true,
      message: 'Configuración programada eliminada exitosamente (sin comando TTN)',
      data: deleteResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error eliminando configuración programada:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar configuración programada',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// Cancelar SOLO el riego programado activo (mantener configuración para futuros riegos)
const cancelProgrammedIrrigation = async (req, res) => {
  const client = await pool.connect();
  try {
    const { irrigation_config_id } = req.params;

    await client.query('BEGIN');

    // 1. Actualizar pump_activations a 'cancelled' solo si está activo o pausado
    const updatePumpActivationQuery = `
      UPDATE pump_activations 
      SET status = 'cancelled', ended_at = NOW() 
      WHERE irrigation_config_id = $1 AND status IN ('active', 'paused')
      RETURNING *
    `;
    const pumpResult = await client.query(updatePumpActivationQuery, [irrigation_config_id]);

    // 2. Actualizar last_irrigation_at en irrigation_configs si había riego activo
    if (pumpResult.rows.length > 0) {
      const updateLastIrrigationQuery = `
        UPDATE irrigation_configs 
        SET last_irrigation_at = NOW() 
        WHERE id = $1
        RETURNING *
      `;
      await client.query(updateLastIrrigationQuery, [irrigation_config_id]);

      // Enviar OFF al cancelar un riego activo/pausado
      try {
        const { sendDownlinkForConfig } = await import('../services/ttnService.js');
        const result = await sendDownlinkForConfig(irrigation_config_id, 'OFF');
        console.log('[DOWNLINK][OFF][cancelProgrammed] OK:', result);
      } catch (downlinkError) {
        console.error('[DOWNLINK][OFF][cancelProgrammed] Error:', downlinkError?.message || downlinkError);
      }
    }

    // 3. Desactivar configuración temporalmente (is_active = false)
    const deactivateConfigQuery = `
      UPDATE irrigation_configs 
      SET is_active = false 
      WHERE id = $1
      RETURNING *
    `;
    const configResult = await client.query(deactivateConfigQuery, [irrigation_config_id]);

    // NOTA: NO eliminamos programmed_settings para mantener configuración futura

    // NOTA: La alerta de cancelación se crea automáticamente en pumpActivationController
    // cuando se actualiza el estado de pump_activations a 'cancelled'

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: 'Riego programado cancelado exitosamente (configuración mantenida)',
      data: {
        irrigationConfig: configResult.rows[0],
        cancelledPumpActivations: pumpResult.rows
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error cancelando riego programado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cancelar riego programado',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// Actualizar próxima ejecución de configuración programada
const updateNextExecution = async (req, res) => {
  try {
    const { id } = req.params;
    const { nextExecution } = req.body;

    if (!nextExecution) {
      return res.status(400).json({
        success: false,
        message: 'Próxima ejecución es obligatoria'
      });
    }

    const query = 'UPDATE programmed_settings SET next_execution = $1 WHERE config_id = $2 RETURNING *';
    const result = await pool.query(query, [nextExecution, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Configuración programada no encontrada'
      });
    }
    
    const updatedConfig = new ProgrammedConfig(result.rows[0]);

    res.status(200).json({
      success: true,
      message: 'Próxima ejecución actualizada',
      data: updatedConfig
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar próxima ejecución',
      error: error.message
    });
  }
};

// Actualizar ejecuciones (última y próxima) de configuración programada
const updateProgrammedExecution = async (req, res) => {
  try {
    const { id } = req.params;
    const { last_execution, next_execution } = req.body;

    console.log('📝 Actualizando ejecuciones para config:', id, {
      last_execution,
      next_execution
    });

    // Construir la consulta dinámicamente
    let setParts = [];
    let values = [];
    let paramCount = 1;

    if (last_execution !== undefined) {
      setParts.push(`last_execution = $${paramCount}`);
      values.push(last_execution);
      paramCount++;
    }

    if (next_execution !== undefined) {
      setParts.push(`next_execution = $${paramCount}`);
      values.push(next_execution);
      paramCount++;
    }

    if (setParts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se debe proporcionar al menos last_execution o next_execution'
      });
    }

    const query = `UPDATE programmed_settings SET ${setParts.join(', ')} WHERE config_id = $${paramCount} RETURNING *`;
    values.push(id);

    console.log('🔍 Ejecutando query:', query, 'con valores:', values);

    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Configuración programada no encontrada'
      });
    }
    
    const updatedConfig = new ProgrammedConfig(result.rows[0]);
    console.log('✅ Configuración actualizada:', updatedConfig);

    res.status(200).json({
      success: true,
      message: 'Ejecuciones actualizadas exitosamente',
      data: updatedConfig
    });
  } catch (error) {
    console.error('❌ Error actualizando ejecuciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar ejecuciones',
      error: error.message
    });
  }
};

// Actualizar configuración manual (ahora en irrigation_configs)
const updateManualConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const { duration_minutes } = req.body;

    if (!duration_minutes) {
      return res.status(400).json({
        success: false,
        message: 'Duración es obligatoria'
      });
    }

    const query = `
      UPDATE irrigation_configs 
      SET duration_minutes = $1
      WHERE id = $2 AND mode_type = 'manual'
      RETURNING *
    `;
    
    const result = await pool.query(query, [duration_minutes, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Configuración manual no encontrada'
      });
    }

    const config = new IrrigationConfig(result.rows[0]);

    res.status(200).json({
      success: true,
      message: 'Configuración manual actualizada exitosamente',
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar configuración manual',
      error: error.message
    });
  }
};

// Buscar configuración manual (ahora en irrigation_configs)
const findManualConfigByIrrigationId = async (irrigation_config_id) => {
  try {
    const query = 'SELECT * FROM irrigation_configs WHERE id = $1 AND mode_type = \'manual\'';
    const result = await pool.query(query, [irrigation_config_id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return new IrrigationConfig(result.rows[0]);
  } catch (error) {
    throw new Error(`Error al buscar configuración manual: ${error.message}`);
  }
};

const findAutomaticConfigByIrrigationId = async (irrigation_config_id) => {
  try {
    const query = 'SELECT * FROM automatic_settings WHERE config_id = $1';
    const result = await pool.query(query, [irrigation_config_id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return new AutomaticConfig(result.rows[0]);
  } catch (error) {
    throw new Error(`Error al buscar configuración automática: ${error.message}`);
  }
};

const findProgrammedConfigByIrrigationId = async (irrigation_config_id) => {
  try {
    const query = 'SELECT * FROM programmed_settings WHERE config_id = $1';
    const result = await pool.query(query, [irrigation_config_id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return new ProgrammedConfig(result.rows[0]);
  } catch (error) {
    throw new Error(`Error al buscar configuración programada: ${error.message}`);
  }
};

// ===== FUNCIONES ESPECÍFICAS PARA MODO AUTOMÁTICO =====

// Crear configuración automática simplificada (sin duración)
const createSimpleAutomaticConfig = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { user_id, crop_id } = req.body;

    if (!user_id || !crop_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'User ID y crop ID son obligatorios'
      });
    }

    // Verificar cultivo del usuario
    const cropQuery = `SELECT * FROM crops WHERE id = $1 AND user_id = $2`;
    const cropResult = await client.query(cropQuery, [crop_id, user_id]);
    if (cropResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Cultivo no encontrado' });
    }
    const crop = cropResult.rows[0];

    // Verificar dispositivo activo
    const deviceQuery = `SELECT id FROM devices WHERE user_id = $1 AND is_active_communication = true LIMIT 1`;
    const deviceResult = await client.query(deviceQuery, [user_id]);
    if (deviceResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false, 
        message: 'No hay dispositivo IoT activo. Activa la comunicación de un dispositivo primero.' 
      });
    }

    // Cancelar activaciones de bomba activas para configuraciones automáticas existentes
    const cancelPumpQuery = `
      UPDATE pump_activations 
      SET status = 'cancelled', ended_at = NOW()
      WHERE irrigation_config_id IN (
        SELECT id FROM irrigation_configs 
        WHERE user_id = $1 AND mode_type = 'automatic' AND is_active = true
      ) AND status IN ('active', 'paused')
      RETURNING id
    `;
    const canceledPumps = await client.query(cancelPumpQuery, [user_id]);
    
    if (canceledPumps.rows.length > 0) {
      console.log('🚰 Canceladas', canceledPumps.rows.length, 'activaciones de bomba activas');
      
      // Enviar comando OFF si había bomba activa
      try {
        const { sendDownlinkForConfig } = await import('../services/ttnService.js');
        // Obtener la configuración para enviar OFF
        const configQuery = `SELECT id FROM irrigation_configs WHERE user_id = $1 AND mode_type = 'automatic' AND is_active = true LIMIT 1`;
        const configResult = await client.query(configQuery, [user_id]);
        if (configResult.rows.length > 0) {
          await sendDownlinkForConfig(configResult.rows[0].id, 'OFF');
          console.log('✅ Comando OFF enviado al cancelar configuración previa');
        }
      } catch (downlinkError) {
        console.warn('⚠️ Error enviando comando OFF (no crítico):', downlinkError.message);
      }
    }

    // Eliminar configuraciones automáticas existentes para este usuario y cultivo
    const deleteQuery = `
      DELETE FROM irrigation_configs 
      WHERE user_id = $1 AND crop_id = $2 AND mode_type = 'automatic'
    `;
    await client.query(deleteQuery, [user_id, crop_id]);
    console.log('🧹 Configuraciones automáticas previas eliminadas para usuario', user_id, 'y cultivo', crop_id);

    // Crear nueva configuración automática preparada pero inactiva (sin duration_minutes)
    // Se activará automáticamente cuando se cumplan las condiciones de riego
    const insertQuery = `
      INSERT INTO irrigation_configs (user_id, crop_id, mode_type, is_active)
      VALUES ($1, $2, 'automatic', false)
      RETURNING *
    `;
    const insertResult = await client.query(insertQuery, [user_id, crop_id]);
    const irrigationConfig = insertResult.rows[0];

    await client.query('COMMIT');

    // Crear alerta de configuración guardada
    try {
      await createAutomaticConfigSavedAlert(user_id, crop.name);
    } catch (alertError) {
      console.warn('Error al crear alerta de configuración automática:', alertError.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Configuración automática creada exitosamente',
      data: {
        ...irrigationConfig,
        crop: {
          id: crop.id,
          name: crop.name,
          soil_humidity_min: crop.soil_humidity_min,
          soil_humidity_max: crop.soil_humidity_max,
          air_humidity_min: crop.air_humidity_min,
          air_humidity_max: crop.air_humidity_max,
          temperature_max: crop.temperature_max
        },
        thresholds: {
          soil_humidity_min: crop.soil_humidity_min,
          soil_humidity_max: crop.soil_humidity_max,
          air_humidity_min: crop.air_humidity_min,
          air_humidity_max: crop.air_humidity_max,
          temperature_max: crop.temperature_max
        }
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creando configuración automática simple:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear configuración automática',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// Obtener estado actual del modo automático para un usuario
const getAutomaticConfigStatus = async (req, res) => {
  try {
    const { user_id } = req.params;
    if (!user_id) {
      return res.status(400).json({ success: false, message: 'User ID es obligatorio' });
    }

    const status = await getAutomaticIrrigationStatus(user_id);
    if (!status) {
      return res.status(404).json({
        success: false,
        message: 'No hay configuración automática activa',
        data: null
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Estado del modo automático obtenido exitosamente',
      data: status
    });
  } catch (error) {
    console.error('❌ Error obteniendo estado automático:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener estado del modo automático',
      error: error.message
    });
  }
};

// Cancelar configuración automática activa del usuario
const cancelAutomaticConfig = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { user_id } = req.params;
    if (!user_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'User ID es obligatorio' });
    }

    const configQuery = `
      SELECT ic.id, c.name as crop_name, ic.is_active
      FROM irrigation_configs ic
      INNER JOIN crops c ON c.id = ic.crop_id
      WHERE ic.user_id = $1 AND ic.mode_type = 'automatic'
      ORDER BY ic.created_at DESC
      LIMIT 1
    `;
    const cfg = await client.query(configQuery, [user_id]);
    if (cfg.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'No hay configuración automática para cancelar' });
    }

    const configId = cfg.rows[0].id;

    // Eliminar configuración automática
    await client.query(`DELETE FROM irrigation_configs WHERE id = $1`, [configId]);
    console.log('🗑️ [AUTO] Configuración automática eliminada:', configId);

    // Cancelar activaciones de bomba activas/pausadas y enviar OFF
    const pumpQuery = `
      UPDATE pump_activations 
      SET status = 'cancelled', ended_at = NOW()
      WHERE irrigation_config_id = $1 AND status IN ('active','paused')
      RETURNING id
    `;
    const pumpResult = await client.query(pumpQuery, [configId]);
    
    // Si había bomba activa, enviar comando OFF
    if (pumpResult.rows.length > 0) {
      try {
        const { sendDownlinkForConfig } = await import('../services/ttnService.js');
        await sendDownlinkForConfig(configId, 'OFF');
        console.log('✅ [AUTO] Comando OFF enviado al cancelar configuración');
      } catch (downlinkError) {
        console.error('❌ [AUTO] Error enviando comando OFF:', downlinkError);
      }
    }

    await client.query('COMMIT');

    // Crear alerta de configuración cancelada
    try {
      await createAutomaticConfigCancelledAlert(user_id, cfg.rows[0].crop_name);
    } catch (alertError) {
      console.warn('Error al crear alerta de cancelación automática:', alertError.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Configuración automática cancelada exitosamente',
      data: { configId, cropName: cfg.rows[0].crop_name }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error cancelando configuración automática:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al cancelar configuración automática', 
      error: error.message 
    });
  } finally {
    client.release();
  }
};

// ===== FUNCIONES PRINCIPALES DE IRRIGATION CONFIG =====
export {
  createIrrigationConfig,
  findIrrigationConfigById,
  getIrrigationConfigById,
  getActiveIrrigationConfigsByUser,
  getIrrigationConfigsByUser,
  getIrrigationConfigsByUserAndType,
  activateIrrigationConfig,
  deactivateIrrigationConfig,
  updateLastIrrigation,
  getLastIrrigationDate,
  getSpecificConfig,
  deleteIrrigationConfig
};

// ===== FUNCIONES DE MANUAL CONFIG =====
export {
  findManualConfigByIrrigationId,
  updateManualConfig
};

// Función para evaluar automáticamente después de insertar datos de simulación
const evaluateAutomaticIrrigationForUser = async (req, res) => {
  try {
    console.log('🚀 [API] Iniciando evaluateAutomaticIrrigationForUser');
    const { userId } = req.params;
    console.log('👤 [API] UserId recibido:', userId);
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario requerido'
      });
    }
    
    // 1. Buscar dispositivo activo del usuario
    console.log('🔍 [API] Buscando dispositivo activo...');
    const deviceResult = await pool.query(
      'SELECT id, device_name FROM devices WHERE user_id = $1 AND is_active_communication = true LIMIT 1',
      [userId]
    );
    console.log('📱 [API] Dispositivos encontrados:', deviceResult.rows.length);
    
    if (deviceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No hay dispositivo activo para este usuario'
      });
    }
    
    const device = deviceResult.rows[0];
    console.log('✅ [API] Dispositivo activo:', device);
    
    // 2. Obtener la última lectura de sensores
    console.log('📊 [API] Obteniendo última lectura...');
    const latestResult = await pool.query(
      'SELECT * FROM sensor_readings WHERE device_id = $1 ORDER BY received_at DESC LIMIT 1',
      [device.id]
    );
    console.log('📈 [API] Lecturas encontradas:', latestResult.rows.length);
    
    if (latestResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No hay lecturas de sensores para este dispositivo'
      });
    }
    
    const latestReading = latestResult.rows[0];
    console.log('📊 [API] Última lectura:', latestReading);
    
    // 3. Llamar a evaluateAutomaticIrrigation
    console.log('🤖 [API] Iniciando evaluación automática...');
    
    const sensorData = {
      temperature: latestReading.temperature,
      air_humidity: latestReading.air_humidity,
      soil_humidity: latestReading.soil_humidity,
      device_id: device.id,
      timestamp: latestReading.received_at
    };
    console.log('📊 [API] Datos de sensores para evaluación:', sensorData);
    
    try {
      await evaluateAutomaticIrrigation(device.id, sensorData);
      console.log('✅ [API] Evaluación automática completada sin errores');
    } catch (evalError) {
      console.error('❌ [API] Error en evaluateAutomaticIrrigation:', evalError.message);
      console.error('❌ [API] Stack del error:', evalError.stack);
      
      // Retornar el error específico
      return res.status(500).json({
        success: false,
        message: 'Error en la evaluación automática',
        error: evalError.message,
        stack: evalError.stack
      });
    }
    
    // 4. Verificar el resultado final
    console.log('🔍 [API] Verificando resultado final...');
    const statusResult = await pool.query(`
      SELECT 
        ic.is_active as config_active,
        pa.status as pump_status,
        pa.started_at as pump_started
      FROM irrigation_configs ic
      LEFT JOIN pump_activations pa ON pa.irrigation_config_id = ic.id 
        AND pa.status IN ('active', 'paused')
      WHERE ic.user_id = $1 AND ic.mode_type = 'automatic'
      ORDER BY ic.created_at DESC, pa.created_at DESC
      LIMIT 1
    `, [userId]);
    
    const finalStatus = statusResult.rows[0] || {};
    console.log('📋 [API] Estado final:', finalStatus);
    
    res.json({
      success: true,
      message: 'Evaluación automática completada',
      data: {
        device: {
          id: device.id,
          name: device.device_name
        },
        latestReading: {
          temperature: latestReading.temperature,
          air_humidity: latestReading.air_humidity,
          soil_humidity: latestReading.soil_humidity,
          received_at: latestReading.received_at
        },
        result: {
          configActive: finalStatus.config_active || false,
          pumpStatus: finalStatus.pump_status || 'inactive',
          pumpStarted: finalStatus.pump_started || null,
          irrigationActivated: finalStatus.config_active && finalStatus.pump_status === 'active'
        }
      }
    });
    
  } catch (error) {
    console.error('❌ [API] Error en evaluación automática:', error);
    console.error('❌ [API] Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      stack: error.stack
    });
  }
};

// Función simple para activar/desactivar bomba automática desde frontend
const toggleAutomaticPump = async (req, res) => {
  try {
    const { userId } = req.params;
    const { action } = req.body; // 'activate' | 'deactivate'
    
    console.log(`🔄 [API] Acción de bomba automática: ${action} para usuario ${userId}`);
    
    if (!userId || !action) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario y acción son requeridos'
      });
    }
    
    if (!['activate', 'deactivate'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Acción debe ser "activate" o "deactivate"'
      });
    }
    
    // 1. Buscar configuración automática del usuario
    const configResult = await pool.query(`
      SELECT ic.id, ic.is_active, d.id as device_id, d.device_name
      FROM irrigation_configs ic
      INNER JOIN crops c ON c.id = ic.crop_id
      INNER JOIN devices d ON d.user_id = ic.user_id AND d.is_active_communication = true
      WHERE ic.user_id = $1 AND ic.mode_type = 'automatic'
      ORDER BY ic.created_at DESC
      LIMIT 1
    `, [userId]);
    
    if (configResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No hay configuración automática para este usuario'
      });
    }
    
    const config = configResult.rows[0];
    
    if (action === 'activate') {
      // ACTIVAR riego automático
      
      // Marcar configuración como activa
      await pool.query('UPDATE irrigation_configs SET is_active = true WHERE id = $1', [config.id]);
      
      // Crear pump_activation
      const pumpResult = await pool.query(`
        INSERT INTO pump_activations (irrigation_config_id, started_at, status, duration_minutes)
        VALUES ($1, NOW(), 'active', NULL)
        RETURNING id
      `, [config.id]);
      
      // NOTA: El comando ON se envía automáticamente desde el backend cuando se evalúan los sensores
      // No enviar desde aquí para evitar duplicados
      
      console.log('✅ [API] Riego automático ACTIVADO');
      
      res.json({
        success: true,
        message: 'Riego automático activado',
        data: {
          configActive: true,
          pumpStatus: 'active',
          pumpActivationId: pumpResult.rows[0].id
        }
      });
      
    } else {
      // DESACTIVAR riego automático
      
      // Buscar pump_activation activa
      const activePumpResult = await pool.query(`
        SELECT id FROM pump_activations 
        WHERE irrigation_config_id = $1 AND status = 'active'
        ORDER BY started_at DESC LIMIT 1
      `, [config.id]);
      
      if (activePumpResult.rows.length > 0) {
        // Completar pump_activation
        await pool.query(`
          UPDATE pump_activations 
          SET status = 'completed', ended_at = NOW() 
          WHERE id = $1
        `, [activePumpResult.rows[0].id]);
        
        // Enviar comando OFF a TTN
        const { sendDownlinkForConfig } = await import('../services/ttnService.js');
        await sendDownlinkForConfig(config.id, 'OFF');
      }
      
      console.log('✅ [API] Riego automático DESACTIVADO');
      
      res.json({
        success: true,
        message: 'Riego automático desactivado',
        data: {
          configActive: true,
          pumpStatus: 'completed'
        }
      });
    }
    
  } catch (error) {
    console.error('❌ [API] Error en toggleAutomaticPump:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// ===== FUNCIONES DE AUTOMATIC CONFIG =====
export {
  createAutomaticConfig,
  findAutomaticConfigByIrrigationId,
  createSimpleAutomaticConfig,
  getAutomaticConfigStatus,
  cancelAutomaticConfig,
  evaluateAutomaticIrrigationForUser,
  toggleAutomaticPump
};

// ===== FUNCIONES DE PROGRAMMED CONFIG =====
export {
  createProgrammedConfig,
  cancelProgrammedConfig,
  cancelProgrammedIrrigation,
  deleteProgrammedSettings,
  updateNextExecution,
  updateProgrammedExecution,
  findProgrammedConfigByIrrigationId,
  // Alertas de riego
  createIrrigationStartedAlertEndpoint,
  createIrrigationEndedAlertEndpoint,
  createIrrigationCancelledAlertEndpoint,
  createIrrigationPausedAlertEndpoint,
  createIrrigationResumedAlertEndpoint
};

// Endpoints para alertas de riego
const createIrrigationStartedAlertEndpoint = async (req, res) => {
  try {
    const { user_id, mode, crop_name, duration_minutes } = req.body;
    
    const alert = await createIrrigationStartedAlert(user_id, mode, crop_name, duration_minutes);
    
    res.status(201).json({
      success: true,
      message: 'Alerta de riego iniciado creada exitosamente',
      data: alert
    });
  } catch (error) {
    console.error('Error creando alerta de riego iniciado:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al crear alerta de riego iniciado',
      error: error.message
    });
  }
};

const createIrrigationEndedAlertEndpoint = async (req, res) => {
  try {
    const { user_id, mode, crop_name, was_completed = true } = req.body;
    
    const alert = await createIrrigationEndedAlert(user_id, mode, crop_name, was_completed);
    
    res.status(201).json({
      success: true,
      message: 'Alerta de riego terminado creada exitosamente',
      data: alert
    });
  } catch (error) {
    console.error('Error creando alerta de riego terminado:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al crear alerta de riego terminado',
      error: error.message
    });
  }
};

const createIrrigationCancelledAlertEndpoint = async (req, res) => {
  try {
    const { user_id, mode, crop_name } = req.body;
    
    const alert = await createIrrigationCancelledAlert(user_id, mode, crop_name);
    
    res.status(201).json({
      success: true,
      message: 'Alerta de riego cancelado creada exitosamente',
      data: alert
    });
  } catch (error) {
    console.error('Error creando alerta de riego cancelado:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al crear alerta de riego cancelado',
      error: error.message
    });
  }
};

const createIrrigationPausedAlertEndpoint = async (req, res) => {
  try {
    const { user_id, mode, crop_name } = req.body;
    
    const alert = await createIrrigationPausedAlert(user_id, mode, crop_name);
    
    res.status(201).json({
      success: true,
      message: 'Alerta de riego pausado creada exitosamente',
      data: alert
    });
  } catch (error) {
    console.error('Error creando alerta de riego pausado:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al crear alerta de riego pausado',
      error: error.message
    });
  }
};

const createIrrigationResumedAlertEndpoint = async (req, res) => {
  try {
    const { user_id, mode, crop_name } = req.body;
    
    const alert = await createIrrigationResumedAlert(user_id, mode, crop_name);
    
    res.status(201).json({
      success: true,
      message: 'Alerta de riego reanudado creada exitosamente',
      data: alert
    });
  } catch (error) {
    console.error('Error creando alerta de riego reanudado:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al crear alerta de riego reanudado',
      error: error.message
    });
  }
};
