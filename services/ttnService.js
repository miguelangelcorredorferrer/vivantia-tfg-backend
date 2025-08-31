import { pool } from '../config/db.js';

/**
 * Servicio para operaciones de The Things Network (TTN)
 * Maneja el envío de downlinks y la comunicación con dispositivos IoT
 */

// Obtener dispositivo activo para una configuración de riego
const getActiveDeviceForConfig = async (irrigationConfigId) => {
  try {
    const query = `
      SELECT d.*, u.id as user_id
      FROM irrigation_configs ic
      JOIN users u ON ic.user_id = u.id
      JOIN devices d ON u.id = d.user_id
      WHERE ic.id = $1 AND d.is_active_communication = true
      LIMIT 1
    `;
    
    const result = await pool.query(query, [irrigationConfigId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('[TTN] Error obteniendo dispositivo activo:', error);
    throw new Error(`Error al obtener dispositivo activo: ${error.message}`);
  }
};

// Cache para evitar envíos duplicados de OFF
const offCommandCache = new Map();

// Enviar comando downlink a TTN
export const sendDownlinkForConfig = async (irrigationConfigId, command, port = 3) => {
  const device = await getActiveDeviceForConfig(irrigationConfigId);
  if (!device) {
    console.error('[TTN] No se encontró dispositivo activo para irrigation_config_id:', irrigationConfigId);
    throw new Error('No hay dispositivo activo con comunicación habilitada para esta configuración');
  }

  let { ttn_region, ttn_app_id, ttn_access_key, dev_eui, enddevice_id } = device;
  if (!ttn_region || !ttn_app_id || !ttn_access_key || !enddevice_id) {
    console.error('[TTN] Credenciales incompletas en dispositivo activo:', { enddevice_id, dev_eui, ttn_region, ttn_app_id, hasKey: !!ttn_access_key });
    throw new Error('El dispositivo activo no tiene credenciales TTN completas (faltan ttn_region, ttn_app_id, ttn_access_key o enddevice_id)');
  }

  // Normalizar valores
  ttn_region = String(ttn_region).trim().toLowerCase();
  ttn_app_id = String(ttn_app_id).trim();
  if (dev_eui) dev_eui = String(dev_eui).trim();
  enddevice_id = String(enddevice_id).trim();
  const rawKey = String(ttn_access_key).trim();
  const cleanedKey = rawKey.replace(/^Bearer\s+/i, '').trim();

  const TTN_API_URL = `https://${ttn_region}.cloud.thethings.network/api/v3/as/applications/${ttn_app_id}/devices/${enddevice_id}/down/push`;
  console.log('[TTN][DB] Endpoint:', TTN_API_URL, {
    region: ttn_region,
    appId: ttn_app_id,
    endDeviceId: enddevice_id,
    devEui: dev_eui,
    hasKey: !!cleanedKey
  });

  // Convertir comando a valor numérico
  const commandValue = command === 'ON' ? 1 : 0;
  const payload = Buffer.from([commandValue]).toString('base64');

  const downlinkPayload = {
    downlinks: [{
      f_port: port,
      frm_payload: payload,
      priority: 'NORMAL'
    }]
  };

  // 🚨 TRACKING: Stack trace para debugging triple OFF
  const caller = new Error().stack?.split('\n')[2]?.trim() || 'unknown'
  
  // Cache para evitar envíos duplicados de OFF en 5 segundos
  if (command === 'OFF') {
    const cacheKey = `${irrigationConfigId}_OFF`;
    const now = Date.now();
    const lastSent = offCommandCache.get(cacheKey);
    
    if (lastSent && (now - lastSent) < 5000) {
      console.log('🚨 [TTN-CACHE] Ignorando OFF duplicado enviado hace', Math.round((now - lastSent) / 1000), 'segundos');
      return {
        success: true,
        command,
        device: enddevice_id,
        app: ttn_app_id,
        region: ttn_region,
        cached: true
      };
    }
    
    offCommandCache.set(cacheKey, now);
    console.log('🚨 [TTN-CACHE] OFF enviado, cache actualizado');
  }
  
  console.log('🚨 [TTN-TRACKING] Enviando downlink:', {
    command,
    commandValue,
    payload,
    f_port: port,
    to: `${ttn_app_id}/${enddevice_id}`,
    caller: caller
  });

  try {
    const response = await fetch(TTN_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cleanedKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(downlinkPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TTN][ERROR] Response status:', response.status, response.statusText);
      console.error('[TTN][ERROR] Response body:', errorText);
      throw new Error(`TTN API error ${response.status}: ${errorText}`);
    }

    console.log('[TTN][SUCCESS] Downlink enviado exitosamente para comando:', command);
    return {
      success: true,
      command,
      device: enddevice_id,
      app: ttn_app_id,
      region: ttn_region
    };
  } catch (error) {
    console.error('[TTN][FAIL] Error enviando downlink:', error);
    throw error;
  }
};

// Validar credenciales TTN
export const validateTTNCredentials = async (credentials) => {
  const { ttn_region, ttn_app_id, ttn_access_key, enddevice_id } = credentials;
  
  if (!ttn_region || !ttn_app_id || !ttn_access_key || !enddevice_id) {
    throw new Error('Todas las credenciales TTN son obligatorias');
  }

  // Normalizar valores
  const normalizedRegion = String(ttn_region).trim().toLowerCase();
  const normalizedAppId = String(ttn_app_id).trim();
  const normalizedEndDeviceId = String(enddevice_id).trim();
  const cleanedKey = String(ttn_access_key).trim().replace(/^Bearer\s+/i, '').trim();

  // Verificar formato básico
  const regionPattern = /^[a-z0-9-]+$/;
  if (!regionPattern.test(normalizedRegion)) {
    throw new Error('Formato de región TTN no válido');
  }

  return {
    ttn_region: normalizedRegion,
    ttn_app_id: normalizedAppId,
    enddevice_id: normalizedEndDeviceId,
    ttn_access_key: cleanedKey
  };
};
