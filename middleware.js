import { Session } from './models/Session.js';
import { User } from './models/User.js';

export async function checkSession(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  const sessionId = cookies.sessionId;
  if (!sessionId) return null;
  return await Session.getUsername(sessionId);
}

function parseCookies(cookieString) {
  return Object.fromEntries(
    (cookieString || '').split('; ').map(c => c.split('='))
  );
}

export async function authMiddleware(req, res, next) {
  const cookies = parseCookies(req.headers.cookie || '');
  const sessionId = cookies.sessionId;

  if (!sessionId) {
    res.writeHead(302, { Location: '/login' });
    res.end();
    return;
  }

  const username = await Session.getUsername(sessionId);
  if (!username) {
    res.writeHead(302, { Location: '/login' });
    res.end();
    return;
  }

  const user = await User.findByUsername(username);
  if (!user) {
    res.writeHead(302, { Location: '/login' });
    res.end();
    return;
  }
  req.user = user;
  next();

}
