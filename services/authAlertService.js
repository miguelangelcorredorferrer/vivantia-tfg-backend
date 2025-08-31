import { pool } from '../config/db.js';
import Alert from '../models/Alert.js';

/**
 * Servicio para manejar alertas relacionadas con autenticación
 * Evita importar controladores dentro de otros controladores
 */

// Función auxiliar para crear alertas de autenticación
const createAuthAlert = async (user_id, alert_subtype, title, message, severity = 'info') => {
  try {
    const query = `
      INSERT INTO alerts (user_id, alert_type, alert_subtype, severity, title, message, is_resolved)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [user_id, 'user', alert_subtype, severity, title, message, false];
    const result = await pool.query(query, values);
    
    return new Alert(result.rows[0]);
  } catch (error) {
    console.error(`Error creando alerta de autenticación (${alert_subtype}):`, error.message);
    throw error;
  }
};

// Crear alerta de usuario registrado
export const createUserRegisteredAlert = async (user_id, userName) => {
  const title = 'Bienvenido a Vivantia IoT';
  const message = `¡Hola ${userName}! Tu cuenta ha sido creada exitosamente. Revisa tu email para verificar tu cuenta y comenzar a usar Vivantia IoT.`;
  
  return await createAuthAlert(user_id, 'user_registered', title, message, 'success');
};

// Crear alerta de usuario logueado
export const createUserLoggedInAlert = async (user_id, userName) => {
  const title = 'Sesión iniciada';
  const message = `¡Hola ${userName}! Has iniciado sesión exitosamente en Vivantia IoT.`;
  
  return await createAuthAlert(user_id, 'user_logged_in', title, message, 'info');
};

// Crear alerta de contraseña cambiada
export const createPasswordChangedAlert = async (user_id) => {
  const title = 'Contraseña actualizada';
  const message = 'Tu contraseña ha sido actualizada exitosamente. Si no fuiste tú quien realizó este cambio, contacta al administrador inmediatamente.';
  
  return await createAuthAlert(user_id, 'password_changed', title, message, 'warning');
};

// Crear alerta de cuenta verificada
export const createAccountVerifiedAlert = async (user_id, userName) => {
  const title = 'Cuenta verificada exitosamente';
  const message = `¡Perfecto ${userName}! Tu cuenta ha sido verificada. Ya puedes acceder a todas las funcionalidades de Vivantia IoT.`;
  
  return await createAuthAlert(user_id, 'account_verified', title, message, 'success');
};

// Crear alerta de restablecimiento de contraseña solicitado
export const createPasswordResetRequestedAlert = async (user_id) => {
  const title = 'Restablecimiento de contraseña solicitado';
  const message = 'Se ha solicitado el restablecimiento de tu contraseña. Revisa tu email para continuar con el proceso.';
  
  return await createAuthAlert(user_id, 'password_reset_requested', title, message, 'info');
};

// Crear alerta de contraseña restablecida
export const createPasswordResetCompletedAlert = async (user_id) => {
  const title = 'Contraseña restablecida exitosamente';
  const message = 'Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.';
  
  return await createAuthAlert(user_id, 'password_reset_completed', title, message, 'success');
};

// Crear alerta de nombre de usuario cambiado
export const createUsernameChangedAlert = async (user_id, oldName, newName) => {
  const title = 'Nombre de usuario actualizado';
  const message = `Tu nombre de usuario ha sido actualizado de "${oldName}" a "${newName}".`;
  
  return await createAuthAlert(user_id, 'username_changed', title, message, 'info');
};

// Crear alerta de sesión cerrada
export const createSessionClosedAlert = async (user_id, userName) => {
  const title = 'Sesión cerrada';
  const message = `¡Hasta pronto ${userName}! Tu sesión ha sido cerrada exitosamente.`;
  
  return await createAuthAlert(user_id, 'session_closed', title, message, 'info');
};
