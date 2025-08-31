import { 
  getTimeAgo, 
  needsIrrigation, 
  formatDuration, 
  formatDurationWithSeconds, 
  formatDateToSpanish, 
  isScheduledForToday 
} from '../utils/index.js';

class IrrigationConfig {
  constructor(data = {}) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.crop_id = data.crop_id;
    this.mode_type = data.mode_type; // 'manual', 'automatic', 'programmed'
    this.is_active = data.is_active || false;
    this.created_at = data.created_at;
    this.last_irrigation_at = data.last_irrigation_at;
    this.duration_minutes = data.duration_minutes; // Campo común para todos los modos
  }

  // Verificar si la configuración está activa
  isActive() {
    return this.is_active;
  }


  // Verificar si necesita riego (basado en última vez)
  needsIrrigation(hoursThreshold = 24) {
    return needsIrrigation(this.last_irrigation_at, hoursThreshold);
  }

  // Obtener tiempo desde el último riego
  getTimeSinceLastIrrigation() {
    if (!this.last_irrigation_at) return 'Nunca';
    return getTimeAgo(this.last_irrigation_at);
  }
}

// Añadir métodos útiles a IrrigationConfig
IrrigationConfig.prototype.getFormattedDuration = function() {
  return formatDuration(this.duration_minutes);
};

// Modelo para configuración automática (automatic_settings)
class AutomaticConfig {
  constructor(data = {}) {
    this.config_id = data.config_id; // PK que referencia irrigation_configs(id)
    this.humidity_min_threshold = data.humidity_min_threshold;
    this.humidity_max_threshold = data.humidity_max_threshold;
    this.temperature_max_threshold = data.temperature_max_threshold;
    this.use_crop_thresholds = data.use_crop_thresholds || true;
  }

  // Verificar si debería activarse el riego automático
  shouldTriggerIrrigation(currentHumidity, currentTemperature) {
    const humidityLow = currentHumidity < this.humidity_min_threshold;
    const temperatureHigh = currentTemperature > this.temperature_max_threshold;
    
    return {
      shouldTrigger: humidityLow || temperatureHigh,
      reasons: {
        humidityLow,
        temperatureHigh,
        currentHumidity,
        currentTemperature,
        thresholds: {
          humidity_min: this.humidity_min_threshold,
          humidity_max: this.humidity_max_threshold,
          temperature_max: this.temperature_max_threshold
        }
      }
    };
  }

  // Los métodos de duración ahora están en IrrigationConfig principal
}

// Modelo para configuración programada (programmed_settings)
class ProgrammedConfig {
  constructor(data = {}) {
    this.config_id = data.config_id; // PK que referencia irrigation_configs(id)
    this.start_datetime = data.start_datetime;
    this.frequency_type = data.frequency_type;
    this.custom_days = data.custom_days || [];
    this.notify_before_minutes = data.notify_before_minutes || 5;
    this.notify_at_start = data.notify_at_start !== false; // Default true
    this.notify_at_end = data.notify_at_end !== false; // Default true
    this.last_execution = data.last_execution;
    this.next_execution = data.next_execution;
  }

  // Verificar si está programado para ejecutarse hoy
  isScheduledForToday() {
    if (!this.start_datetime) return false;
    
    const today = new Date();
    const startDate = new Date(this.start_datetime);
    
    switch (this.frequency_type) {
      case 'once':
        return startDate.toDateString() === today.toDateString();
      case 'daily':
        return true; // Diariamente siempre está programado
      case 'custom':
        if (!this.custom_days || this.custom_days.length === 0) return false;
        const dayOfWeek = today.getDay(); // 0 = Domingo, 1 = Lunes, etc.
        const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek; // Convertir a 1-7 (Lunes-Domingo)
        return this.custom_days.includes(adjustedDay);
      default:
        return false;
    }
  }

  // Obtener próxima ejecución formateada
  getNextExecutionFormatted() {
    if (!this.next_execution) return 'No programada';
    return formatDateToSpanish(this.next_execution);
  }

  // Los métodos de duración ahora están en IrrigationConfig principal

  // Obtener tipo de frecuencia formateado
  getFormattedFrequency() {
    const frequencyMap = {
      'once': 'Una vez',
      'daily': 'Diariamente',
      'custom': 'Días personalizados'
    };
    return frequencyMap[this.frequency_type] || 'Desconocido';
  }

  // Obtener días personalizados formateados
  getFormattedCustomDays() {
    if (!this.custom_days || this.custom_days.length === 0) return 'Ningún día';
    
    const dayNames = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const selectedDays = this.custom_days.map(day => dayNames[day]).filter(Boolean);
    
    if (selectedDays.length === 1) {
      return selectedDays[0];
    } else if (selectedDays.length === 2) {
      return `${selectedDays[0]} y ${selectedDays[1]}`;
    } else {
      const last = selectedDays.pop();
      return `${selectedDays.join(', ')} y ${last}`;
    }
  }

  // Verificar si la configuración está activa (ahora basado en irrigation_configs.is_active)
  isActive() {
    // Esta lógica ahora se maneja en irrigation_configs.is_active
    return true; // Las programmed_settings están activas mientras existan
  }
}

export { IrrigationConfig, AutomaticConfig, ProgrammedConfig }; 