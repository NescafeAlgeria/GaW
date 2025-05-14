import http from 'http';
import { routeRequest } from './router.js';

const server = http.createServer((req, res) => {
    routeRequest(req, res);
});

server.listen(3000, () => {
    console.log('Server running at http://localhost:3000/');
});
