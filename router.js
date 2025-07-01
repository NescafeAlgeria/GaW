import url from 'url';
import fs from 'fs';
import path from 'path';

import { ReportController } from './controllers/ReportController.js';
import { ExportController } from './controllers/ExportController.js';
import { PageController } from './controllers/PageController.js';
import { AuthController } from './controllers/AuthController.js';
import { authMiddleware, requireUser, requireAuthority, requireAdmin } from './middleware.js';
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
  '/map': PageController.mapLoader,
  '/map-loader': PageController.map,
  '/login': PageController.login,
  '/signup': PageController.signup,
  '/token': PageController.token,
  '/admin-dashboard': PageController.adminDashboard,
  '/authority-dashboard': PageController.authorityDashboard,
  '/user-dashboard': PageController.userDashboard,
  '/manage-recycle-points': PageController.manageRecyclePointsLoader,
  '/manage-recycle-points-loader': PageController.manageRecyclePoints,
};

// === API Routes (RESTful) ===
const apiRoutes = [
  { method: 'POST', path: '/api/signup', handler: AuthController.signup },
  { method: 'POST', path: '/api/login', handler: AuthController.login },
  { method: 'POST', path: '/api/logout', handler: AuthController.logout },
  { method: 'POST', path: '/api/reports', handler: ReportController.create },

  { method: 'GET', path: '/api/reports/count', handler: ReportController.getReportCount },
  { method: 'GET', path: '/api/users/count', handler: ReportController.getUserCount },
  { method: 'GET', path: '/api/reports/count/solved', handler: ReportController.getSolvedReportCount },

  { method: 'GET', path: '/api/reports/export', handler: ExportController.exportReport },
  { method: 'GET', path: '/api/reports/export/csv', handler: ExportController.exportCSV },
  { method: 'GET', path: '/api/reports/cities', handler: ReportController.getAllCounties },
  { method: 'GET', path: '/api/reports/localities', handler: ReportController.getAllLocalities },
  { method: 'GET', path: '/api/localities/supported', handler: ReportController.getSupportedLocalities },
  { method: 'GET', path: '/api/geojson/:locality', handler: ReportController.getGeoJsonForLocality },
  { method: 'GET', path: '/api/reports/locality/:locality', handler: ReportController.getReportsByLocality },
  { method: 'GET', path: '/api/reports/chart/:locality', handler: ReportController.getReportsForChart },
  { method: 'GET', path: '/api/users/me', handler: AuthController.getCurrentUser },
  { method: 'GET', path: '/api/reports', handler: ReportController.getAllReports },
  { method: 'GET', path: '/api/users', handler: ReportController.getAllUsers },
  { method: 'GET', path: '/api/reports/me', handler: ReportController.getMyReports },


  { method: 'POST', path: '/api/users/:id/validate', handler: AuthController.validateUser },
  { method: 'PATCH', path: '/api/users/:id/role', handler: AuthController.changeUserRole },
  { method: 'POST', path: '/api/reports/:id/solve', handler: ReportController.solveReport },

  { method: 'DELETE', path: '/api/reports/:id', handler: ReportController.deleteReport },
  { method: 'DELETE', path: '/api/users/:id', handler: ReportController.deleteUser },


  { method: 'POST', path: '/api/recycle-points/garbage', handler: RecyclePointController.AddGarbage },
  { method: 'DELETE', path: '/api/recycle-points/garbage', handler: RecyclePointController.ClearGarbage },

  { method: 'DELETE', path: '/api/recycle-points/:id', handler: RecyclePointController.delete },
  { method: 'GET', path: '/api/recycle-points', handler: RecyclePointController.get },
  { method: 'POST', path: '/api/recycle-points', handler: RecyclePointController.create },
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
        if (pathParts[i] === 'count') {
          match = false;
          break;
        }
        params[routeParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
      } else if (routeParts[i] !== pathParts[i]) {
        match = false;
        break;
      }
    }

    if (match) return { handler: route.handler, params };
  }
  return null;
}

function matchProtectedRoute(pathname) {
  for (const route of protectedRoutes) {
    const routeParts = route.path.split('/').filter(Boolean);
    const pathParts = pathname.split('/').filter(Boolean);
    if (routeParts.length !== pathParts.length) continue;

    let match = true;
    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) {
        continue;
      } else if (routeParts[i] !== pathParts[i]) {
        match = false;
        break;
      }
    }

    if (match) return route;
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
const protectedRoutes = [
  { path: '/admin-dashboard', middleware: requireAdmin },
  { path: '/authority-dashboard', middleware: requireAuthority },
  { path: '/user-dashboard', middleware: requireUser },
  { path: '/manage-recycle-points-loader', middleware: requireAuthority },
  { path: '/map-loader', middleware: requireAuthority },
  { path: '/api/reports', middleware: requireUser },
  { path: '/api/reports/export', middleware: requireUser },
  { path: '/api/reports/cities', middleware: requireUser },
  { path: '/api/users/me', middleware: requireUser },
  { path: '/api/reports/:id', middleware: requireUser },
  { path: '/api/users/:id', middleware: requireAdmin },
  { path: '/api/users', middleware: requireAdmin },
  { path: '/api/users/:id/validate', middleware: requireAdmin },
  { path: '/api/users/:id/role', middleware: requireAdmin },
  { path: '/api/recycle-points/garbage', middleware: requireAuthority },
  { path: '/api/recycle-points/:id', middleware: requireAuthority },
  { path: '/api/recycle-points', middleware: requireAuthority },
  { path: '/api/geojson/:locality', middleware: requireAuthority },
  { path: '/api/reports/:id/solve', middleware: requireAuthority },
];

// === Route Entry Point ===
export const routeRequest = async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  const apiMatch = matchRoute(method, pathname, apiRoutes);
  if (apiMatch) {
    const protectedRoute = matchProtectedRoute(pathname);
    if (protectedRoute) {
      const isAuthenticated = await runMiddlewares(req, res, [protectedRoute.middleware]);
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

  if (method === 'GET' && pageRoutes[pathname]) {
    const protectedRoute = matchProtectedRoute(pathname);
    if (protectedRoute) {
      const isAuthenticated = await runMiddlewares(req, res, [protectedRoute.middleware]);
      if (!isAuthenticated) {
        res.writeHead(302, { Location: '/login' });
        res.end();
        return;
      }
    }
    return pageRoutes[pathname](req, res);
  }

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
