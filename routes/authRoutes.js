import express from 'express';
import {
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
} from '../controllers/authController.js';
import { hashPassword, hashPasswordIfModified } from '../middleware/passwordMiddleware.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Rutas públicas de autenticación
router.post('/register', hashPassword, register);
router.post('/login', login);

// Rutas de verificación de cuenta
router.get('/verify/:token', verifyAccount);

// Rutas de recuperación de contraseña
router.post('/forgot-password', forgotPassword);
router.get('/verify-token/:token', verifyPasswordResetToken);
router.put('/update-password/:token', hashPasswordIfModified, updatePassword);

// Rutas protegidas (requieren autenticación)
router.put('/change-password/:id', authMiddleware, hashPasswordIfModified, changePassword);
router.get('/user', authMiddleware, user);
router.get('/admin', authMiddleware, admin);
router.post('/logout', authMiddleware, logout);

export default router;