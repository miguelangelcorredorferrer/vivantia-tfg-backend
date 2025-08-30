import { pool } from '../config/db.js';
import User from '../models/User.js';
import { handleNotFoundError, handleBadRequestError, handleInternalServerError, handleSuccessResponse } from '../utils/index.js';
import { findUserByEmail, findUserById, updateUser as updateUserService, createUser as createUserService, deleteUser as deleteUserService } from '../services/userService.js';
import { createUsernameChangedAlert } from '../services/authAlertService.js';

// Crear un nuevo usuario
const createUser = async (req, res) => {
  try {
    const { email, password, name, role = 'visitante', verified = false, token = '' } = req.body;

    // Verificar si el usuario ya existe
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return handleBadRequestError('El usuario ya existe con ese email', res);
    }

    const query = `
      INSERT INTO users (email, password, name, role, verified, token)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, name, role, verified, created_at
    `;
    
    const result = await pool.query(query, [email, password, name, role, verified, token]);
    const user = new User(result.rows[0]);

    return handleSuccessResponse(res, user.toJSON(), 'Usuario creado exitosamente', 201);
  } catch (error) {
    return handleInternalServerError('Error al crear usuario', res, error);
  }
};

// Obtener usuario por ID (para API)
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await findUserById(id);

    if (!user) {
      return handleNotFoundError('Usuario no encontrado', res);
    }

    return handleSuccessResponse(res, user.toJSON(), 'Usuario obtenido exitosamente');
  } catch (error) {
    return handleInternalServerError('Error al obtener usuario', res, error);
  }
};

// Obtener usuario por email (para API)
const getUserByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const user = await findUserByEmail(email);

    if (!user) {
      return handleNotFoundError('Usuario no encontrado', res);
    }

    return handleSuccessResponse(res, user.toJSON(), 'Usuario obtenido exitosamente');
  } catch (error) {
    return handleInternalServerError('Error al obtener usuario', res, error);
  }
};

// Obtener todos los usuarios
const getAllUsers = async (req, res) => {
  try {
    const query = 'SELECT id, email, name, role, verified, created_at FROM users ORDER BY created_at DESC';
    const result = await pool.query(query);
    
    const users = result.rows.map(row => new User(row));

    return handleSuccessResponse(res, users.map(user => user.toJSON()), `${users.length} usuarios obtenidos exitosamente`);
  } catch (error) {
    return handleInternalServerError('Error al obtener usuarios', res, error);
  }
};

// Actualizar usuario
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Verificar si el usuario existe
    const existingUser = await findUserById(id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const fields = [];
    const values = [];
    let counter = 1;

    // Construir la consulta dinámicamente
    for (const [key, value] of Object.entries(updateData)) {
      if (key !== 'id' && key !== 'created_at') {
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
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE id = $${counter}
      RETURNING id, email, name, role, verified, created_at
    `;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    const updatedUser = new User(result.rows[0]);

    // Crear alerta si se cambió el nombre
    try {
      if (updateData.name && updateData.name !== existingUser.name) {
        await createUsernameChangedAlert(updatedUser.id, existingUser.name, updateData.name);
      }
    } catch (alertError) {
      console.warn('Error al crear alerta de cambio de nombre:', alertError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: updatedUser.toJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar usuario',
      error: error.message
    });
  }
};

// Eliminar usuario (para administradores)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { force = false } = req.body; // Parámetro para forzar eliminación

    // Verificar si el usuario existe
    const existingUser = await findUserById(id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Si no es force, obtener estadísticas para mostrar al administrador
    if (!force) {
      const stats = {};

      // Contar cultivos
      const cropsQuery = 'SELECT COUNT(*) as count FROM crops WHERE user_id = $1';
      const cropsResult = await pool.query(cropsQuery, [id]);
      stats.crops = parseInt(cropsResult.rows[0].count);

      // Contar dispositivos
      const devicesQuery = 'SELECT COUNT(*) as count FROM devices WHERE user_id = $1';
      const devicesResult = await pool.query(devicesQuery, [id]);
      stats.devices = parseInt(devicesResult.rows[0].count);

      // Contar alertas
      const alertsQuery = 'SELECT COUNT(*) as count FROM alerts WHERE user_id = $1';
      const alertsResult = await pool.query(alertsQuery, [id]);
      stats.alerts = parseInt(alertsResult.rows[0].count);

      // Contar configuraciones de riego
      const irrigationConfigsQuery = 'SELECT COUNT(*) as count FROM irrigation_configs WHERE user_id = $1';
      const irrigationConfigsResult = await pool.query(irrigationConfigsQuery, [id]);
      stats.irrigationConfigs = parseInt(irrigationConfigsResult.rows[0].count);

      // Contar activaciones de bomba
      const pumpActivationsQuery = `
        SELECT COUNT(*) as count FROM pump_activations pa
        JOIN irrigation_configs ic ON pa.irrigation_config_id = ic.id
        WHERE ic.user_id = $1
      `;
      const pumpActivationsResult = await pool.query(pumpActivationsQuery, [id]);
      stats.pumpActivations = parseInt(pumpActivationsResult.rows[0].count);

      // Contar lecturas de sensores
      const sensorReadingsQuery = `
        SELECT COUNT(*) as count FROM sensor_readings sr
        JOIN devices d ON sr.device_id = d.id
        WHERE d.user_id = $1
      `;
      const sensorReadingsResult = await pool.query(sensorReadingsQuery, [id]);
      stats.sensorReadings = parseInt(sensorReadingsResult.rows[0].count);

      // Si hay datos relacionados, requerir confirmación
      const totalRelatedData = stats.crops + stats.devices + stats.alerts + 
                              stats.irrigationConfigs + stats.pumpActivations + stats.sensorReadings;

      if (totalRelatedData > 0) {
        return res.status(409).json({
          success: false,
          message: 'El usuario tiene datos relacionados que también serán eliminados',
          requiresConfirmation: true,
          user: existingUser.toJSON(),
          stats,
          totalRelatedData
        });
      }
    }

    // Proceder con la eliminación
    const query = 'DELETE FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      message: force 
        ? 'Usuario y todos sus datos relacionados eliminados exitosamente'
        : 'Usuario eliminado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar usuario',
      error: error.message
    });
  }
};

// Eliminar cuenta propia (para usuarios normales)
const deleteOwnAccount = async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.user.id;

    // Verificar si el usuario existe
    const existingUser = await findUserById(userId);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar contraseña
    const isPasswordValid = await existingUser.checkPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Contraseña incorrecta'
      });
    }

    // Obtener estadísticas para mostrar al usuario
    const stats = {};

    // Contar cultivos
    const cropsQuery = 'SELECT COUNT(*) as count FROM crops WHERE user_id = $1';
    const cropsResult = await pool.query(cropsQuery, [userId]);
    stats.crops = parseInt(cropsResult.rows[0].count);

    // Contar dispositivos
    const devicesQuery = 'SELECT COUNT(*) as count FROM devices WHERE user_id = $1';
    const devicesResult = await pool.query(devicesQuery, [userId]);
    stats.devices = parseInt(devicesResult.rows[0].count);

    // Contar alertas
    const alertsQuery = 'SELECT COUNT(*) as count FROM alerts WHERE user_id = $1';
    const alertsResult = await pool.query(alertsQuery, [userId]);
    stats.alerts = parseInt(alertsResult.rows[0].count);

    // Contar configuraciones de riego
    const irrigationConfigsQuery = 'SELECT COUNT(*) as count FROM irrigation_configs WHERE user_id = $1';
    const irrigationConfigsResult = await pool.query(irrigationConfigsQuery, [userId]);
    stats.irrigationConfigs = parseInt(irrigationConfigsResult.rows[0].count);

    // Contar activaciones de bomba
    const pumpActivationsQuery = `
      SELECT COUNT(*) as count FROM pump_activations pa
      JOIN irrigation_configs ic ON pa.irrigation_config_id = ic.id
      WHERE ic.user_id = $1
    `;
    const pumpActivationsResult = await pool.query(pumpActivationsQuery, [userId]);
    stats.pumpActivations = parseInt(pumpActivationsResult.rows[0].count);

    // Contar lecturas de sensores
    const sensorReadingsQuery = `
      SELECT COUNT(*) as count FROM sensor_readings sr
      JOIN devices d ON sr.device_id = d.id
      WHERE d.user_id = $1
    `;
    const sensorReadingsResult = await pool.query(sensorReadingsQuery, [userId]);
    stats.sensorReadings = parseInt(sensorReadingsResult.rows[0].count);

    // Proceder con la eliminación
    const query = 'DELETE FROM users WHERE id = $1';
    const result = await pool.query(query, [userId]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Cuenta eliminada exitosamente',
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar cuenta',
      error: error.message
    });
  }
};



// Obtener perfil del usuario actual
const getCurrentUserProfile = async (req, res) => {
  try {
    // Asumiendo que el ID del usuario viene del middleware de autenticación
    const userId = req.user?.id || req.params.id;
    
    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      data: user.toJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener perfil',
      error: error.message
    });
  }
};

export {
  createUser,
  getUserById,
  getUserByEmail,
  getAllUsers,
  updateUser,
  deleteUser,
  deleteOwnAccount,
  getCurrentUserProfile
};
