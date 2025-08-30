import { pool } from '../config/db.js';
import Alert from '../models/Alert.js';
import { handleNotFoundError, handleBadRequestError, handleInternalServerError, handleSuccessResponse } from '../utils/index.js';



// Buscar alerta por ID
const findAlertById = async (id) => {
  try {
    const query = 'SELECT * FROM alerts WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return new Alert(result.rows[0]);
  } catch (error) {
    throw new Error(`Error al buscar alerta: ${error.message}`);
  }
};

// Obtener alerta por ID (para API)
const getAlertById = async (req, res) => {
  try {
    const { id } = req.params;
    const alert = await findAlertById(id);

    if (!alert) {
      return handleNotFoundError('Alerta no encontrada', res);
    }

    return handleSuccessResponse(res, alert, 'Alerta obtenida exitosamente');
  } catch (error) {
    return handleInternalServerError('Error al obtener alerta', res, error);
  }
};

// Obtener alertas del usuario autenticado
const getMyAlerts = async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const user_id = req.user.id;

    const query = `
      SELECT * FROM alerts 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(query, [user_id, parseInt(limit), parseInt(offset)]);
    
    const alerts = result.rows.map(row => new Alert(row).toJSON());

    return handleSuccessResponse(res, alerts, `${alerts.length} alertas obtenidas exitosamente`);
  } catch (error) {
    return handleInternalServerError('Error al obtener alertas del usuario', res, error);
  }
};

// Marcar alerta como resuelta
const resolveAlert = async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'UPDATE alerts SET is_resolved = true WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return handleNotFoundError('Alerta no encontrada', res);
    }
    
    const alert = new Alert(result.rows[0]);

    return handleSuccessResponse(res, alert, 'Alerta marcada como resuelta');
  } catch (error) {
    return handleInternalServerError('Error al resolver alerta', res, error);
  }
};



// Marcar todas las alertas del usuario autenticado como resueltas
const resolveAllAlertsByUserId = async (req, res) => {
  try {
    const user_id = req.user.id;

    const query = 'UPDATE alerts SET is_resolved = true WHERE user_id = $1 AND is_resolved = false';
    const result = await pool.query(query, [user_id]);

    return handleSuccessResponse(res, { count: result.rowCount }, `${result.rowCount} alertas marcadas como resueltas`);
  } catch (error) {
    return handleInternalServerError('Error al resolver todas las alertas', res, error);
  }
};

// Eliminar alerta
const deleteAlert = async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM alerts WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Alerta no encontrada'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Alerta eliminada exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar alerta',
      error: error.message
    });
  }
};



// Eliminar todas las alertas del usuario autenticado
const deleteMyOldAlerts = async (req, res) => {
  try {
    const user_id = req.user.id;

    console.log(`[DEBUG] deleteMyOldAlerts - Usuario: ${user_id}`);

    // Eliminar TODAS las alertas del usuario actual
    const query = `DELETE FROM alerts WHERE user_id = $1`;
    const result = await pool.query(query, [user_id]);

    console.log(`[DEBUG] Se eliminaron ${result.rowCount} alertas del usuario`);

    return handleSuccessResponse(res, { count: result.rowCount }, `${result.rowCount} alertas eliminadas`);
  } catch (error) {
    console.error('[DEBUG] Error en deleteMyOldAlerts:', error);
    return handleInternalServerError('Error al eliminar alertas', res, error);
  }
};

// ==================== ENDPOINTS PARA ADMINISTRADOR ====================

// Obtener todas las alertas del sistema con información de usuarios (solo admin)
const getAllAlertsWithUsers = async (req, res) => {
  try {
    // Verificar que el usuario es admin
    if (req.user.role !== 'admin') {
      return handleBadRequestError('Acceso denegado. Solo administradores pueden acceder a esta información', res);
    }

    const { limit = 100, offset = 0 } = req.query;

    const query = `
      SELECT 
        a.*,
        u.name as user_name,
        u.email as user_email,
        u.role as user_role
      FROM alerts a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC 
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [parseInt(limit), parseInt(offset)]);
    
    const alerts = result.rows.map(row => {
      const alert = new Alert(row);
      return {
        ...alert.toJSON(),
        user_name: row.user_name,
        user_email: row.user_email,
        user_role: row.user_role
      };
    });

    return handleSuccessResponse(res, alerts, `${alerts.length} alertas obtenidas exitosamente`);
  } catch (error) {
    return handleInternalServerError('Error al obtener todas las alertas', res, error);
  }
};

// Eliminar todas las alertas del sistema (solo admin)
const deleteAllSystemAlerts = async (req, res) => {
  try {
    // Verificar que el usuario es admin
    if (req.user.role !== 'admin') {
      return handleBadRequestError('Acceso denegado. Solo administradores pueden realizar esta acción', res);
    }

    const query = 'DELETE FROM alerts';
    const result = await pool.query(query);

    return handleSuccessResponse(res, { count: result.rowCount }, `${result.rowCount} alertas eliminadas del sistema`);
  } catch (error) {
    return handleInternalServerError('Error al eliminar todas las alertas del sistema', res, error);
  }
};


// ==================== ALERTAS DE CULTIVOS ====================

// Crear alerta de cultivo seleccionado
const createCropSelectedAlert = async (user_id, cropName) => {
  try {
    const query = `
      INSERT INTO alerts (user_id, alert_type, alert_subtype, severity, title, message, is_resolved)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      user_id,
      'crop',
      'crop_selected',
      'success',
      'Cultivo seleccionado',
      `El cultivo "${cropName}" ha sido seleccionado como activo para el riego.`,
      false
    ];
    
    const result = await pool.query(query, values);
    return new Alert(result.rows[0]);
  } catch (error) {
    throw new Error(`Error al crear alerta de cultivo seleccionado: ${error.message}`);
  }
};

// Crear alerta de cultivo deseleccionado
const createCropDeselectedAlert = async (user_id, cropName) => {
  try {
    const query = `
      INSERT INTO alerts (user_id, alert_type, alert_subtype, severity, title, message, is_resolved)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      user_id,
      'crop',
      'crop_deselected',
      'info',
      'Cultivo deseleccionado',
      `El cultivo "${cropName}" ya no está activo para el riego.`,
      false
    ];
    
    const result = await pool.query(query, values);
    return new Alert(result.rows[0]);
  } catch (error) {
    throw new Error(`Error al crear alerta de cultivo deseleccionado: ${error.message}`);
  }
};

// Crear alerta de cultivo editado
const createCropEditedAlert = async (user_id, cropName) => {
  try {
    const query = `
      INSERT INTO alerts (user_id, alert_type, alert_subtype, severity, title, message, is_resolved)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      user_id,
      'crop',
      'crop_edited',
      'info',
      'Cultivo actualizado',
      `El cultivo "${cropName}" ha sido actualizado exitosamente.`,
      false
    ];
    
    const result = await pool.query(query, values);
    return new Alert(result.rows[0]);
  } catch (error) {
    throw new Error(`Error al crear alerta de cultivo editado: ${error.message}`);
  }
};

// Crear alerta de cultivo eliminado
const createCropDeletedAlert = async (user_id, cropName) => {
  try {
    const query = `
      INSERT INTO alerts (user_id, alert_type, alert_subtype, severity, title, message, is_resolved)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      user_id,
      'crop',
      'crop_deleted',
      'warning',
      'Cultivo eliminado',
      `El cultivo "${cropName}" ha sido eliminado del sistema.`,
      false
    ];
    
    const result = await pool.query(query, values);
    return new Alert(result.rows[0]);
  } catch (error) {
    throw new Error(`Error al crear alerta de cultivo eliminado: ${error.message}`);
  }
};

// Crear alerta de cultivo agregado
const createCropAddedAlert = async (user_id, cropName) => {
  try {
    const query = `
      INSERT INTO alerts (user_id, alert_type, alert_subtype, severity, title, message, is_resolved)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      user_id,
      'crop',
      'crop_added',
      'success',
      'Cultivo agregado',
      `El cultivo "${cropName}" ha sido agregado exitosamente al sistema.`,
      false
    ];
    
    const result = await pool.query(query, values);
    return new Alert(result.rows[0]);
  } catch (error) {
    throw new Error(`Error al crear alerta de cultivo agregado: ${error.message}`);
  }
};

// ==================== ALERTAS DE RIEGO ====================
// NOTA: Las alertas de riego ahora se manejan en irrigationAlertService.js
// Estas funciones se mantienen aquí solo por compatibilidad con código legacy

// Crear alerta de riego programado guardado
const createProgrammedSavedAlert = async (user_id, scheduleInfo) => {
  try {
    const query = `
      INSERT INTO alerts (user_id, alert_type, alert_subtype, severity, title, message, is_resolved)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      user_id,
      'irrigation',
      'programmed_saved',
      'success',
      'Riego programado configurado',
      `Riego programado configurado exitosamente. ${scheduleInfo}`,
      false
    ];
    
    const result = await pool.query(query, values);
    return new Alert(result.rows[0]);
  } catch (error) {
    throw new Error(`Error al crear alerta de riego programado guardado: ${error.message}`);
  }
};



// Crear alerta de riego programado ejecutado
const createProgrammedScheduleAlert = async (user_id, cropName) => {
  try {
    const query = `
      INSERT INTO alerts (user_id, alert_type, alert_subtype, severity, title, message, is_resolved)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      user_id,
      'irrigation',
      'programmed_schedule',
      'info',
      'Riego programado ejecutado',
      `El riego programado para "${cropName}" se ha ejecutado automáticamente.`,
      false
    ];
    
    const result = await pool.query(query, values);
    return new Alert(result.rows[0]);
  } catch (error) {
    throw new Error(`Error al crear alerta de riego programado ejecutado: ${error.message}`);
  }
};

// Crear alerta de riego programado cancelado
const createProgrammedCancelledAlert = async (user_id) => {
  try {
    const query = `
      INSERT INTO alerts (user_id, alert_type, alert_subtype, severity, title, message, is_resolved)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      user_id,
      'irrigation',
      'programmed_cancelled',
      'warning',
      'Riego programado cancelado',
      'El riego programado ha sido cancelado por el usuario.',
      false
    ];
    
    const result = await pool.query(query, values);
    return new Alert(result.rows[0]);
  } catch (error) {
    throw new Error(`Error al crear alerta de riego programado cancelado: ${error.message}`);
  }
};

// Crear alerta de riego automático guardado
const createAutomaticSavedAlert = async (user_id, thresholdInfo) => {
  try {
    const query = `
      INSERT INTO alerts (user_id, alert_type, alert_subtype, severity, title, message, is_resolved)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      user_id,
      'irrigation',
      'automatic_saved',
      'success',
      'Riego automático configurado',
      `Riego automático configurado exitosamente. ${thresholdInfo}`,
      false
    ];
    
    const result = await pool.query(query, values);
    return new Alert(result.rows[0]);
  } catch (error) {
    throw new Error(`Error al crear alerta de riego automático guardado: ${error.message}`);
  }
};



export {
  // Funciones básicas del controlador (usadas por rutas)
  findAlertById,
  getAlertById,
  getMyAlerts,
  resolveAlert,
  resolveAllAlertsByUserId,
  deleteAlert,
  deleteMyOldAlerts,
  // Endpoints para administrador
  getAllAlertsWithUsers,
  deleteAllSystemAlerts,
  // Alertas de cultivo (usadas por cropController)
  createCropSelectedAlert,
  createCropDeselectedAlert,
  createCropEditedAlert,
  createCropDeletedAlert,
  createCropAddedAlert,
  // Alertas de riego programado y automático (legacy - considerar migrar a irrigationAlertService)
  createProgrammedSavedAlert,
  createProgrammedScheduleAlert,
  createProgrammedCancelledAlert,
  createAutomaticSavedAlert
};
