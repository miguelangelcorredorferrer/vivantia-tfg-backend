import { pool } from '../config/db.js';
import SensorReading from '../models/SensorReading.js';

/**
 * Servicio para manejar operaciones de lecturas de sensores
 * Separado del controlador para evitar dependencias circulares
 */

// Crear nueva lectura de sensor
export const createSensorReading = async (sensorData) => {
  try {
    const { device_id, air_humidity, soil_humidity, temperature } = sensorData;

    // Validar campos obligatorios
    if (!device_id || air_humidity === undefined || soil_humidity === undefined || temperature === undefined) {
      throw new Error('Device ID, humedad del aire, humedad del suelo y temperatura son obligatorios');
    }

    const query = `
      INSERT INTO sensor_readings (device_id, air_humidity, soil_humidity, temperature)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const values = [device_id, air_humidity, soil_humidity, temperature];
    
    const result = await pool.query(query, values);
    return new SensorReading(result.rows[0]);
  } catch (error) {
    throw new Error(`Error al crear lectura de sensor: ${error.message}`);
  }
};

// Buscar lectura por ID
export const findSensorReadingById = async (id) => {
  try {
    const query = 'SELECT * FROM sensor_readings WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return new SensorReading(result.rows[0]);
  } catch (error) {
    throw new Error(`Error al buscar lectura de sensor: ${error.message}`);
  }
};

// Obtener lecturas por dispositivo
export const getSensorReadingsByDevice = async (device_id, limit = 20, offset = 0) => {
  try {
    const query = `
      SELECT * FROM sensor_readings 
      WHERE device_id = $1 
      ORDER BY received_at DESC 
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(query, [device_id, parseInt(limit), parseInt(offset)]);
    return result.rows.map(row => new SensorReading(row));
  } catch (error) {
    throw new Error(`Error al obtener lecturas del dispositivo: ${error.message}`);
  }
};

// Obtener última lectura de un dispositivo
export const getLatestSensorReading = async (device_id) => {
  try {
    const query = `
      SELECT * FROM sensor_readings 
      WHERE device_id = $1 
      ORDER BY received_at DESC 
      LIMIT 1
    `;
    
    const result = await pool.query(query, [device_id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return new SensorReading(result.rows[0]);
  } catch (error) {
    throw new Error(`Error al obtener última lectura: ${error.message}`);
  }
};

// Eliminar lecturas de un dispositivo
export const deleteSensorReadingsByDevice = async (device_id) => {
  try {
    const query = 'DELETE FROM sensor_readings WHERE device_id = $1 RETURNING *';
    const result = await pool.query(query, [device_id]);
    
    return result.rows.map(row => new SensorReading(row));
  } catch (error) {
    throw new Error(`Error al eliminar lecturas del dispositivo: ${error.message}`);
  }
};
