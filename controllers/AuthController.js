import { parse } from 'querystring';
import bcrypt from 'bcrypt';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { escapeHtml } from '../utils/xssProtection.js';

function getRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => resolve(JSON.parse(body)));
        req.on('error', err => reject(err));
    });
}

function getSessionId(req) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    return authHeader.split(' ')[1];
}

export class AuthController {
    static signup = async (req, res) => {
        try {
            const data = await getRequestBody(req);
            const { username, email, password, role } = data;

            const existingUser = await User.findByEmailOrUsername(email, username);
            if (existingUser) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'User already exists' }));
                return;
            }

            const validRoles = ['user', 'authority'];
            const userRole = validRoles.includes(role) ? role : 'user';
            const hashedPassword = await bcrypt.hash(password, 10);

            const user = await User.create({
                username,
                email,
                hashedPassword,
                role: userRole
            });

            const sessionId = await Session.create(user);

            res.writeHead(201, {
                'Content-Type': 'application/json',
                // 'Authorization': `Bearer ${sessionId}`
            });
            res.end(JSON.stringify({ message: 'Signup successful', token: sessionId }));
        } catch (err) {
            console.error('Signup error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
    };

    static login = async (req, res) => {
        try {
            const data = await getRequestBody(req);
            const { email, password } = data;
            const user = await User.findByEmail(email);
            if (!user || !await bcrypt.compare(password, user.hashedPassword)) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid email or password' }));
                return;
            }

            const sessionId = await Session.create(user);
            res.writeHead(200, {
                'Content-Type': 'application/json',
                // 'Authorization': `Bearer ${sessionId}`
            });
            res.end(JSON.stringify({ message: 'Login successful', token: sessionId }));
        } catch (err) {
            console.error('Login error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
    };

    static logout = async (req, res) => {
        try {
            const sessionId = getSessionId(req);
            if (!sessionId) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'No session found' }));
                return;
            }

            await Session.destroy(sessionId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Logout successful' }));
        } catch (err) {
            console.error('Logout error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
    };

    static getCurrentUser = async (req, res) => {
        try {
            const sessionId = getSessionId(req);
            if (!sessionId) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Not authenticated' }));
                return;
            }

            const session = await Session.findBySessionId(sessionId);
            if (!session) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid session' }));
                return;
            }

            const user = await User.findByUsername(session.username);
            if (!user) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'User not found' }));
                return;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                username: escapeHtml(user.username),
                role: escapeHtml(user.role || 'user')
            }));
        } catch (err) {
            console.error('getCurrentUser error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
    };
}
