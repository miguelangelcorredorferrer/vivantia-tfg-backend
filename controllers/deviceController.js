import { pool } from '../config/db.js';
import Device from '../models/Device.js';
import { handleNotFoundError, handleBadRequestError, handleInternalServerError, handleSuccessResponse } from '../utils/index.js';
import { createDeviceAddedAlert, createDeviceOnlineAlert, createDeviceOfflineAlert, createDeviceDeletedAlert, createDeviceEditedAlert } from '../services/deviceAlertService.js';

// Crear un nuevo dispositivo
const createDevice = async (req, res) => {
  try {
    const {
      user_id, device_name, enddevice_id, app_eui, dev_eui, app_key, is_active_communication = false,
      ttn_region, ttn_app_id, ttn_access_key
    } = req.body;

    // Determinar el user_id: si se proporciona en el body (admin) o usar el usuario autenticado (usuario normal)
    const finalUserId = user_id || req.user.id;

    // Validar campos obligatorios
    if (!device_name || !enddevice_id || !app_eui || !dev_eui || !app_key) {
      return handleBadRequestError('Todos los campos obligatorios deben ser proporcionados', res);
    }

    // Validar formato hexadecimal de AppEUI (16 caracteres)
    const appEuiRegex = /^[A-Fa-f0-9]{16}$/;
    if (!appEuiRegex.test(app_eui)) {
      return handleBadRequestError('AppEUI debe tener exactamente 16 caracteres hexadecimales', res);
    }

    // Validar formato hexadecimal de DevEUI (16 caracteres)
    const devEuiRegex = /^[A-Fa-f0-9]{16}$/;
    if (!devEuiRegex.test(dev_eui)) {
      return handleBadRequestError('DevEUI debe tener exactamente 16 caracteres hexadecimales', res);
    }

    // Validar formato hexadecimal de AppKey (32 caracteres)
    const appKeyRegex = /^[A-Fa-f0-9]{32}$/;
    if (!appKeyRegex.test(app_key)) {
      return handleBadRequestError('AppKey debe tener exactamente 32 caracteres hexadecimales', res);
    }

    // Verificar que no exista un dispositivo con el mismo enddevice_id
    const existingDeviceQuery = 'SELECT * FROM devices WHERE enddevice_id = $1';
    const existingDeviceResult = await pool.query(existingDeviceQuery, [enddevice_id]);
    
    if (existingDeviceResult.rows.length > 0) {
      return handleBadRequestError('Ya existe un dispositivo con este EnddeviceID', res);
    }

    // Verificar que no exista un dispositivo con el mismo AppEUI
    const existingAppEuiQuery = 'SELECT * FROM devices WHERE app_eui = $1';
    const existingAppEuiResult = await pool.query(existingAppEuiQuery, [app_eui]);
    
    if (existingAppEuiResult.rows.length > 0) {
      return handleBadRequestError('Ya existe un dispositivo con este AppEUI', res);
    }

    // Verificar que no exista un dispositivo con el mismo DevEUI
    const existingDevEuiQuery = 'SELECT * FROM devices WHERE dev_eui = $1';
    const existingDevEuiResult = await pool.query(existingDevEuiQuery, [dev_eui]);
    
    if (existingDevEuiResult.rows.length > 0) {
      return handleBadRequestError('Ya existe un dispositivo con este DevEUI', res);
    }

    // Verificar que no exista un dispositivo con el mismo AppKey
    const existingAppKeyQuery = 'SELECT * FROM devices WHERE app_key = $1';
    const existingAppKeyResult = await pool.query(existingAppKeyQuery, [app_key]);
    
    if (existingAppKeyResult.rows.length > 0) {
      return handleBadRequestError('Ya existe un dispositivo con este AppKey', res);
    }

    const query = `
      INSERT INTO devices (
        user_id, device_name, enddevice_id, app_eui, dev_eui, app_key, is_active_communication,
        ttn_region, ttn_app_id, ttn_access_key
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const values = [
      finalUserId, device_name, enddevice_id, app_eui, dev_eui, app_key, is_active_communication,
      ttn_region, ttn_app_id, ttn_access_key
    ];
    
    const result = await pool.query(query, values);
    const device = new Device(result.rows[0]);

    // Crear alerta de dispositivo agregado
    try {
      await createDeviceAddedAlert(finalUserId, device.device_name);
    } catch (alertError) {
      console.warn('Error al crear alerta de dispositivo agregado:', alertError.message);
    }

    return handleSuccessResponse(res, device, 'Dispositivo creado exitosamente', 201);
  } catch (error) {
    return handleInternalServerError('Error al crear dispositivo', res, error);
  }
};

// Buscar dispositivo por ID
const findDeviceById = async (id) => {
  try {
    const query = 'SELECT * FROM devices WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return new Device(result.rows[0]);
  } catch (error) {
    throw new Error(`Error al buscar dispositivo: ${error.message}`);
  }
};

// Obtener dispositivo por ID (para API)
const getDeviceById = async (req, res) => {
  try {
    const { id } = req.params;
    const device = await findDeviceById(id);

    if (!device) {
      return handleNotFoundError('Dispositivo no encontrado', res);
    }

    return handleSuccessResponse(res, device, 'Dispositivo obtenido exitosamente');
  } catch (error) {
    return handleInternalServerError('Error al obtener dispositivo', res, error);
  }
};

// Buscar dispositivos por usuario
const getDevicesByUserId = async (req, res) => {
  try {
    const { user_id } = req.params;
    const authenticatedUser = req.user;

    // Verificar que el usuario autenticado está accediendo a sus propios dispositivos
    if (authenticatedUser.id !== parseInt(user_id)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a estos dispositivos'
      });
    }

    const query = 'SELECT * FROM devices WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [user_id]);
    
    const devices = result.rows.map(row => new Device(row));

    res.status(200).json({
      success: true,
      count: devices.length,
      data: devices
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener dispositivos del usuario',
      error: error.message
    });
  }
};

// Buscar dispositivo por enddevice_id
const findDeviceByEndDeviceId = async (enddevice_id) => {
  try {
    const query = 'SELECT * FROM devices WHERE enddevice_id = $1';
    const result = await pool.query(query, [enddevice_id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return new Device(result.rows[0]);
  } catch (error) {
    throw new Error(`Error al buscar dispositivo por enddevice_id: ${error.message}`);
  }
};

// Obtener dispositivo por enddevice_id (para API)
const getDeviceByEndDeviceId = async (req, res) => {
  try {
    const { enddevice_id } = req.params;
    const device = await findDeviceByEndDeviceId(enddevice_id);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Dispositivo no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      data: device
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener dispositivo',
      error: error.message
    });
  }
};

// Obtener todos los dispositivos
const getAllDevices = async (req, res) => {
  try {
    const query = 'SELECT * FROM devices ORDER BY created_at DESC';
    const result = await pool.query(query);
    
    const devices = result.rows.map(row => new Device(row));

    res.status(200).json({
      success: true,
      count: devices.length,
      data: devices
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener dispositivos',
      error: error.message
    });
  }
};

// Obtener todos los dispositivos con información de usuario
const getAllDevicesWithUsers = async (req, res) => {
  try {
    const query = `
      SELECT 
        d.*,
        u.name as user_name,
        u.email as user_email
      FROM devices d
      LEFT JOIN users u ON d.user_id = u.id
      ORDER BY d.created_at DESC
    `;
    const result = await pool.query(query);
    
    const devicesWithUsers = result.rows.map(row => ({
      ...row,
      user: {
        id: row.user_id,
        name: row.user_name,
        email: row.user_email
      }
    }));

    res.status(200).json({
      success: true,
      count: devicesWithUsers.length,
      data: devicesWithUsers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener dispositivos con usuarios',
      error: error.message
    });
  }
};

// Obtener dispositivos activos
const getActiveDevices = async (req, res) => {
  try {
    const query = 'SELECT * FROM devices WHERE is_active_communication = true ORDER BY created_at DESC';
    const result = await pool.query(query);
    
    const devices = result.rows.map(row => new Device(row));

    res.status(200).json({
      success: true,
      count: devices.length,
      data: devices
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener dispositivos activos',
      error: error.message
    });
  }
};

// Actualizar dispositivo
const updateDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const authenticatedUser = req.user;

    // Verificar si el dispositivo existe
    const existingDevice = await findDeviceById(id);
    if (!existingDevice) {
      return res.status(404).json({
        success: false,
        message: 'Dispositivo no encontrado'
      });
    }

    // Verificar permisos: el usuario debe ser el propietario del dispositivo o un administrador
    if (existingDevice.user_id !== authenticatedUser.id && authenticatedUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para realizar esta acción'
      });
    }

    const fields = [];
    const values = [];
    let counter = 1;

    // Construir la consulta dinámicamente
    for (const [key, value] of Object.entries(updateData)) {
      if (key !== 'id' && key !== 'user_id' && key !== 'created_at') {
        fields.push(`${key} = $${counter}`);
        values.push(value);
        counter++;
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay campos para actualizar'
      });
    }

    values.push(id);
    
    const query = `
      UPDATE devices 
      SET ${fields.join(', ')}
      WHERE id = $${counter}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Dispositivo no encontrado'
      });
    }
    
    const updatedDevice = new Device(result.rows[0]);

    // Crear alerta de dispositivo editado
    try {
      await createDeviceEditedAlert(existingDevice.user_id, existingDevice.device_name);
    } catch (alertError) {
      console.warn('Error al crear alerta de dispositivo editado:', alertError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Dispositivo actualizado exitosamente',
      data: updatedDevice
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar dispositivo',
      error: error.message
    });
  }
};

// Verificar dispositivos activos de un usuario
const checkActiveDevicesForUser = async (req, res) => {
  try {
    const { user_id } = req.params;
    
    const query = 'SELECT * FROM devices WHERE user_id = $1 AND is_active_communication = true';
    const result = await pool.query(query, [user_id]);
    
    const activeDevices = result.rows.map(row => new Device(row));

    res.status(200).json({
      success: true,
      count: activeDevices.length,
      data: activeDevices
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al verificar dispositivos activos',
      error: error.message
    });
  }
};

// Activar comunicación del dispositivo
const activateDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const { force = false } = req.body; // Parámetro para forzar la activación
    const authenticatedUser = req.user;

    // Verificar si el dispositivo existe
    const existingDevice = await findDeviceById(id);
    if (!existingDevice) {
      return res.status(404).json({
        success: false,
        message: 'Dispositivo no encontrado'
      });
    }

    // Verificar permisos: el usuario debe ser el propietario del dispositivo o un administrador
    if (existingDevice.user_id !== authenticatedUser.id && authenticatedUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para realizar esta acción'
      });
    }

    // Si no es force, verificar si ya hay dispositivos activos del mismo usuario
    if (!force) {
      const activeDevicesQuery = 'SELECT * FROM devices WHERE user_id = $1 AND is_active_communication = true AND id != $2';
      const activeDevicesResult = await pool.query(activeDevicesQuery, [existingDevice.user_id, id]);
      
      if (activeDevicesResult.rows.length > 0) {
        const activeDevices = activeDevicesResult.rows.map(row => new Device(row));
        return res.status(409).json({
          success: false,
          message: 'El usuario ya tiene un dispositivo activo',
          requiresConfirmation: true,
          activeDevices: activeDevices,
          targetDevice: existingDevice
        });
      }
    }

    // Si es force=true, desactivar todos los demás dispositivos del usuario
    if (force) {
      const deactivateOthersQuery = 'UPDATE devices SET is_active_communication = false WHERE user_id = $1 AND id != $2';
      await pool.query(deactivateOthersQuery, [existingDevice.user_id, id]);
    }

    const query = 'UPDATE devices SET is_active_communication = true WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Dispositivo no encontrado'
      });
    }
    
    const activatedDevice = new Device(result.rows[0]);

    // Crear alerta de dispositivo activado
    try {
      await createDeviceOnlineAlert(existingDevice.user_id, existingDevice.device_name);
    } catch (alertError) {
      console.warn('Error al crear alerta de dispositivo activado:', alertError.message);
    }

    res.status(200).json({
      success: true,
      message: force 
        ? 'Dispositivo activado exitosamente. Los demás dispositivos del usuario han sido desactivados.' 
        : 'Dispositivo activado exitosamente',
      data: activatedDevice
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al activar dispositivo',
      error: error.message
    });
  }
};

// Desactivar comunicación del dispositivo
const deactivateDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const authenticatedUser = req.user;

    // Verificar si el dispositivo existe
    const existingDevice = await findDeviceById(id);
    if (!existingDevice) {
      return res.status(404).json({
        success: false,
        message: 'Dispositivo no encontrado'
      });
    }

    // Verificar permisos: el usuario debe ser el propietario del dispositivo o un administrador
    if (existingDevice.user_id !== authenticatedUser.id && authenticatedUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para realizar esta acción'
      });
    }

    const query = 'UPDATE devices SET is_active_communication = false WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Dispositivo no encontrado'
      });
    }
    
    const deactivatedDevice = new Device(result.rows[0]);

    // Crear alerta de dispositivo desactivado
    try {
      await createDeviceOfflineAlert(existingDevice.user_id, existingDevice.device_name);
    } catch (alertError) {
      console.warn('Error al crear alerta de dispositivo desactivado:', alertError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Dispositivo desactivado exitosamente',
      data: deactivatedDevice
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al desactivar dispositivo',
      error: error.message
    });
  }
};

// Eliminar dispositivo
const deleteDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const authenticatedUser = req.user;

    // Verificar si el dispositivo existe
    const existingDevice = await findDeviceById(id);
    if (!existingDevice) {
      return res.status(404).json({
        success: false,
        message: 'Dispositivo no encontrado'
      });
    }

    // Verificar permisos: el usuario debe ser el propietario del dispositivo o un administrador
    if (existingDevice.user_id !== authenticatedUser.id && authenticatedUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para realizar esta acción'
      });
    }

    const query = 'DELETE FROM devices WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Dispositivo no encontrado'
      });
    }

    // Crear alerta de dispositivo eliminado
    try {
      await createDeviceDeletedAlert(existingDevice.user_id, existingDevice.device_name);
    } catch (alertError) {
      console.warn('Error al crear alerta de dispositivo eliminado:', alertError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Dispositivo eliminado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar dispositivo',
      error: error.message
    });
  }
};

// Obtener lecturas de sensores del dispositivo
const getDeviceSensorReadings = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 100 } = req.query;

    // Verificar si el dispositivo existe
    const existingDevice = await findDeviceById(id);
    if (!existingDevice) {
      return res.status(404).json({
        success: false,
        message: 'Dispositivo no encontrado'
      });
    }

    const query = `
      SELECT * FROM sensor_readings 
      WHERE device_id = $1 
      ORDER BY received_at DESC 
      LIMIT $2
    `;
    const result = await pool.query(query, [id, parseInt(limit)]);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener lecturas de sensores',
      error: error.message
    });
  }
};

// Obtener última lectura del dispositivo
const getDeviceLatestReading = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si el dispositivo existe
    const existingDevice = await findDeviceById(id);
    if (!existingDevice) {
      return res.status(404).json({
        success: false,
        message: 'Dispositivo no encontrado'
      });
    }

    const query = `
      SELECT * FROM sensor_readings 
      WHERE device_id = $1 
      ORDER BY received_at DESC 
      LIMIT 1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron lecturas para este dispositivo'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener última lectura',
      error: error.message
    });
  }
};

// Crear alerta de API key copiada
const createApiKeyCopiedAlert = async (req, res) => {
  try {
    const { user } = req;
    if (!user?.id) {
      return res.status(401).json({ 
        success: false, 
        message: 'No autenticado' 
      });
    }
    
    // Importar dinámicamente para evitar dependencias circulares
    const { createApiKeyCopiedAlert } = await import('../services/deviceAlertService.js');
    const alert = await createApiKeyCopiedAlert(user.id);
    
    return res.status(201).json({ 
      success: true, 
      data: alert,
      message: 'Alerta de API key copiada creada exitosamente'
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Error al crear alerta de clave API copiada', 
      error: error.message 
    });
  }
};

export {
  createDevice,
  findDeviceById,
  getDeviceById,
  getDevicesByUserId,
  findDeviceByEndDeviceId,
  getDeviceByEndDeviceId,
  getAllDevices,
  getAllDevicesWithUsers,
  getActiveDevices,
  checkActiveDevicesForUser,
  updateDevice,
  activateDevice,
  deactivateDevice,
  deleteDevice,
  getDeviceSensorReadings,
  getDeviceLatestReading,
  createApiKeyCopiedAlert
};
