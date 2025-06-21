import { randomBytes } from 'crypto';
import { insert, findOne, remove } from '../db.js';

const SESSION_DURATION = 24 * 60 * 60 * 1000; // 1 day

export async function createSession(username) {
  const sessionId = randomBytes(24).toString('hex');
  const now = new Date();

  await insert('sessions', {
    sessionId,
    username,
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_DURATION)
  });

  return sessionId;
}

export async function getUsernameBySession(sessionId) {
  const session = await findOne('sessions', { sessionId });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  return session.username;
}

export async function destroySession(sessionId) {
  await remove('sessions', { sessionId });
}
