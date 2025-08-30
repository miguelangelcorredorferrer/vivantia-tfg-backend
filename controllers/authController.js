import User from '../models/User.js';
import { findUserByEmail, findUserById } from '../services/userService.js';
import { 
  handleNotFoundError, 
  handleBadRequestError, 
  handleInternalServerError, 
  handleSuccessResponse,
  generateJWT,
  uniqueId
} from '../utils/index.js';
import { sendEmailVerification, sendEmailPasswordReset } from '../emails/authEmailService.js';
import { createUserRegisteredAlert, createUserLoggedInAlert, createUsernameChangedAlert, createPasswordChangedAlert, createSessionClosedAlert } from '../services/authAlertService.js';

const register = async (req, res) => {
    try {
        // Valida todos los campos
        if(Object.values(req.body).includes('')) {
            return handleBadRequestError('Todos los campos son obligatorios', res);
        }

        const { email, password, name } = req.body;

        // Evitar registros duplicados
        const userExists = await findUserByEmail(email);
        if(userExists) {
            return handleBadRequestError('Usuario ya registrado', res);
        }

        // Validar la extensión del password
        const MIN_PASSWORD_LENGTH = 8;
        if(password.trim().length < MIN_PASSWORD_LENGTH) {
            return handleBadRequestError(`El password debe contener ${MIN_PASSWORD_LENGTH} caracteres`, res);
        }

        // Generar token único para verificación
        const verificationToken = uniqueId();

        // El middleware hashPassword ya cifró la contraseña
        const query = `
            INSERT INTO users (email, password, name, role, token, verified)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, email, name, role, token, verified, created_at
        `;
        
        const { pool } = await import('../config/db.js');
        const result = await pool.query(query, [email, password, name, 'visitante', verificationToken, false]);
        const newUser = new User(result.rows[0]);

        // Enviar email de verificación
        await sendEmailVerification({ 
          name: newUser.name, 
          email: newUser.email, 
          token: newUser.token 
        });

        // Crear alerta de registro exitoso
        try {
          await createUserRegisteredAlert(newUser.id, newUser.name);
        } catch (alertError) {
          console.warn('Error al crear alerta de registro:', alertError.message);
        }

        return res.status(201).json({
            msg: 'El usuario se creó correctamente, revisa tu email'
        });
    } catch (error) {
        return handleInternalServerError('Error al registrar usuario', res, error);
    }
};

const verifyAccount = async (req, res) => {
    try {
        const { token } = req.params;

        if (!token) {
            return handleBadRequestError('Token es obligatorio', res);
        }

        // Buscar usuario por token
        const { pool } = await import('../config/db.js');
        const query = 'SELECT * FROM users WHERE token = $1';
        const result = await pool.query(query, [token]);

        if (result.rows.length === 0) {
            return handleBadRequestError('Hubo un error, token no válido', res);
        }

        const userData = result.rows[0];
        const user = new User(userData);

        // Si el token es válido, confirmar la cuenta y actualizar el rol
        const updateQuery = `
            UPDATE users 
            SET verified = true, 
                token = '', 
                role = CASE 
                    WHEN role = 'visitante' THEN 'usuario'
                    ELSE role 
                END
            WHERE id = $1 
            RETURNING id, email, name, role, verified, created_at
        `;
        
        const updateResult = await pool.query(updateQuery, [user.id]);
        const updatedUser = new User(updateResult.rows[0]);

        return res.json({
            msg: 'Usuario Confirmado Correctamente'
        });
    } catch (error) {
        return handleInternalServerError('Error al verificar cuenta', res, error);
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validar campos requeridos
        if (!email || !password) {
            return handleBadRequestError('Email y contraseña son obligatorios', res);
        }

        // Revisar que el usuario exista
        const userData = await findUserByEmail(email);
        if(!userData) {
            return handleBadRequestError('El Usuario no existe', res);
        }

        const user = new User(userData);

        // Revisar si el usuario confirmó su cuenta
        if(!user.verified) {
            return handleBadRequestError('Tu cuenta no ha sido confirmada aún', res);
        }

        // Comprobar el password
        const isValidPassword = await user.checkPassword(password);
        if(isValidPassword) {
            const token = generateJWT(user.id);
            
            // Crear alerta de login exitoso
            try {
              await createUserLoggedInAlert(user.id, user.name);
            } catch (alertError) {
              console.warn('Error al crear alerta de login:', alertError.message);
            }
            
            return res.status(200).json({
                token,
                user: user.getPublicData()
            });
        } else {
            return handleBadRequestError('El password es incorrecto', res);
        }
    } catch (error) {
        return handleInternalServerError('Error en la autenticación', res, error);
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return handleBadRequestError('El email es obligatorio', res);
        }

        // Revisar que el usuario exista
        const userData = await findUserByEmail(email);
        if(!userData) {
            return handleNotFoundError('El usuario no existe', res);
        }

        const user = new User(userData);

        // Generar nuevo token para reset de password
        const resetToken = uniqueId();
        
        const { pool } = await import('../config/db.js');
        const query = 'UPDATE users SET token = $1 WHERE id = $2';
        await pool.query(query, [resetToken, user.id]);

        // Enviar email de reset de contraseña
        await sendEmailPasswordReset({
            name: user.name,
            email: user.email,
            token: resetToken
        });

        return res.json({
            msg: 'Hemos enviado un email con las instrucciones'
        });
    } catch (error) {
        return handleInternalServerError('Error al procesar solicitud de reset', res, error);
    }
};

const verifyPasswordResetToken = async (req, res) => {
    try {
        const { token } = req.params;

        if (!token) {
            return handleBadRequestError('Token es obligatorio', res);
        }

        // Buscar usuario por token
        const { pool } = await import('../config/db.js');
        const query = 'SELECT * FROM users WHERE token = $1';
        const result = await pool.query(query, [token]);

        if (result.rows.length === 0) {
            return handleBadRequestError('Hubo un error, Token no válido', res);
        }

        return res.json({
            msg: 'Token Válido'
        });
    } catch (error) {
        return handleInternalServerError('Error al verificar token', res, error);
    }
};

const updatePassword = async (req, res) => {
    try {
        const { token } = req.params;
        
        // Buscar usuario por token
        const { pool } = await import('../config/db.js');
        const userQuery = 'SELECT * FROM users WHERE token = $1';
        const userResult = await pool.query(userQuery, [token]);

        if (userResult.rows.length === 0) {
            return handleBadRequestError('Hubo un error, Token no válido', res);
        }

        const { password } = req.body;

        // Validar password
        const MIN_PASSWORD_LENGTH = 8;
        if(password.trim().length < MIN_PASSWORD_LENGTH) {
            return handleBadRequestError(`El password debe contener ${MIN_PASSWORD_LENGTH} caracteres`, res);
        }
        
        // Actualizar password y limpiar token (el middleware hashPasswordIfModified cifrará la contraseña)
        const updateQuery = `
            UPDATE users 
            SET password = $1, token = '' 
            WHERE token = $2 
            RETURNING id, email, name, role, verified, created_at
        `;
        
        const updateResult = await pool.query(updateQuery, [password, token]);
        
        return res.json({
            msg: 'Password modificado correctamente'
        });
    } catch (error) {
        return handleInternalServerError('Error al actualizar password', res, error);
    }
};

const changePassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;

        // Validar campos
        if (!currentPassword || !newPassword) {
            return handleBadRequestError('Contraseña actual y nueva son obligatorias', res);
        }

        // Validar longitud de nueva contraseña
        const MIN_PASSWORD_LENGTH = 8;
        if(newPassword.trim().length < MIN_PASSWORD_LENGTH) {
            return handleBadRequestError(`El password debe contener ${MIN_PASSWORD_LENGTH} caracteres`, res);
        }

        // Verificar si el usuario existe
        const userData = await findUserById(id);
        if (!userData) {
            return handleNotFoundError('Usuario no encontrado', res);
        }

        const user = new User(userData);

        // Verificar contraseña actual
        const isValidPassword = await user.checkPassword(currentPassword);
        if (!isValidPassword) {
            return handleBadRequestError('Contraseña actual incorrecta', res);
        }

        // Actualizar contraseña (el middleware hashPasswordIfModified la cifrará)
        const { pool } = await import('../config/db.js');
        const query = 'UPDATE users SET password = $1 WHERE id = $2 RETURNING id, email, name, role, verified, created_at';
        const result = await pool.query(query, [newPassword, id]);

                 const updatedUser = new User(result.rows[0]);

         // Crear alerta de cambio de contraseña
         try {
           await createPasswordChangedAlert(updatedUser.id);
         } catch (alertError) {
           console.warn('Error al crear alerta de cambio de contraseña:', alertError.message);
         }

         return res.status(200).json({
             msg: 'Contraseña cambiada exitosamente',
             user: updatedUser.getPublicData()
         });
    } catch (error) {
        return handleInternalServerError('Error al cambiar contraseña', res, error);
    }
};

const user = async (req, res) => {
    try {
        // El usuario viene del middleware de autenticación
        const { user } = req;
        
        if (!user) {
            return handleBadRequestError('No autorizado', res);
        }

        return res.json(user);
    } catch (error) {
        return handleInternalServerError('Error al obtener perfil de usuario', res, error);
    }
};

const admin = async (req, res) => {
    try {
        const { user } = req;
        
        if (!user) {
            return handleBadRequestError('No autorizado', res);
        }

        // Verificar si el usuario es admin
        if(user.role !== 'admin') {
            return handleBadRequestError('Acción no válida', res);
        }

        return res.json(user);
    } catch (error) {
        return handleInternalServerError('Error al verificar permisos de admin', res, error);
    }
};

// Logout - Cerrar sesión
const logout = async (req, res) => {
    try {
        const { user } = req;
        
        if (!user) {
            return handleBadRequestError('No autorizado', res);
        }

        // Crear alerta de sesión cerrada
        try {
            await createSessionClosedAlert(user.id, user.name);
        } catch (alertError) {
            console.warn('Error al crear alerta de logout:', alertError.message);
        }

        // En una implementación más robusta, aquí podrías invalidar el token
        // agregándolo a una lista negra, pero por simplicidad solo creamos la alerta

        return res.status(200).json({
            success: true,
            message: 'Sesión cerrada exitosamente'
        });
    } catch (error) {
        return handleInternalServerError('Error al cerrar sesión', res, error);
    }
};

export {
    register,
    verifyAccount,
    login,
    forgotPassword,
    verifyPasswordResetToken,
    updatePassword,
    changePassword,
    user,
    admin,
    logout
};
