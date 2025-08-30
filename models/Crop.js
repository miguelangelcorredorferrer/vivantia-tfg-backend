class Crop {
  constructor(data = {}) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.name = data.name;
    this.description = data.description;
    this.image = data.image;
    this.category = data.category;
    this.growth_days = data.growth_days;
    this.soil_humidity_min = data.soil_humidity_min;
    this.soil_humidity_max = data.soil_humidity_max;
    this.air_humidity_min = data.air_humidity_min;
    this.air_humidity_max = data.air_humidity_max;
    this.temperature_max = data.temperature_max;
    this.session = data.session;
    this.created_at = data.created_at;
    this.selected = data.selected || false;
  }

  // Verificar si el cultivo está seleccionado
  isSelected() {
    return this.selected;
  }

  // Verificar si la humedad del suelo está en rango óptimo
  isSoilHumidityOptimal(humidity) {
    if (this.soil_humidity_min === null || this.soil_humidity_max === null) return null;
    return humidity >= this.soil_humidity_min && humidity <= this.soil_humidity_max;
  }

  // Verificar si la humedad del aire está en rango óptimo
  isAirHumidityOptimal(humidity) {
    if (this.air_humidity_min === null || this.air_humidity_max === null) return null;
    return humidity >= this.air_humidity_min && humidity <= this.air_humidity_max;
  }

  // Verificar si la temperatura está en rango seguro
  isTemperatureSafe(temperature) {
    if (!this.temperature_max) return null;
    return temperature <= this.temperature_max;
  }

  // Verificar si necesita atención basado en condiciones
  needsAttention(currentSoilHumidity, currentAirHumidity, currentTemperature) {
    const issues = [];
    
    if (currentSoilHumidity !== undefined && !this.isSoilHumidityOptimal(currentSoilHumidity)) {
      if (currentSoilHumidity < this.soil_humidity_min) {
        issues.push('Humedad del suelo muy baja');
      } else if (currentSoilHumidity > this.soil_humidity_max) {
        issues.push('Humedad del suelo muy alta');
      }
    }

    if (currentAirHumidity !== undefined && !this.isAirHumidityOptimal(currentAirHumidity)) {
      if (currentAirHumidity < this.air_humidity_min) {
        issues.push('Humedad del aire muy baja');
      } else if (currentAirHumidity > this.air_humidity_max) {
        issues.push('Humedad del aire muy alta');
      }
    }
    
    if (currentTemperature !== undefined && !this.isTemperatureSafe(currentTemperature)) {
      issues.push('Temperatura muy alta');
    }
    
    return {
      needsAttention: issues.length > 0,
      issues
    };
  }
}

export default Crop; 