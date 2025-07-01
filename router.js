import url from 'url';
import fs from 'fs';
import path from 'path';

import { ReportController } from './controllers/ReportController.js';
import { ExportController } from './controllers/ExportController.js';
import { PageController } from './controllers/PageController.js';
import { AuthController } from './controllers/AuthController.js';
import { authMiddleware } from './middleware.js';
import { RecyclePointController } from "./controllers/RecyclePointController.js";

const MIME_TYPES = {
  default: 'application/octet-stream',
  html: 'text/html; charset=UTF-8',
  js: 'text/javascript',
  css: 'text/css',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  ico: 'image/x-icon',
  svg: 'image/svg+xml',
};

const STATIC_PATH = path.join(process.cwd(), './public');

const toBool = [() => true, () => false];

// === Page Routes (GET only) ===
const pageRoutes = {
  '/': PageController.home,
  '/report': PageController.report,
  '/dashboard': PageController.dashboard,
  '/login': PageController.login,
  '/signup': PageController.signup,
  '/token': PageController.token,
  '/admin-dashboard': PageController.adminDashboard,
  '/authority-dashboard': PageController.authorityDashboard,
  '/user-dashboard': PageController.userDashboard,
  '/manage-recycle-points': PageController.manageRecyclePoints,
};

// === API Routes (RESTful) ===
const apiRoutes = [
  { method: 'POST', path: '/api/signup', handler: AuthController.signup },
  { method: 'POST', path: '/api/login', handler: AuthController.login },
  { method: 'POST', path: '/api/logout', handler: AuthController.logout },
  { method: 'POST', path: '/api/reports', handler: ReportController.create },

  { method: 'GET', path: '/api/reports/count', handler: ReportController.getReportCount },
  { method: 'GET', path: '/api/users/count', handler: ReportController.getUserCount },

  { method: 'GET', path: '/api/reports/export', handler: ExportController.exportReport },
  { method: 'GET', path: '/api/reports/cities', handler: ReportController.getAllCounties },
  { method: 'GET', path: '/api/users/me', handler: AuthController.getCurrentUser },
  { method: 'GET', path: '/api/reports', handler: ReportController.getAllReports },
  { method: 'GET', path: '/api/users', handler: ReportController.getAllUsers },
  { method: 'GET', path: '/api/reports/me', handler: ReportController.getMyReports },


  { method: 'PATCH', path: '/api/users/:id/validate', handler: AuthController.validateUser },
  { method: 'PATCH', path: '/api/users/:id/role', handler: AuthController.changeUserRole },

  { method: 'DELETE', path: '/api/reports/:id', handler: ReportController.deleteReport },
  { method: 'DELETE', path: '/api/users/:id', handler: ReportController.deleteUser },

    {method: 'GET', path: '/api/recycle-points', handler: RecyclePointController.get},
    {method: 'POST', path: '/api/recycle-points', handler: RecyclePointController.create},
    {method: 'DELETE', path: '/api/recycle-points/:id', handler: RecyclePointController.delete},
    {method: 'POST', path: '/api/recycle-points/garbage', handler: RecyclePointController.AddGarbage},
    {method: 'DELETE', path: '/api/recycle-points/garbage', handler: RecyclePointController.ClearGarbage}
];

// === Utility to Match Route ===
function matchRoute(method, pathname, routes) {
  for (const route of routes) {
    if (route.method !== method) continue;

    const routeParts = route.path.split('/').filter(Boolean);
    const pathParts = pathname.split('/').filter(Boolean);
    if (routeParts.length !== pathParts.length) continue;

    const params = {};
    let match = true;

    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) {
        if(pathParts[i] === 'count') {
          match = false;
          break;
        }
        params[routeParts[i].slice(1)] = pathParts[i];
      } else if (routeParts[i] !== pathParts[i]) {
        match = false;
        break;
      }
    }

    if (match) return { handler: route.handler, params };
  }
  return null;
}

// === Middleware Runner ===
async function runMiddlewares(req, res, middlewares) {
  for (const mw of middlewares) {
    let finished = false;
    await new Promise(resolve => {
      mw(req, res, () => {
        finished = true;
        resolve();
      });
    });
    if (!finished) return false;
  }
  return true;
}

// === Static File Handler ===
const prepareFile = async (requestPath) => {
  const filePath = path.join(STATIC_PATH, decodeURIComponent(requestPath));
  const pathTraversal = !filePath.startsWith(STATIC_PATH);
  const exists = await fs.promises.access(filePath).then(...toBool);
  const found = !pathTraversal && exists;
  const finalPath = found ? filePath : path.join(STATIC_PATH, 'views', '404.html');
  const ext = path.extname(finalPath).substring(1).toLowerCase();
  const stream = fs.createReadStream(finalPath);
  return { found, ext, stream };
};

// === Protected Paths (requires auth) ===
const protectedPaths = [
//   '/report',
  '/admin-dashboard',
  '/authority-dashboard',
  '/user-dashboard',
  '/api/reports',
  '/api/reports/export',
  '/api/reports/cities',
  '/api/users/me',
  '/api/reports/:id',
  '/api/users/:id',
  '/api/users',
  '/api/users/:id/validate',
  '/api/users/:id/role',
];

// === Route Entry Point ===
export const routeRequest = async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  // Handle API routes
  const apiMatch = matchRoute(method, pathname, apiRoutes);
  if (apiMatch) {
    const protectedRoute = matchRoute(method, pathname, protectedPaths.map(p => ({ method, path: p })));
    if (protectedRoute) {
      const isAuthenticated = await runMiddlewares(req, res, [authMiddleware]);
      if (!isAuthenticated) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
    }

    try {
      await apiMatch.handler(req, res, apiMatch.params || {});
    } catch (err) {
      console.error('API Error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
    return;
  }

  // Handle page routes
  if (method === 'GET' && pageRoutes[pathname]) {
    if (protectedPaths.includes(pathname)) {
      const isAuthenticated = await runMiddlewares(req, res, [authMiddleware]);
      if (!isAuthenticated) {
        res.writeHead(302, { Location: '/login' });
        res.end();
        return;
      }
    }
    return pageRoutes[pathname](req, res);
  }

  // Static files
  try {
    const { found, ext, stream } = await prepareFile(pathname);
    const mimeType = MIME_TYPES[ext] || MIME_TYPES.default;
    res.writeHead(found ? 200 : 404, { 'Content-Type': mimeType });
    stream.pipe(res);
  } catch (err) {
    console.error('Static file error:', err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('500 Internal Server Error');
  }
};
