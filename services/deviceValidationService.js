import { pool } from '../config/db.js'

class DeviceValidationService {
  // Validar dispositivo TTN contra la base de datos
  static async validateTTNDevice(endDeviceIds) {
    try {
      const { device_id, application_ids, dev_eui } = endDeviceIds
      const { application_id } = application_ids || {}
      
      console.log('🔍 Validando dispositivo TTN:', {
        device_id,
        application_id,
        dev_eui
      })
      
      // Query para buscar dispositivo que coincida con las credenciales
      const query = `
        SELECT id, device_name, enddevice_id, ttn_app_id, dev_eui, is_active_communication
        FROM devices 
        WHERE enddevice_id = $1 
        AND ttn_app_id = $2 
        AND dev_eui = $3
        AND is_active_communication = true
        LIMIT 1
      `
      
      const values = [device_id, application_id, dev_eui]
      const result = await pool.query(query, values)
      
      if (result.rows.length === 0) {
        console.log('❌ Dispositivo no encontrado o no autorizado:', {
          device_id,
          application_id,
          dev_eui
        })
        return {
          isValid: false,
          message: 'Dispositivo no encontrado o no autorizado',
          device: null
        }
      }
      
      const device = result.rows[0]
      console.log('✅ Dispositivo validado correctamente:', {
        id: device.id,
        device_name: device.device_name,
        enddevice_id: device.enddevice_id
      })
      
      return {
        isValid: true,
        message: 'Dispositivo autorizado',
        device: device
      }
      
    } catch (error) {
      console.error('❌ Error validando dispositivo:', error)
      return {
        isValid: false,
        message: 'Error en validación del dispositivo',
        device: null,
        error: error.message
      }
    }
  }
  
  // Obtener dispositivo por credenciales TTN
  static async getDeviceByTTNCredentials(endDeviceIds) {
    const validation = await this.validateTTNDevice(endDeviceIds)
    return validation
  }
  
  // Verificar si un dispositivo está activo
  static async isDeviceActive(deviceId) {
    try {
      const query = `
        SELECT is_active_communication 
        FROM devices 
        WHERE id = $1
      `
      const result = await pool.query(query, [deviceId])
      
      if (result.rows.length === 0) {
        return false
      }
      
      return result.rows[0].is_active_communication === true
      
    } catch (error) {
      console.error('❌ Error verificando estado del dispositivo:', error)
      return false
    }
  }
}

export default DeviceValidationService 