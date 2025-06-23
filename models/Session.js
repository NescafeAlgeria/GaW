import { randomBytes } from 'crypto';
import { db } from '../db/dbHandler.js';

const SESSION_DURATION = 24 * 60 * 60 * 1000;

export class Session {
  static async create(username) {
    const sessionId = randomBytes(24).toString('hex');
    const now = new Date();

    const session = {
      sessionId,
      username,
      createdAt: now,
      expiresAt: new Date(now.getTime() + SESSION_DURATION),
    };

    await db.insert('sessions', session);
    return sessionId;
  }

  static async findBySessionId(sessionId) {
    const session = await db.findOne('sessions', { sessionId });

    if (!session || new Date(session.expiresAt) < new Date()) {
      return null;
    }

    return session;
  }

  static async getUsername(sessionId) {
    const session = await this.findBySessionId(sessionId);
    return session ? session.username : null;
  }

  static async destroy(sessionId) {
    return await db.remove('sessions', { sessionId });
  }
}
