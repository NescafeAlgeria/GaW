import url from 'url';
import fs from 'fs';
import path from 'path';

import { ReportController } from './controllers/ReportController.js';
import { ExportController } from './controllers/ExportController.js';
import { PageController } from './controllers/PageController.js';
import { AuthController } from './controllers/AuthController.js';
import { authMiddleware } from './middleware.js';

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

const pageRoutes = {
    '/': PageController.home,
    '/report': PageController.report,
    '/dashboard': PageController.dashboard,
    '/login': PageController.login,
    '/signup': PageController.signup,
};

const apiRoutes = {
    '/api/signup': AuthController.signup,
    '/api/login': AuthController.login,
    '/api/logout': AuthController.logout,
    '/api/addReport': ReportController.create,
    '/api/exportReport': ExportController.exportReport,
    '/api/getAllReportedCities': ReportController.getAllCounties,
    '/api/currentUser': AuthController.getCurrentUser,
    '/api/getAllReports': ReportController.getAllReports,
    '/api/getAllUsers': ReportController.getAllUsers
};

const STATIC_PATH = path.join(process.cwd(), './public');

const toBool = [() => true, () => false];

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

async function runMiddlewares(req, res, middlewares) {
  for (const mw of middlewares) {
    let finished = false;

    await new Promise(resolve => {
      mw(req, res, () => {
        finished = true;
        resolve();
      });
    });

    if (!finished) {
      return false;
    }
  }
  return true;
}

const protectedRoutes = [
    '/report',
    '/dashboard',
    '/api/addReport',
    '/api/exportReport',
    '/api/getAllReportedCities'
];

export const routeRequest = async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    if (protectedRoutes.includes(pathname)) {
        const isAuthenticated = await runMiddlewares(req, res, [authMiddleware]);
        if (!isAuthenticated) {
            res.writeHead(302, { Location: '/login' });
            res.end();
            return;
        }
    }

    if (pathname.startsWith('/api/deleteReport/')) {
        ReportController.deleteReport(req, res);
        return;
    }

    if (pathname.startsWith('/api/deleteUser/')) {
        ReportController.deleteUser(req, res);
        return;
    }

    if (apiRoutes[pathname]) {
        apiRoutes[pathname](req, res);
        return;
    }

    if (pageRoutes[pathname]) {
        pageRoutes[pathname](req, res);
        return;
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
