import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import jwt from 'jsonwebtoken';

// ===== FUNCIONES DE FECHA =====

// Obtener timestamp actual en zona horaria local
const getCurrentTimestamp = () => {
  return new Date().toISOString();
};

// Obtener timestamp actual en zona horaria de Madrid
const getCurrentTimestampMadrid = () => {
  const now = new Date();
  return now.toLocaleString('es-ES', { 
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

// Formatear fecha en español con formato específico
const formatDateToSpanish = (date) => {
  if (!date) return '';
  
  return format(new Date(date), 'dd MMM yyyy, HH:mm', { locale: es });
};

// Obtener tiempo transcurrido desde una fecha ("hace X tiempo")
const getTimeAgo = (date) => {
  if (!date) return '';
  
  return formatDistanceToNow(new Date(date), { 
    addSuffix: true, 
    locale: es 
  });
};

// Formatear duración en minutos a formato legible
const formatDuration = (minutes) => {
  if (!minutes || minutes === 0) return '';
  
  if (minutes < 60) {
    return `${minutes} minutos`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours} horas`;
  }
};

// Formatear duración con segundos incluidos
const formatDurationWithSeconds = (minutes, seconds = 0) => {
  const totalSeconds = (minutes * 60) + seconds;
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${mins}m ${secs}s`;
  } else if (mins > 0) {
    return `${mins}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

// Calcular duración actual entre dos fechas (en minutos)
const calculateCurrentDuration = (startDate, endDate = null) => {
  if (!startDate) return 0;
  
  const endTime = endDate ? new Date(endDate) : new Date();
  const startTime = new Date(startDate);
  
  return Math.floor((endTime - startTime) / (1000 * 60)); // en minutos
};

// Formatear tiempo restante
const formatRemainingTime = (remainingMinutes) => {
  if (remainingMinutes === 0) return 'Finalizado';
  
  if (remainingMinutes < 60) {
    return `${remainingMinutes} min`;
  } else {
    const hours = Math.floor(remainingMinutes / 60);
    const minutes = remainingMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
};

// Verificar si necesita riego basado en horas transcurridas
const needsIrrigation = (lastIrrigationDate, hoursThreshold = 24) => {
  if (!lastIrrigationDate) return true;
  
  const lastIrrigation = new Date(lastIrrigationDate);
  const now = new Date();
  const hoursSinceLastIrrigation = (now - lastIrrigation) / (1000 * 60 * 60);
  
  return hoursSinceLastIrrigation >= hoursThreshold;
};

// Verificar si está programado para hoy
const isScheduledForToday = (startDate, frequencyType, customDays = null) => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = domingo, 1 = lunes, etc.
  
  if (frequencyType === 'daily') return true;
  if (frequencyType === 'once') {
    const startDateObj = new Date(startDate);
    return today.toDateString() === startDateObj.toDateString();
  }
  if (frequencyType === 'custom' && customDays) {
    return customDays.includes(dayOfWeek);
  }
  
  return false;
};

// ===== FUNCIONES DE MANEJO DE ERRORES =====

// Función para manejar errores 404
const handleNotFoundError = (message, res) => {
  const error = new Error(message);
  return res.status(404).json({
    msg: error.message
  });
};

// Función para manejar errores 400 (Bad Request)
const handleBadRequestError = (message, res) => {
  const error = new Error(message);
  return res.status(400).json({
    msg: error.message
  });
};

// Función para manejar errores 500 (Internal Server Error)
const handleInternalServerError = (message, res, error = null) => {
  console.error('Error interno del servidor:', error);
  return res.status(500).json({
    msg: message || 'Error interno del servidor'
  });
};

// Función para respuesta exitosa estándar
const handleSuccessResponse = (res, data, message = 'Operación exitosa', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

// ===== FUNCIONES JWT Y AUTENTICACIÓN =====

// Generar ID único para tokens
const uniqueId = () => Date.now().toString(32) + Math.random().toString(32).substring(2);

// Generar JWT
const generateJWT = (id) => {
  const token = jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
  return token;
};

// ===== EXPORTACIONES =====

export {
  // Funciones de fecha
  getCurrentTimestamp,
  getCurrentTimestampMadrid,
  formatDateToSpanish,
  getTimeAgo,
  formatDuration,
  formatDurationWithSeconds,
  calculateCurrentDuration,
  formatRemainingTime,
  needsIrrigation,
  isScheduledForToday,
  
  // Funciones de manejo de errores
  handleNotFoundError,
  handleBadRequestError,
  handleInternalServerError,
  handleSuccessResponse,
  
  // Funciones JWT y autenticación
  uniqueId,
  generateJWT
};
