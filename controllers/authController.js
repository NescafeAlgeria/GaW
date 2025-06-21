import bcrypt from 'bcrypt';
import { getUserByEmail } from '../models/userModel.js';
import { createSession } from '../models/sessionModel.js';
import { insert, findOne } from '../db.js';


export async function loginUser(req, res, body) {
  const { email, password } = body;
  const user = await getUserByEmail(email);

  if (!user) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Invalid email' }));
    return;
  }

  const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
  if (!isPasswordValid) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Invalid email or password' }));
    return;
  }

  const sessionId = await createSession(user.username);
  res.writeHead(200, {
    'Set-Cookie': `sessionId=${sessionId}; HttpOnly; Path=/; Max-Age=86400`,
    'Content-Type': 'application/json'
  });
  res.end(JSON.stringify({ message: 'Login successful' }));
}

export async function signupUser(req, res, body) {
  const { username, email, password } = body;

  const existingUser = await findOne('users', { $or: [{ email }, { username }] });
  if (existingUser) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('User already exists');
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = { username, email, hashedPassword };

  await insert('users', user);
  res.writeHead(302, { Location: '/' });
  res.end();
}