import { formatDateToSpanish } from '../utils/index.js';

class SensorReading {
  constructor(data = {}) {
    this.id = data.id;
    this.device_id = data.device_id;
    // Nuevos campos de humedad
    this.air_humidity = data.air_humidity;
    this.soil_humidity = data.soil_humidity;

    // BACKWARD COMPATIBILITY: mantener propiedad legacy "humidity" apuntando a la humedad del suelo
    // Esto evita romper partes de la app que todavía lean "reading.humidity"
    this.humidity = this.soil_humidity;
    this.temperature = data.temperature;
    this.received_at = data.received_at;
  }

  /**
   * Comprobar si las lecturas están dentro de rango.
   * Por ahora utilizamos soil_humidity como referencia principal de humedad.
   * En el futuro se podría extender a validar ambos tipos por separado.
   */
  isInNormalRange(soilHumidityMin = 30, soilHumidityMax = 70, tempMax = 35) {
    return {
      soil_humidity: this.soil_humidity >= soilHumidityMin && this.soil_humidity <= soilHumidityMax,
      temperature: this.temperature <= tempMax,
      overall: (this.soil_humidity >= soilHumidityMin && this.soil_humidity <= soilHumidityMax) &&
               (this.temperature <= tempMax)
    };
  }

  getAlarmLevel(soilHumidityMin = 30, soilHumidityMax = 70, tempMax = 35) {
    const humidityOut = this.soil_humidity < soilHumidityMin || this.soil_humidity > soilHumidityMax;
    const tempOut = this.temperature > tempMax;

    if (humidityOut && tempOut) return 'critical';
    if (humidityOut || tempOut) return 'warning';
    return 'normal';
  }

  // Formatear fecha de recepción
  getFormattedReceivedAt() {
    return formatDateToSpanish(this.received_at);
  }
}

export default SensorReading; 