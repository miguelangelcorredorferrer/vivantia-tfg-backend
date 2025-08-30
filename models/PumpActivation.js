import { calculateCurrentDuration, formatRemainingTime, formatDuration, formatDateToSpanish } from '../utils/index.js';

class PumpActivation {
  constructor(data = {}) {
    this.id = data.id;
    this.irrigation_config_id = data.irrigation_config_id;
    this.started_at = data.started_at;
    this.ended_at = data.ended_at;
    this.duration_minutes = data.duration_minutes;
    this.status = data.status || 'active'; // 'active', 'completed', 'cancelled', 'paused', 'restart', 'error'
    this.created_at = data.created_at;
  }

  // Obtener duración actual (para activaciones en curso)
  getCurrentDuration() {
    return calculateCurrentDuration(this.started_at, this.ended_at);
  }

  // Verificar si está activa
  isActive() {
    return this.status === 'active' || this.status === 'restart';
  }

  // Verificar si está completada
  isCompleted() {
    return this.status === 'completed';
  }

  // Verificar si fue cancelada
  isCancelled() {
    return this.status === 'cancelled';
  }

  // Verificar si está en pausa
  isPaused() {
    return this.status === 'paused';
  }

  // Verificar si tuvo error
  hasError() {
    return this.status === 'error';
  }


  // Obtener progreso de la activación (0-100)
  getProgress() {
    if (!this.started_at || !this.duration_minutes) return 0;
    
    const currentDuration = this.getCurrentDuration();
    const progress = Math.min(100, (currentDuration / this.duration_minutes) * 100);
    
    return Math.round(progress);
  }

  // Obtener tiempo restante
  getRemainingTime() {
    if (!this.isActive() || !this.duration_minutes) return 0;
    
    const currentDuration = this.getCurrentDuration();
    const remaining = Math.max(0, this.duration_minutes - currentDuration);
    
    return remaining;
  }

  // Obtener tiempo restante formateado
  getFormattedRemainingTime() {
    const remaining = this.getRemainingTime();
    return formatRemainingTime(remaining);
  }

  // Obtener duración total formateada
  getFormattedDuration() {
    return formatDuration(this.duration_minutes);
  }

  // Obtener tiempo de inicio formateado
  getFormattedStartedAt() {
    return formatDateToSpanish(this.started_at);
  }

  // Obtener tiempo de finalización formateado
  getFormattedEndedAt() {
    return formatDateToSpanish(this.ended_at);
  }

  // Verificar si la activación se ejecutó correctamente
  wasSuccessful() {
    return this.status === 'completed' && this.ended_at;
  }

}

export default PumpActivation; 