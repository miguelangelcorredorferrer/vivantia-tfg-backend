import { pool } from '../config/db.js';
import User from '../models/User.js';

/**
 * Servicio para operaciones de usuario
 * Separado del controlador para evitar dependencias circulares
 */

// Buscar usuario por email
export const findUserByEmail = async (email) => {
  try {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return new User(result.rows[0]);
  } catch (error) {
    throw new Error(`Error al buscar usuario por email: ${error.message}`);
  }
};

// Buscar usuario por ID
export const findUserById = async (id) => {
  try {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return new User(result.rows[0]);
  } catch (error) {
    throw new Error(`Error al buscar usuario por ID: ${error.message}`);
  }
};

// Buscar usuario por token de verificación
export const findUserByVerificationToken = async (token) => {
  try {
    const query = 'SELECT * FROM users WHERE token = $1';
    const result = await pool.query(query, [token]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return new User(result.rows[0]);
  } catch (error) {
    throw new Error(`Error al buscar usuario por token: ${error.message}`);
  }
};

// Actualizar usuario
export const updateUser = async (id, updateData) => {
  try {
    // Construir dinámicamente la query de actualización
    const fields = Object.keys(updateData);
    const values = Object.values(updateData);
    
    if (fields.length === 0) {
      throw new Error('No hay datos para actualizar');
    }
    
    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    const query = `UPDATE users SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *`;
    
    const result = await pool.query(query, [...values, id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return new User(result.rows[0]);
  } catch (error) {
    throw new Error(`Error al actualizar usuario: ${error.message}`);
  }
};

// Crear usuario
export const createUser = async (userData) => {
  try {
    const { email, password, name, role = 'visitante', token, verified = false } = userData;
    
    const query = `
      INSERT INTO users (email, password, name, role, token, verified)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await pool.query(query, [email, password, name, role, token, verified]);
    return new User(result.rows[0]);
  } catch (error) {
    throw new Error(`Error al crear usuario: ${error.message}`);
  }
};

// Eliminar usuario
export const deleteUser = async (id) => {
  try {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return new User(result.rows[0]);
  } catch (error) {
    throw new Error(`Error al eliminar usuario: ${error.message}`);
  }
};
