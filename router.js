import url from 'url';
import fs from 'fs';
import path from 'path';
import helloRoute from './routes/helloRoute.js';
import mainRoute from './routes/mainRoute.js';
import addReportRoute from './routes/addReportRoute.js';

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

const routes = {
    '/': mainRoute,
    '/hello': helloRoute,
    '/addReport': addReportRoute,
};

const STATIC_PATH = path.join(process.cwd(), './public');

const toBool = [
    () => true,
    () => false,
];

const prepareFile = async (requestPath) => {
    const filePath = path.join(STATIC_PATH, decodeURIComponent(requestPath));
    const pathTraversal = !filePath.startsWith(STATIC_PATH);
    const exists = await fs.promises.access(filePath).then(...toBool);
    const found = !pathTraversal && exists;
    const finalPath = found ? filePath : path.join(STATIC_PATH, '404.html');
    const ext = path.extname(finalPath).substring(1).toLowerCase();
    const stream = fs.createReadStream(finalPath);
    return { found, ext, stream };
};

export const routeRequest = async (req, res) => {
    console.log('Request received:', req.method, req.url);

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;


    const routeHandler = routes[pathname];
    if (routeHandler) {
        routeHandler(req, res);
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
