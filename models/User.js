import bcrypt from 'bcryptjs';
import { uniqueId } from '../utils/index.js';

class User {
  constructor(data = {}) {
    this.id = data.id;
    this.email = data.email;
    this.password = data.password;
    this.name = data.name;
    this.role = data.role || 'visitante';
    this.token = data.token || uniqueId();
    this.verified = data.verified || false;
    this.created_at = data.created_at;
  }

  // Verificar contraseña
  async checkPassword(password) {
    try {
      return await bcrypt.compare(password, this.password);
    } catch (error) {
      throw new Error(`Error al verificar contraseña: ${error.message}`);
    }
  }

  // Obtener datos del usuario sin contraseña, token y datos sensibles
  toJSON() {
    const { password, token, ...userWithoutSensitiveData } = this;
    return userWithoutSensitiveData;
  }

  // Obtener datos públicos del usuario (para JWT payload)
  getPublicData() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      role: this.role,
      verified: this.verified
    };
  }
}

export default User; 