import { pool } from '../config/db.js';
import Alert from '../models/Alert.js';

/**
 * Servicio para manejar alertas ambientales (temperatura y humedad)
 */

// Función auxiliar para crear alertas ambientales
const createEnvironmentalAlert = async (user_id, alert_subtype, title, message, severity = 'warning') => {
  try {
    const query = `
      INSERT INTO alerts (user_id, alert_type, alert_subtype, severity, title, message, is_resolved)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [user_id, 'environmental', alert_subtype, severity, title, message, false];
    const result = await pool.query(query, values);
    
    return new Alert(result.rows[0]);
  } catch (error) {
    console.error(`Error creando alerta ambiental (${alert_subtype}):`, error.message);
    throw error;
  }
};

// Crear alerta de temperatura máxima excedida
export const createTemperatureMaxThresholdAlert = async (user_id, temperature, maxTemp, cropName = 'tu cultivo') => {
  const title = '🌡️ Temperatura máxima excedida';
  const message = `La temperatura actual (${temperature}°C) ha superado el límite máximo recomendado (${maxTemp}°C) para ${cropName}. Considera tomar medidas para proteger tu cultivo.`;
  
  return await createEnvironmentalAlert(user_id, 'temperature_max_threshold', title, message, 'warning');
};

// ==== ALERTAS DE HUMEDAD DEL SUELO ====
export const createSoilHumidityMinThresholdAlert = async (user_id, humidity, minHumidity, cropName = 'tu cultivo') => {
  const title = '💧 Humedad del suelo baja';
  const message = `La humedad del suelo actual (${humidity}%) está por debajo del mínimo recomendado (${minHumidity}%) para ${cropName}. Es recomendable iniciar el riego.`;

  return await createEnvironmentalAlert(user_id, 'soil_humidity_min_threshold', title, message, 'warning');
};

export const createSoilHumidityMaxThresholdAlert = async (user_id, humidity, maxHumidity, cropName = 'tu cultivo') => {
  const title = '💧 Humedad del suelo alta';
  const message = `La humedad del suelo actual (${humidity}%) ha superado el máximo recomendado (${maxHumidity}%) para ${cropName}. Considera pausar el riego o mejorar el drenaje.`;

  return await createEnvironmentalAlert(user_id, 'soil_humidity_max_threshold', title, message, 'warning');
};

// ==== ALERTAS DE HUMEDAD AMBIENTAL ====
export const createAirHumidityMinThresholdAlert = async (user_id, humidity, minHumidity, cropName = 'tu cultivo') => {
  const title = '💧 Humedad ambiental baja';
  const message = `La humedad ambiental actual (${humidity}%) está por debajo del mínimo recomendado (${minHumidity}%) para ${cropName}. Considera aumentar la humedad relativa.`;

  return await createEnvironmentalAlert(user_id, 'air_humidity_min_threshold', title, message, 'warning');
};

export const createAirHumidityMaxThresholdAlert = async (user_id, humidity, maxHumidity, cropName = 'tu cultivo') => {
  const title = '💧 Humedad ambiental alta';
  const message = `La humedad ambiental actual (${humidity}%) ha superado el máximo recomendado (${maxHumidity}%) para ${cropName}. Considera mejorar la ventilación.`;

  return await createEnvironmentalAlert(user_id, 'air_humidity_max_threshold', title, message, 'warning');
};
