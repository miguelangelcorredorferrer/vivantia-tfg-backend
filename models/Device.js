class Device {
  constructor(data = {}) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.device_name = data.device_name;
    this.enddevice_id = data.enddevice_id;
    this.app_eui = data.app_eui;
    this.dev_eui = data.dev_eui;
    this.app_key = data.app_key;
    this.is_active_communication = data.is_active_communication || false;
    this.ttn_region = data.ttn_region;
    this.ttn_app_id = data.ttn_app_id;
    this.ttn_access_key = data.ttn_access_key;
    this.created_at = data.created_at;
  }

  // Verificar si el dispositivo está activo
  isActive() {
    return this.is_active_communication;
  }

  // Obtener estado del dispositivo
  getStatus() {
    return this.is_active_communication ? 'Activo' : 'Inactivo';
  }

  // Obtener color de estado para UI
  getStatusColor() {
    return this.is_active_communication ? '#16a34a' : '#dc2626';
  }

  // Obtener información de conectividad
  getConnectivityInfo() {
    return {
      enddevice_id: this.enddevice_id,
      app_eui: this.app_eui,
      dev_eui: this.dev_eui,
      status: this.getStatus()
    };
  }

  // Obtener URL de la API TTN
  getTTNApiUrl() {
    if (!this.hasTTNConfig()) return null;
    return `https://${this.ttn_region}.cloud.thethings.network/api/v3/as/applications/${this.ttn_app_id}/devices/${this.dev_eui}/down/push`;
  }
}

export default Device; 