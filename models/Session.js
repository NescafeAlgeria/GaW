//import { randomBytes } from 'crypto';
//import { db } from '../db/dbHandler.js';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const SESSION_DURATION = 24 * 60 * 60;
const SECRET_KEY = process.env.JWT_SECRET;

export class Session {
  static async create(userObj) {
    // const sessionId = randomBytes(24).toString('hex');
    const user = {
      username: userObj.username,
      role: userObj.role,
      email: userObj.email,
    }
    const sessionId = jwt.sign(user, SECRET_KEY, { expiresIn: SESSION_DURATION });
     
    // const now = new Date();

    // const session = {
    //   sessionId,
    //   username,
    //   createdAt: now,
    //   expiresAt: new Date(now.getTime() + SESSION_DURATION),
    // };

    // await db.insert('sessions', session);
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
    // const session = await this.findBySessionId(sessionId);
    try {
      const session = jwt.verify(sessionId, SECRET_KEY);
      return session ? session.username : null;
    }
    catch (err) {
      console.error('Invalid session ID:', err);
      return null;
    }
  }

  // static async destroy(sessionId) {
  //   return await db.remove('sessions', { sessionId });
  // }
}
