import { pool } from '../config/db.js';
import https from 'https';

// Obtiene el dispositivo activo (is_active_communication=true) del usuario dueño de la config
async function getActiveDeviceForConfig(irrigationConfigId) {
  const query = `
    SELECT d.*
    FROM irrigation_configs ic
    JOIN devices d ON d.user_id = ic.user_id
    WHERE ic.id = $1 AND d.is_active_communication = TRUE
    ORDER BY d.created_at DESC
    LIMIT 1
  `;
  const result = await pool.query(query, [irrigationConfigId]);
  const row = result.rows[0];
  if (!row) return null;
  console.log('[TTN] Dispositivo activo seleccionado:', {
    id: row.id,
    enddevice_id: row.enddevice_id,
    dev_eui: row.dev_eui,
    ttn_app_id: row.ttn_app_id,
    ttn_region: row.ttn_region
  });
  return row;
}

// Enviar comando a TTN usando credenciales almacenadas en la tabla devices
export async function sendDownlinkForConfig(irrigationConfigId, command, port = 3) {
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
    keyLen: cleanedKey.length,
    keyStartsNNSXS: cleanedKey.startsWith('NNSXS')
  });
  const byte = command === 'ON' ? 1 : 0;
  const payload = {
    downlinks: [
      {
        f_port: port,
        frm_payload: Buffer.from([byte]).toString('base64'), // e.g., AQ== for 0x01
        priority: 'NORMAL',
        confirmed: true,
      },
    ],
  };

  // Preferir fetch si existe (Node 18+), si no, usar https.request
  if (typeof fetch === 'function') {
    console.log(`[TTN] Enviando ${command} a ${enddevice_id} vía fetch`);
    const response = await fetch(TTN_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cleanedKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text().catch(() => '');
    if (!response.ok) {
      throw new Error(`TTN API ${response.status}: ${text}`);
    }
    try { return JSON.parse(text); } catch { return { ok: true }; }
  } else {
    console.log(`[TTN] Enviando ${command} a ${enddevice_id} vía https.request`);
    const url = new URL(TTN_API_URL);
    const data = JSON.stringify(payload);
    const options = {
      method: 'POST',
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        'Authorization': `Bearer ${cleanedKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const result = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try { resolve(JSON.parse(body)); } catch { resolve({ ok: true }); }
          } else {
            reject(new Error(`TTN API ${res.statusCode}: ${body}`));
          }
        });
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });
    return result;
  }
}

// Enviar downlink usando variables de entorno (prioritario para pruebas)
// Sin uso de variables de entorno: siempre via credenciales de BD

// Endpoints para pruebas indicando irrigation_config_id en el body
export const sendOnCommand = async (req, res) => {
  try {
    const { irrigation_config_id } = req.body;
    await sendDownlinkForConfig(irrigation_config_id, 'ON');
    return res.json({ success: true, message: 'Comando ON enviado' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const sendOffCommand = async (req, res) => {
  try {
    const { irrigation_config_id } = req.body;
    await sendDownlinkForConfig(irrigation_config_id, 'OFF');
    return res.json({ success: true, message: 'Comando OFF enviado' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};


