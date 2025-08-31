import { pool } from '../config/db.js';
import Alert from '../models/Alert.js';

/**
 * Servicio para manejar alertas relacionadas con cultivos
 */

// Función auxiliar para crear alertas de cultivos
const createCropAlert = async (user_id, alert_subtype, title, message, severity = 'info') => {
  try {
    const query = `
      INSERT INTO alerts (user_id, alert_type, alert_subtype, severity, title, message, is_resolved)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [user_id, 'crop', alert_subtype, severity, title, message, false];
    const result = await pool.query(query, values);
    
    return new Alert(result.rows[0]);
  } catch (error) {
    console.error(`Error creando alerta de cultivo (${alert_subtype}):`, error.message);
    throw error;
  }
};

// Crear alerta de cultivo seleccionado
export const createCropSelectedAlert = async (user_id, cropName) => {
  const title = 'Cultivo seleccionado';
  const message = `Has seleccionado "${cropName}" como tu cultivo activo. Ahora puedes configurar el riego para este cultivo.`;
  
  return await createCropAlert(user_id, 'crop_selected', title, message, 'success');
};

// Crear alerta de cultivo deseleccionado
export const createCropDeselectedAlert = async (user_id, cropName) => {
  const title = 'Cultivo deseleccionado';
  const message = `El cultivo "${cropName}" ha sido deseleccionado. Puedes seleccionar otro cultivo cuando desees.`;
  
  return await createCropAlert(user_id, 'crop_deselected', title, message, 'info');
};

// Crear alerta de cultivo editado
export const createCropEditedAlert = async (user_id, cropName) => {
  const title = 'Cultivo actualizado';
  const message = `La información del cultivo "${cropName}" ha sido actualizada exitosamente.`;
  
  return await createCropAlert(user_id, 'crop_edited', title, message, 'info');
};

// Crear alerta de cultivo eliminado
export const createCropDeletedAlert = async (user_id, cropName) => {
  const title = 'Cultivo eliminado';
  const message = `El cultivo "${cropName}" ha sido eliminado junto con todas sus configuraciones de riego.`;
  
  return await createCropAlert(user_id, 'crop_deleted', title, message, 'warning');
};

// Crear alerta de cultivo agregado
export const createCropAddedAlert = async (user_id, cropName) => {
  const title = 'Cultivo agregado';
  const message = `El cultivo "${cropName}" ha sido agregado exitosamente. Ya puedes seleccionarlo para configurar el riego.`;
  
  return await createCropAlert(user_id, 'crop_added', title, message, 'success');
};
