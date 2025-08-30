import { pool } from '../config/db.js';
import Alert from '../models/Alert.js';

/**
 * Servicio para manejar alertas relacionadas con dispositivos IoT
 */

// Función auxiliar para crear alertas de dispositivos
const createDeviceAlert = async (user_id, alert_subtype, title, message, severity = 'info') => {
  try {
    const query = `
      INSERT INTO alerts (user_id, alert_type, alert_subtype, severity, title, message, is_resolved)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [user_id, 'device', alert_subtype, severity, title, message, false];
    const result = await pool.query(query, values);
    
    return new Alert(result.rows[0]);
  } catch (error) {
    console.error(`Error creando alerta de dispositivo (${alert_subtype}):`, error.message);
    throw error;
  }
};

// Crear alerta de dispositivo agregado
export const createDeviceAddedAlert = async (user_id, deviceName) => {
  const title = 'Dispositivo IoT agregado';
  const message = `El dispositivo "${deviceName}" ha sido agregado exitosamente a tu cuenta. Ya puedes comenzar a recibir datos de sensores y controlar el riego.`;
  
  return await createDeviceAlert(user_id, 'device_added', title, message, 'success');
};

// Crear alerta de dispositivo online (comunicación activada)
export const createDeviceOnlineAlert = async (user_id, deviceName) => {
  const title = 'Comunicación del dispositivo activada';
  const message = `La comunicación del dispositivo "${deviceName}" ha sido activada. Los datos de sensores se almacenarán en la base de datos.`;
  
  return await createDeviceAlert(user_id, 'device_online', title, message, 'success');
};

// Crear alerta de dispositivo offline (comunicación desactivada)
export const createDeviceOfflineAlert = async (user_id, deviceName) => {
  const title = 'Comunicación del dispositivo desactivada';
  const message = `La comunicación del dispositivo "${deviceName}" ha sido desactivada. Los datos de sensores no se almacenarán hasta que reactives la comunicación.`;
  
  return await createDeviceAlert(user_id, 'device_offline', title, message, 'warning');
};

// Crear alerta de dispositivo eliminado
export const createDeviceDeletedAlert = async (user_id, deviceName) => {
  const title = 'Dispositivo IoT eliminado';
  const message = `El dispositivo "${deviceName}" ha sido eliminado de tu cuenta junto con todos sus datos asociados.`;
  
  return await createDeviceAlert(user_id, 'device_deleted', title, message, 'info');
};

// Crear alerta de dispositivo editado
export const createDeviceEditedAlert = async (user_id, deviceName) => {
  const title = 'Dispositivo IoT actualizado';
  const message = `La configuración del dispositivo "${deviceName}" ha sido actualizada exitosamente.`;
  
  return await createDeviceAlert(user_id, 'device_edited', title, message, 'info');
};

// Crear alerta de API key copiada
export const createApiKeyCopiedAlert = async (user_id) => {
  const title = 'Clave API copiada';
  const message = 'La clave API ha sido copiada al portapapeles exitosamente. Mantén esta clave segura.';
  
  return await createDeviceAlert(user_id, 'api_key_copied', title, message, 'success');
};
