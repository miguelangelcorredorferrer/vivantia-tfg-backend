import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { findUserById } from '../services/userService.js';

const authMiddleware = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extraer el token del header
      const token = req.headers.authorization.split(' ')[1];
      
      // Verificar el token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Buscar el usuario en la base de datos
      const userData = await findUserById(decoded.id);
      
      if (!userData) {
        const error = new Error('Usuario no encontrado');
        return res.status(404).json({ msg: error.message });
      }
      
      // Crear instancia del modelo User
      const user = new User(userData);
      
      // Verificar que la cuenta esté verificada
      if (!user.verified) {
        const error = new Error('Cuenta no verificada');
        return res.status(401).json({ msg: error.message });
      }
      
      // Agregar usuario sin datos sensibles al request
      req.user = user.getPublicData();
      
      next();
    } catch (error) {
      const authError = new Error('Token no válido');
      res.status(403).json({ msg: authError.message });
    }
  } else {
    const error = new Error('Token no válido o inexistente');
    res.status(403).json({ msg: error.message });
  }
};

export default authMiddleware;
