import { pool } from '../config/db.js';
import SensorReading from '../models/SensorReading.js';
import { handleNotFoundError, handleBadRequestError, handleInternalServerError, handleSuccessResponse } from '../utils/index.js';

// Crear una nueva lectura de sensor
const createSensorReading = async (req, res) => {
  try {
    const { device_id, air_humidity, soil_humidity, temperature } = req.body;

    // Validar campos obligatorios
    if (!device_id || air_humidity === undefined || soil_humidity === undefined || temperature === undefined) {
      return handleBadRequestError('Device ID, humedad del aire, humedad del suelo y temperatura son obligatorios', res);
    }

    const query = `
      INSERT INTO sensor_readings (device_id, air_humidity, soil_humidity, temperature)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const values = [device_id, air_humidity, soil_humidity, temperature];
    
    const result = await pool.query(query, values);
    const reading = new SensorReading(result.rows[0]);

    res.status(201).json({
      success: true,
      message: 'Lectura de sensor creada exitosamente',
      data: reading
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear lectura de sensor',
      error: error.message
    });
  }
};

// Buscar lectura por ID
const findSensorReadingById = async (id) => {
  try {
    const query = 'SELECT * FROM sensor_readings WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return new SensorReading(result.rows[0]);
  } catch (error) {
    throw new Error(`Error al buscar lectura: ${error.message}`);
  }
};



// Buscar lecturas por dispositivo
const getSensorReadingsByDeviceId = async (req, res) => {
  try {
    const { device_id } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    const query = `
      SELECT * FROM sensor_readings 
      WHERE device_id = $1 
      ORDER BY received_at DESC 
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(query, [device_id, parseInt(limit), parseInt(offset)]);
    
    const readings = result.rows.map(row => new SensorReading(row));

    res.status(200).json({
      success: true,
      count: readings.length,
      data: readings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener lecturas del dispositivo',
      error: error.message
    });
  }
};

// Obtener lecturas por rango de fechas
const getSensorReadingsByDateRange = async (req, res) => {
  try {
    const { device_id } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Fecha de inicio y fin son obligatorias'
      });
    }

    const query = `
      SELECT * FROM sensor_readings 
      WHERE device_id = $1 
      AND received_at BETWEEN $2 AND $3
      ORDER BY received_at DESC
    `;
    const result = await pool.query(query, [device_id, startDate, endDate]);
    
    const readings = result.rows.map(row => new SensorReading(row));

    res.status(200).json({
      success: true,
      count: readings.length,
      data: readings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener lecturas por rango de fechas',
      error: error.message
    });
  }
};

// Obtener última lectura de un dispositivo
const getLatestSensorReadingByDeviceId = async (req, res) => {
  try {
    const { device_id } = req.params;

    const query = `
      SELECT * FROM sensor_readings 
      WHERE device_id = $1 
      ORDER BY received_at DESC 
      LIMIT 1
    `;
    const result = await pool.query(query, [device_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron lecturas para este dispositivo'
      });
    }
    
    const reading = new SensorReading(result.rows[0]);

    res.status(200).json({
      success: true,
      data: reading
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener última lectura',
      error: error.message
    });
  }
};


// Obtener lecturas que excedan umbrales
const getSensorReadingsOutOfThreshold = async (req, res) => {
  try {
    const { device_id } = req.params;
    const { minHumidity, maxHumidity, maxTemperature, hours = 24 } = req.query;

    if (!minHumidity || !maxHumidity || !maxTemperature) {
      return res.status(400).json({
        success: false,
        message: 'Umbrales de humedad mínima, máxima y temperatura máxima son obligatorios'
      });
    }

    const query = `
      SELECT * FROM sensor_readings 
      WHERE device_id = $1 
      AND received_at >= NOW() - INTERVAL '${parseInt(hours)} hours'
      AND (
        humidity < $2 OR 
        humidity > $3 OR 
        temperature > $4
      )
      ORDER BY received_at DESC
    `;
    const result = await pool.query(query, [device_id, minHumidity, maxHumidity, maxTemperature]);
    
    const readings = result.rows.map(row => new SensorReading(row));

    res.status(200).json({
      success: true,
      count: readings.length,
      data: readings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al buscar lecturas fuera de umbral',
      error: error.message
    });
  }
};



// Eliminar una lectura específica
const deleteSensorReading = async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM sensor_readings WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Lectura no encontrada'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Lectura eliminada exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar lectura',
      error: error.message
    });
  }
};







// Obtener último dato de sensor del dispositivo activo del usuario
const getLatestSensorReadingForActiveDevice = async (req, res) => {
  try {
    const { user_id } = req.params;

    // Buscar el dispositivo activo del usuario
    const deviceQuery = `
      SELECT id, device_name FROM devices 
      WHERE user_id = $1 AND is_active_communication = true 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    const deviceResult = await pool.query(deviceQuery, [user_id]);
    
    console.log('🔍 Buscando dispositivo activo para usuario:', user_id)
    console.log('🔍 Resultado de búsqueda de dispositivo:', deviceResult.rows.length, 'dispositivos encontrados')
    
    if (deviceResult.rows.length === 0) {
      console.log('❌ No se encontró dispositivo activo para el usuario:', user_id)
      return res.status(404).json({
        success: false,
        message: 'No se encontró dispositivo activo para este usuario'
      });
    }
    
    const activeDevice = deviceResult.rows[0];
    console.log('✅ Dispositivo activo encontrado:', activeDevice)

    // Obtener el último dato de sensor del dispositivo activo
    const sensorQuery = `
      SELECT * FROM sensor_readings 
      WHERE device_id = $1 
      ORDER BY received_at DESC 
      LIMIT 1
    `;
    const sensorResult = await pool.query(sensorQuery, [activeDevice.id]);
    
    if (sensorResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron lecturas para el dispositivo activo'
      });
    }
    
    const reading = new SensorReading(sensorResult.rows[0]);

    // Obtener el dato anterior para calcular tendencias
    const previousQuery = `
      SELECT * FROM sensor_readings 
      WHERE device_id = $1 
      ORDER BY received_at DESC 
      LIMIT 1 OFFSET 1
    `;
    const previousResult = await pool.query(previousQuery, [activeDevice.id]);
    
    let temperatureChange = 0;
    let humidityChange = 0;
    
    if (previousResult.rows.length > 0) {
      const previousReading = previousResult.rows[0];
      
      if (previousReading.temperature !== null && reading.temperature !== null) {
        temperatureChange = reading.temperature - previousReading.temperature;
      }
      
      if (previousReading.humidity !== null && reading.humidity !== null) {
        humidityChange = reading.humidity - previousReading.humidity;
      }
    }

    const responseData = {
      ...reading,
      device: {
        id: activeDevice.id,
        name: activeDevice.device_name
      },
      trends: {
        temperature: {
          value: temperatureChange,
          direction: temperatureChange > 0 ? 'up' : temperatureChange < 0 ? 'down' : 'stable',
          formatted: `${temperatureChange > 0 ? '+' : ''}${temperatureChange.toFixed(1)}°C`
        },
        humidity: {
          value: humidityChange,
          direction: humidityChange > 0 ? 'up' : humidityChange < 0 ? 'down' : 'stable',
          formatted: `${humidityChange > 0 ? '+' : ''}${humidityChange.toFixed(1)}%`
        }
      }
    };

    res.status(200).json({
      success: true,
      message: 'Último dato del dispositivo activo obtenido exitosamente',
      data: responseData
    });
  } catch (error) {
    console.error('❌ Error al obtener último dato del dispositivo activo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener último dato del dispositivo activo',
      error: error.message
    });
  }
};

// Ya no necesitamos simular el tiempo aquí, se maneja en el composable

export {
  createSensorReading,
  findSensorReadingById,
  getSensorReadingsByDeviceId,
  getSensorReadingsByDateRange,
  getLatestSensorReadingByDeviceId,
  getSensorReadingsOutOfThreshold,
  deleteSensorReading,
  getLatestSensorReadingForActiveDevice
};
