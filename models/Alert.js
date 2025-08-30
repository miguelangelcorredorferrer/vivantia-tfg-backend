import { formatDateToSpanish, getTimeAgo } from '../utils/index.js';

class Alert {
  constructor(data = {}) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.alert_type = data.alert_type; // 'user', 'environmental', 'device', 'crop', 'irrigation'
    this.alert_subtype = data.alert_subtype;
    this.severity = data.severity || 'info'; // 'info', 'success', 'warning', 'error'
    this.title = data.title;
    this.message = data.message;
    this.is_resolved = data.is_resolved || false;
    this.created_at = data.created_at;
  }

  // Verificar si la alerta es crítica
  isCritical() {
    return this.severity === 'error';
  }

  // Verificar si la alerta es de advertencia
  isWarning() {
    return this.severity === 'warning';
  }

  // Verificar si la alerta está resuelta
  isResolved() {
    return this.is_resolved;
  }

  // Obtener color según la severidad
  getSeverityColor() {
    const colorMap = {
      'info': '#3b82f6',
      'success': '#10b981',
      'warning': '#f59e0b',
      'error': '#ef4444'
    };
    return colorMap[this.severity] || '#6b7280';
  }

  // Formatear fecha de creación
  getFormattedCreatedAt() {
    return formatDateToSpanish(this.created_at);
  }

  // Obtener tiempo transcurrido desde la creación
  getTimeAgo() {
    return getTimeAgo(this.created_at);
  }

  // Obtener descripción corta para notificaciones
  getShortDescription() {
    return this.message.length > 50 
      ? this.message.substring(0, 50) + '...'
      : this.message;
  }

  // Formatear tipo de alerta en español
  getFormattedType() {
    const typeMap = {
      'user': 'Usuario',
      'environmental': 'Ambiental',
      'device': 'Dispositivo',
      'crop': 'Cultivo',
      'irrigation': 'Riego'
    };
    return typeMap[this.alert_type] || this.alert_type;
  }

  // Formatear subtipo de alerta en español
  getFormattedSubtype() {
    const subtypeMap = {
      // User/Auth alerts
      'user_registered': 'Usuario registrado',
      'user_logged_in': 'Sesión iniciada',
      'username_changed': 'Nombre cambiado',
      'password_changed': 'Contraseña cambiada',
      'account_verified': 'Cuenta verificada',
      'password_reset_requested': 'Restablecimiento solicitado',
      'password_reset_completed': 'Contraseña restablecida',
      'session_closed': 'Sesión cerrada',
      
      // Environmental alerts
      'temperature_max_threshold': 'Temperatura máxima',
      'humidity_min_threshold': 'Humedad mínima',
      'humidity_max_threshold': 'Humedad máxima',
      
      // Device alerts
      'device_added': 'Dispositivo agregado',
      'api_key_copied': 'Clave API copiada',
      'device_offline': 'Dispositivo desconectado',
      'device_online': 'Dispositivo conectado',
      'device_deleted': 'Dispositivo eliminado',
      'device_edited': 'Dispositivo editado',
      
      // Crop alerts
      'crop_selected': 'Cultivo seleccionado',
      'crop_deselected': 'Cultivo deseleccionado',
      'crop_edited': 'Cultivo editado',
      'crop_deleted': 'Cultivo eliminado',
      'crop_added': 'Cultivo agregado',
      
      // Irrigation alerts
      'manual_started': 'Riego manual iniciado',
      'emergency_stop': 'Parada de emergencia',
      'manual_cancelled': 'Riego manual cancelado',
      'programmed_started': 'Riego programado iniciado',
      'programmed_saved': 'Riego programado guardado',
      'programmed_reminder': 'Recordatorio de riego',
      'programmed_schedule': 'Riego programado',
      'programmed_cancelled': 'Riego programado cancelado',
      'automatic_started': 'Riego automático iniciado',
      'automatic_saved': 'Riego automático guardado',
      'irrigation_completed': 'Riego completado',
      'config_updated': 'Configuración actualizada'
    };
    return subtypeMap[this.alert_subtype] || this.alert_subtype;
  }

  // Obtener JSON completo con formatos legibles
  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      alert_type: this.alert_type,
      alert_subtype: this.alert_subtype,
      formatted_type: this.getFormattedType(),
      formatted_subtype: this.getFormattedSubtype(),
      severity: this.severity,
      title: this.title,
      message: this.message,
      is_resolved: this.is_resolved,
      created_at: this.created_at,
      formatted_created_at: this.getFormattedCreatedAt(),
      time_ago: this.getTimeAgo(),
      severity_color: this.getSeverityColor()
    };
  }
}

export default Alert; 