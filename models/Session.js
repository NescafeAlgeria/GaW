
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const SESSION_DURATION = 24 * 60 * 60;
const SECRET_KEY = process.env.JWT_SECRET;

export class Session {
  static async create(userObj) {
    const user = {
      username: userObj.username,
      role: userObj.role,
      email: userObj.email,
    }
    const sessionId = jwt.sign(user, SECRET_KEY, { expiresIn: SESSION_DURATION });
    return sessionId;
  }

  static async findBySessionId(sessionId) {
    try {
      const session = jwt.verify(sessionId, SECRET_KEY);
      return session ? session : null;
    }
    catch (err) {
      console.error('Invalid session ID:', err);
      return null;
    }
  }

  static async getUsername(sessionId) {
    try {
      const session = jwt.verify(sessionId, SECRET_KEY);
      return session ? session.username : null;
    }
    catch (err) {
      console.error('Invalid session ID:', err);
      return null;
    }
  }

}
