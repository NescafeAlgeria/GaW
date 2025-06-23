import { getUsernameBySession } from './models/sessionModel.js';

export async function checkSession(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  const sessionId = cookies.sessionId;
  if (!sessionId) return null;
  return await getUsernameBySession(sessionId);
}

function parseCookies(cookieString) {
  return Object.fromEntries(
    (cookieString || '').split('; ').map(c => c.split('='))
  );
}

async function authMiddleware(req, res, next) {
  const cookies = parseCookies(req);
  const sessionId = cookies.sessionId;

  if (!sessionId) {
    res.writeHead(302, { Location: '/login.html' });
    res.end();
    return;
  }

  const username = await getUsernameBySession(sessionId);
  if (!username) {
    res.writeHead(302, { Location: '/login.html' });
    res.end();
    return;
  }

  const user = await getUserByUsername(username);
  if (!user) {
    res.writeHead(302, { Location: '/login.html' });
    res.end();
    return;
  }

  req.user = user;
  next();
}

export default authMiddleware;
