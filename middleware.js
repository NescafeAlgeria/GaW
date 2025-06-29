import { User } from './models/User.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export async function checkSession(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.split(' ')[1]; // Bearer <token>
  if (!token) return null;

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload.user;
  } catch (err) {
    return null;
  }
}

export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.split(' ')[1];

  if (!token) {
    res.writeHead(302, { Location: '/login' });
    res.end();
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findByUsername(payload.user.username);
    if (!user) throw new Error('User not found');

    req.user = user;
    next();
  } catch (err) {
    res.writeHead(302, { Location: '/login' });
    res.end();
  }
}
