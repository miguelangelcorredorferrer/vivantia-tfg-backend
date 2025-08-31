import bcrypt from 'bcryptjs';

// Middleware para cifrar contraseña antes de guardar
const hashPassword = async (req, res, next) => {
  try {
    // Solo cifrar si se está enviando una contraseña
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      req.body.password = await bcrypt.hash(req.body.password, salt);
    }
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al procesar la contraseña',
      error: error.message
    });
  }
};

// Middleware para cifrar contraseña solo si ha cambiado
const hashPasswordIfModified = async (req, res, next) => {
  try {
    // Solo cifrar si se está enviando una contraseña nueva
    if (req.body.password && req.body.password !== req.body.oldPassword) {
      const salt = await bcrypt.genSalt(10);
      req.body.password = await bcrypt.hash(req.body.password, salt);
    }
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al procesar la contraseña',
      error: error.message
    });
  }
};

export { hashPassword, hashPasswordIfModified };
export default { hashPassword, hashPasswordIfModified }; 