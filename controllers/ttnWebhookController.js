import { createSensorReading } from '../services/sensorReadingService.js'
import DeviceValidationService from '../services/deviceValidationService.js'
import { evaluateAutomaticIrrigation } from '../services/automaticIrrigationService.js'

// Webhook TTN - Capturar datos de sensores
const handleTTNUplink = async (req, res) => {
  try {
    console.log('📥 Webhook recibido');
    console.log('📋 Payload completo:', JSON.stringify(req.body, null, 2));
    
    const payload = req.body.uplink_message?.decoded_payload;
    const endDeviceIds = req.body.end_device_ids;
    const fPort = req.body.uplink_message?.f_port;
    
    console.log('📱 End Device IDs:', JSON.stringify(endDeviceIds, null, 2));
    console.log('🔌 F_Port:', fPort);
    
    if (!payload) {
      console.error('❌ Payload inválido');
      return res.status(400).send('Datos incompletos');
    }
    
    // Validar que el uplink viene del puerto 2
    if (fPort !== 2) {
      console.log(`⏭️ Uplink ignorado - F_Port ${fPort} no es 2`);
      return res.status(200).send('Uplink ignorado - puerto no válido');
    }
    
    // Validar dispositivo TTN
    const deviceValidation = await DeviceValidationService.validateTTNDevice(endDeviceIds); //
    
    if (!deviceValidation.isValid) {
      console.error('❌ Dispositivo no autorizado:', deviceValidation.message);
      return res.status(401).send('Dispositivo no autorizado');
    }
    
    const validatedDevice = deviceValidation.device;
    console.log('✅ Dispositivo autorizado:', validatedDevice.device_name); //
    
    console.log('🔍 Payload decodificado:', JSON.stringify(payload, null, 2));
    
    // Extraer datos según nuevo formato de payload
    const {
      temperature_c,
      humidity_rh,
      soil_moisture_pct
    } = payload;

    console.log('🌡️ Datos extraídos:', {
      temperature_c,
      humidity_rh,
      soil_moisture_pct
    });

    // Convertir y asegurar números
    const finalTemperature = Number(temperature_c) || null;
    const finalAirHumidity = Number(humidity_rh) || null;
    const finalSoilHumidity = Number(soil_moisture_pct) || null;

    console.log('✅ Datos finales normalizados:', {
      temperature: finalTemperature,
      air_humidity: finalAirHumidity,
      soil_humidity: finalSoilHumidity
    });

    // Preparar datos para guardar en PostgreSQL
    const sensorData = {
      device_id: validatedDevice.id,
      air_humidity: finalAirHumidity,
      soil_humidity: finalSoilHumidity,
      temperature: finalTemperature
    };
    
    console.log('💾 Datos a guardar:', sensorData);
    
    // Usar el servicio para guardar en PostgreSQL directamente
    const savedReading = await createSensorReading(sensorData);
    console.log('💾 Dato guardado en BD:', savedReading);

    // 🤖 NUEVO: Evaluar riego automático después de guardar datos
    try {
      console.log('🤖 Iniciando evaluación de riego automático...');
      await evaluateAutomaticIrrigation(validatedDevice.id, {
        temperature: finalTemperature,
        air_humidity: finalAirHumidity,
        soil_humidity: finalSoilHumidity,
        device_id: validatedDevice.id,
        timestamp: savedReading.created_at
      });
      console.log('✅ Evaluación de riego automático completada');
    } catch (autoError) {
      console.error('❌ Error en evaluación automática (no crítico):', autoError);
      // No interrumpir el flujo principal si falla la evaluación automática
    }
    
    // Formatear datos para emitir a clientes (si usas Socket.IO)
    const newData = {
      temperature: finalTemperature,
      air_humidity: finalAirHumidity,
      soil_humidity: finalSoilHumidity,
      timestamp: savedReading.created_at,
      device_id: validatedDevice.id,
      device_name: validatedDevice.device_name
    };
    
    // TODO: Emitir evento en tiempo real (si usas Socket.IO)
    // io.emit('sensorData', newData);
    console.log('📤 Dato preparado para emitir a clientes:', newData);
    
    res.status(200).send('Datos procesados correctamente');
  } catch (error) {
    console.error('❌ Error general en webhook:', error);
    res.status(500).send('Error interno del servidor');
  }
};

export {
  handleTTNUplink
}; 