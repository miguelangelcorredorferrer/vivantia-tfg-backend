import express from 'express';
import {
  createUser,
  getUserById,
  getUserByEmail,
  getAllUsers,
  updateUser,
  deleteUser,
  deleteOwnAccount,
  getCurrentUserProfile
} from '../controllers/userController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { hashPassword, hashPasswordIfModified } from '../middleware/passwordMiddleware.js';

const router = express.Router();

// Rutas básicas CRUD (protegidas para admin)
router.post('/', authMiddleware, hashPassword, createUser);
router.get('/', authMiddleware, getAllUsers);
router.get('/:id', authMiddleware, getUserById);
router.put('/:id', authMiddleware, hashPasswordIfModified, updateUser);
router.delete('/:id', authMiddleware, deleteUser);

// Rutas específicas
router.get('/email/:email', authMiddleware, getUserByEmail);
router.get('/profile/current', authMiddleware, getCurrentUserProfile);

// Ruta para eliminar cuenta propia
router.delete('/account/delete', authMiddleware, deleteOwnAccount);

export default router;
