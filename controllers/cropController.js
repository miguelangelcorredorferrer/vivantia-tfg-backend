import { pool } from '../config/db.js';
import Crop from '../models/Crop.js';
import { handleNotFoundError, handleBadRequestError, handleInternalServerError, handleSuccessResponse } from '../utils/index.js';
import {
  createCropAddedAlert, 
  createCropEditedAlert, 
  createCropDeletedAlert, 
  createCropSelectedAlert, 
  createCropDeselectedAlert 
} from '../services/cropAlertService.js';

// Crear un nuevo cultivo
const createCrop = async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      user_id, name, description, image, category, growth_days,
      soil_humidity_min, soil_humidity_max, air_humidity_min, air_humidity_max,
      temperature_max, session, selected = false
    } = req.body;

    // Determinar el user_id: si se proporciona en el body (admin) o usar el usuario autenticado (usuario normal)
    const finalUserId = user_id || req.user.id;

    // Debug: Log de los datos recibidos
    console.log('🔍 createCrop - Datos recibidos:', {
      soil_humidity_min, soil_humidity_max, 
      air_humidity_min, air_humidity_max,
      temperature_max, growth_days, selected
    });

    // Validar campos obligatorios
    if (!name) {
      return handleBadRequestError('Nombre del cultivo es obligatorio', res);
    }

    await client.query('BEGIN');

    // Si el cultivo se marca como seleccionado, deseleccionar otros del mismo usuario
    if (selected) {
      await client.query('UPDATE crops SET selected = false WHERE user_id = $1', [finalUserId]);
    }

    const query = `
      INSERT INTO crops (
        user_id, name, description, image, category, growth_days,
        soil_humidity_min, soil_humidity_max, air_humidity_min, air_humidity_max,
        temperature_max, session, selected
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
    
    const cleanValues = [
      finalUserId,
      name,
      description || null,
      image || null,
      category || null,
      growth_days !== undefined && growth_days !== '' ? growth_days : null,
      soil_humidity_min !== undefined && soil_humidity_min !== '' ? soil_humidity_min : null,
      soil_humidity_max !== undefined && soil_humidity_max !== '' ? soil_humidity_max : null,
      air_humidity_min !== undefined && air_humidity_min !== '' ? air_humidity_min : null,
      air_humidity_max !== undefined && air_humidity_max !== '' ? air_humidity_max : null,
      temperature_max !== undefined && temperature_max !== '' ? temperature_max : null,
      session || null,
      selected
    ];
    
    const result = await client.query(query, cleanValues);
    await client.query('COMMIT');
    
    const crop = new Crop(result.rows[0]);

    // Crear alerta de cultivo agregado
    try {
      await createCropAddedAlert(finalUserId, crop.name);
    } catch (alertError) {
      console.warn('Error al crear alerta de cultivo agregado:', alertError.message);
    }

    return handleSuccessResponse(res, crop, 'Cultivo creado exitosamente', 201);
  } catch (error) {
    await client.query('ROLLBACK');
    return handleInternalServerError('Error al crear cultivo', res, error);
  } finally {
    client.release();
  }
};

// Buscar cultivo por ID
const findCropById = async (id) => {
  try {
    const query = 'SELECT * FROM crops WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return new Crop(result.rows[0]);
  } catch (error) {
    throw new Error(`Error al buscar cultivo: ${error.message}`);
  }
};

// Obtener cultivo por ID (para API)
const getCropById = async (req, res) => {
  try {
    const { id } = req.params;
    const crop = await findCropById(id);

    if (!crop) {
      return handleNotFoundError('Cultivo no encontrado', res);
    }

    return handleSuccessResponse(res, crop, 'Cultivo obtenido exitosamente');
  } catch (error) {
    return handleInternalServerError('Error al obtener cultivo', res, error);
  }
};

// Buscar cultivo por usuario
const findCropByUserId = async (user_id) => {
  try {
    const query = 'SELECT * FROM crops WHERE user_id = $1';
    const result = await pool.query(query, [user_id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return new Crop(result.rows[0]);
  } catch (error) {
    throw new Error(`Error al buscar cultivo del usuario: ${error.message}`);
  }
};

// Obtener cultivo por usuario (para API)
const getCropByUserId = async (req, res) => {
  try {
    const { user_id } = req.params;
    const authenticatedUser = req.user;

    // Verificar que el usuario autenticado está accediendo a su propio cultivo
    if (authenticatedUser.id !== parseInt(user_id)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a este cultivo'
      });
    }

    const crop = await findCropByUserId(user_id);

    if (!crop) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró cultivo para este usuario'
      });
    }

    res.status(200).json({
      success: true,
      data: crop
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener cultivo del usuario',
      error: error.message
    });
  }
};

// Obtener todos los cultivos de un usuario específico
const getAllCropsByUserId = async (req, res) => {
  try {
    const { user_id } = req.params;
    const authenticatedUser = req.user;

    // Verificar que el usuario autenticado está accediendo a sus propios cultivos
    if (authenticatedUser.id !== parseInt(user_id)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a estos cultivos'
      });
    }

    const query = 'SELECT * FROM crops WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [user_id]);
    
    const crops = result.rows.map(row => new Crop(row));

    res.status(200).json({
      success: true,
      count: crops.length,
      data: crops
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener cultivos del usuario',
      error: error.message
    });
  }
};



// Obtener todos los cultivos (mantener para compatibilidad)
const getAllCrops = async (req, res) => {
  try {
    // Si hay usuario autenticado y no es admin, devolver solo sus cultivos
    if (req.user && req.user.role !== 'admin') {
      const query = 'SELECT * FROM crops WHERE user_id = $1 ORDER BY created_at DESC';
      const result = await pool.query(query, [req.user.id]);
      const crops = result.rows.map(r => new Crop(r));

      return res.status(200).json({
        success: true,
        count: crops.length,
        data: crops
      });
    }

    // Admin o petición sin autenticación → todos los cultivos
    const query = 'SELECT * FROM crops ORDER BY created_at DESC';
    const result = await pool.query(query);
    const crops = result.rows.map(r => new Crop(r));

    res.status(200).json({
      success: true,
      count: crops.length,
      data: crops
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener cultivos',
      error: error.message
    });
  }
};

// Obtener todos los cultivos con información de usuario (para admin)
const getAllCropsWithUsers = async (req, res) => {
  try {
    const query = `
      SELECT c.*, u.name as user_name, u.email as user_email
      FROM crops c
      LEFT JOIN users u ON c.user_id = u.id
      ORDER BY c.created_at DESC
    `;
    const result = await pool.query(query);
    
    const crops = result.rows.map(row => {
      const crop = new Crop(row);
      // Agregar información del usuario
      crop.user = {
        id: crop.user_id,
        name: row.user_name || 'Usuario eliminado',
        email: row.user_email || 'N/A'
      };
      return crop;
    });

    res.status(200).json({
      success: true,
      count: crops.length,
      data: crops
    });
  } catch (error) {
    console.error('Error al obtener cultivos con usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener cultivos con información de usuarios',
      error: error.message
    });
  }
};

// Buscar cultivo seleccionado por usuario
const getSelectedCropByUserId = async (req, res) => {
  try {
    const { user_id } = req.params;
    const authenticatedUser = req.user;

    // Verificar que el usuario autenticado está accediendo a su propio cultivo
    if (authenticatedUser.id !== parseInt(user_id)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a este cultivo'
      });
    }

    const query = 'SELECT * FROM crops WHERE user_id = $1 AND selected = true';
    const result = await pool.query(query, [user_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No hay cultivo seleccionado para este usuario'
      });
    }
    
    const crop = new Crop(result.rows[0]);

    res.status(200).json({
      success: true,
      data: crop
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al buscar cultivo seleccionado',
      error: error.message
    });
  }
};

// Actualizar cultivo
const updateCrop = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const authenticatedUser = req.user;

    // Verificar si el cultivo existe
    const existingCrop = await findCropById(id);
    if (!existingCrop) {
      return res.status(404).json({
        success: false,
        message: 'Cultivo no encontrado'
      });
    }

    // Verificar que el usuario autenticado es el propietario del cultivo O es administrador
    if (existingCrop.user_id !== authenticatedUser.id && authenticatedUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para actualizar este cultivo'
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
      UPDATE crops 
      SET ${fields.join(', ')}
      WHERE id = $${counter}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cultivo no encontrado'
      });
    }
    
    const updatedCrop = new Crop(result.rows[0]);

    // Crear alerta de cultivo editado
    try {
      await createCropEditedAlert(updatedCrop.user_id, updatedCrop.name);
    } catch (alertError) {
      console.warn('Error al crear alerta de cultivo editado:', alertError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Cultivo actualizado exitosamente',
      data: updatedCrop
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar cultivo',
      error: error.message
    });
  }
};

// Seleccionar cultivo (deseleccionar otros del mismo usuario)
const selectCrop = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const authenticatedUser = req.user;

    // Verificar si el cultivo existe
    const existingCrop = await findCropById(id);
    if (!existingCrop) {
      return res.status(404).json({
        success: false,
        message: 'Cultivo no encontrado'
      });
    }

    // Verificar que el usuario autenticado es el propietario del cultivo O es administrador
    if (existingCrop.user_id !== authenticatedUser.id && authenticatedUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para seleccionar este cultivo'
      });
    }

    await client.query('BEGIN');

    // Deseleccionar todos los cultivos del usuario
    await client.query(
      'UPDATE crops SET selected = false WHERE user_id = $1',
      [existingCrop.user_id]
    );

    // Seleccionar este cultivo
    const result = await client.query(
      'UPDATE crops SET selected = true WHERE id = $1 RETURNING *',
      [id]
    );

    await client.query('COMMIT');
    
    const selectedCrop = new Crop(result.rows[0]);

    // Crear alerta de cultivo seleccionado
    try {
      await createCropSelectedAlert(authenticatedUser.id, selectedCrop.name);
    } catch (alertError) {
      console.warn('Error al crear alerta de cultivo seleccionado:', alertError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Cultivo seleccionado exitosamente',
      data: selectedCrop
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({
      success: false,
      message: 'Error al seleccionar cultivo',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// Deseleccionar cultivo
const deselectCrop = async (req, res) => {
  try {
    const { id } = req.params;
    const authenticatedUser = req.user;

    // Verificar si el cultivo existe y pertenece al usuario
    const existingCrop = await findCropById(id);
    if (!existingCrop) {
      return res.status(404).json({
        success: false,
        message: 'Cultivo no encontrado'
      });
    }

    // Verificar que el usuario autenticado es el propietario del cultivo O es administrador
    if (existingCrop.user_id !== authenticatedUser.id && authenticatedUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para deseleccionar este cultivo'
      });
    }

    const query = 'UPDATE crops SET selected = false WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cultivo no encontrado'
      });
    }
    
    const deselectedCrop = new Crop(result.rows[0]);

    // Crear alerta de cultivo deseleccionado
    try {
      await createCropDeselectedAlert(authenticatedUser.id, deselectedCrop.name);
    } catch (alertError) {
      console.warn('Error al crear alerta de cultivo deseleccionado:', alertError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Cultivo deseleccionado exitosamente',
      data: deselectedCrop
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al deseleccionar cultivo',
      error: error.message
    });
  }
};

// Eliminar cultivo
const deleteCrop = async (req, res) => {
  try {
    const { id } = req.params;
    const authenticatedUser = req.user;

    // Verificar si el cultivo existe
    const existingCrop = await findCropById(id);
    if (!existingCrop) {
      return res.status(404).json({
        success: false,
        message: 'Cultivo no encontrado'
      });
    }

    // Verificar que el usuario autenticado es el propietario del cultivo O es administrador
    if (existingCrop.user_id !== authenticatedUser.id && authenticatedUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para eliminar este cultivo'
      });
    }

    const query = 'DELETE FROM crops WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cultivo no encontrado'
      });
    }

    // Crear alerta de cultivo eliminado
    try {
      await createCropDeletedAlert(existingCrop.user_id, existingCrop.name);
    } catch (alertError) {
      console.warn('Error al crear alerta de cultivo eliminado:', alertError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Cultivo eliminado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar cultivo',
      error: error.message
    });
  }
};

// Obtener todas las categorías únicas de cultivos
const getCropCategories = async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT category 
      FROM crops 
      WHERE category IS NOT NULL AND category != ''
      ORDER BY category ASC
    `;
    const result = await pool.query(query);
    
    const categories = result.rows.map(row => row.category);

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener categorías de cultivos',
      error: error.message
    });
  }
};


export {
  createCrop,
  findCropById,
  getCropById,
  findCropByUserId,
  getCropByUserId,
  getAllCropsByUserId,
  getAllCrops,
  getAllCropsWithUsers,
  getSelectedCropByUserId,
  getCropCategories,
  updateCrop,
  selectCrop,
  deselectCrop,
  deleteCrop
};
