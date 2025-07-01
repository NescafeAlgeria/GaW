import bcrypt from 'bcrypt';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { escapeHtml } from '../utils/xssProtection.js';
import { ErrorFactory } from '../utils/ErrorFactory.js';

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
                return ErrorFactory.createError(res, 409, 'USER_ALREADY_EXISTS', 'User already exists', {
                    login: { href: '/api/login', method: 'POST' }
                });
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
            });
            res.end(JSON.stringify({ 
                success: true,
                message: 'Signup successful', 
                token: sessionId,
                links: {
                    self: { href: '/api/signup', method: 'POST' },
                    profile: { href: '/api/users/me', method: 'GET' },
                    login: { href: '/api/login', method: 'POST' },
                }
            }));
        } catch (err) {
            console.error('Signup error:', err);
            return ErrorFactory.createError(res, 500, 'INTERNAL_SERVER_ERROR', 'Internal server error', {
                signup: { href: '/api/signup', method: 'POST' }
            });
        }
    };

    static login = async (req, res) => {
        try {
            const data = await getRequestBody(req);
            const { email, password } = data;
            const user = await User.findByEmail(email);
            if (!user || !await bcrypt.compare(password, user.hashedPassword)) {
                return ErrorFactory.createError(res, 401, 'INVALID_CREDENTIALS', 'Invalid email or password', {
                    signup: { href: '/api/signup', method: 'POST' }
                });
            }

            const sessionId = await Session.create(user);
            res.writeHead(200, {
                'Content-Type': 'application/json',
            });
            res.end(JSON.stringify({ 
                success: true,
                message: 'Login successful', 
                token: sessionId,
                links: {
                    self: { href: '/api/login', method: 'POST' },
                    profile: { href: '/api/users/me', method: 'GET' },
                }
            }));
        } catch (err) {
            console.error('Login error:', err);
            return ErrorFactory.createError(res, 500, 'INTERNAL_SERVER_ERROR', 'Internal server error', {
                login: { href: '/api/login', method: 'POST' }
            });
        }
    };

    // static logout = async (req, res) => {
    //     try {
    //         const sessionId = getSessionId(req);
    //         if (!sessionId) {
    //             return ErrorFactory.createError(res, 401, 'NO_SESSION', 'No session found', {
    //                 login: { href: '/api/login', method: 'POST' }
    //             });
    //         }

    //         await Session.destroy(sessionId);
    //         res.writeHead(200, { 'Content-Type': 'application/json' });
    //         res.end(JSON.stringify({ 
    //             success: true,
    //             message: 'Logout successful',
    //             links: {
    //                 login: { href: '/api/login', method: 'POST' },
    //                 signup: { href: '/api/signup', method: 'POST' }
    //             }
    //         }));
    //     } catch (err) {
    //         console.error('Logout error:', err);
    //         return ErrorFactory.createError(res, 500, 'INTERNAL_SERVER_ERROR', 'Internal server error', {});
    //     }
    // };

    static getCurrentUser = async (req, res) => {
        try {
            const sessionId = getSessionId(req);
            if (!sessionId) {
                return ErrorFactory.createError(res, 401, 'NOT_AUTHENTICATED', 'Not authenticated', {
                    login: { href: '/api/login', method: 'POST' }
                });
            }

            const session = await Session.findBySessionId(sessionId);
            if (!session) {
                return ErrorFactory.createError(res, 401, 'INVALID_SESSION', 'Invalid session', {
                    login: { href: '/api/login', method: 'POST' }
                });
            }

            const user = await User.findByUsername(session.username);
            if (!user) {
                return ErrorFactory.createError(res, 404, 'USER_NOT_FOUND', 'User not found', {
                    login: { href: '/api/login', method: 'POST' }
                });
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                data: {
                    username: escapeHtml(user.username),
                    role: escapeHtml(user.role || 'user'),
                    validated: user.validated || false,
                },
                links: {
                    self: { href: '/api/users/me', method: 'GET' },
                    reports: { href: '/api/reports/me', method: 'GET' }
                }
            }));
        } catch (err) {
            console.error('getCurrentUser error:', err);
            return ErrorFactory.createError(res, 500, 'INTERNAL_SERVER_ERROR', 'Internal server error', {});
        }
    };
    static validateUser = async (req, res, params = {}) => {
        try {
            const sessionId = getSessionId(req);
            if (!sessionId) {
                return ErrorFactory.createError(res, 401, 'NOT_AUTHENTICATED', 'Not authenticated', {
                    login: { href: '/api/login', method: 'POST' }
                });
            }

            const session = await Session.findBySessionId(sessionId);
            if (!session || session.role !== 'admin') {
                return ErrorFactory.createError(res, 403, 'FORBIDDEN', 'Forbidden', {
                    profile: { href: '/api/users/me', method: 'GET' }
                });
            }

            const userId = params.id;
            if (!userId) {
                return ErrorFactory.createError(res, 400, 'USER_ID_REQUIRED', 'User ID is required', {
                    users: { href: '/api/users', method: 'GET' }
                });
            }
            

            await User.update(userId, { validated: true });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: true,
                message: 'User validated successfully',
                links: {
                    self: { href: `/api/users/${userId}/validate`, method: 'POST' },
                    users: { href: '/api/users', method: 'GET' }
                }
            }));
        } catch (err) {
            console.error('validateUser error:', err);
            return ErrorFactory.createError(res, 500, 'INTERNAL_SERVER_ERROR', 'Internal server error', {});
        }
    };
    static changeUserRole = async (req, res, params = {}) => {
        try {
            const sessionId = getSessionId(req);
            if (!sessionId) {
                return ErrorFactory.createError(res, 401, 'NOT_AUTHENTICATED', 'Not authenticated', {
                    login: { href: '/api/login', method: 'POST' }
                });
            }

            const session = await Session.findBySessionId(sessionId);
            if (!session || session.role !== 'admin') {
                return ErrorFactory.createError(res, 403, 'FORBIDDEN', 'Forbidden', {
                    profile: { href: '/api/users/me', method: 'GET' }
                });
            }

            const userId = params.id;
            if (!userId) {
                return ErrorFactory.createError(res, 400, 'USER_ID_REQUIRED', 'User ID is required', {
                    users: { href: '/api/users', method: 'GET' }
                });
            }

            const data = await getRequestBody(req);
            console.log('Request data:', data);
            const newRole = data.role;
            if (!newRole) {
                return ErrorFactory.createError(res, 400, 'ROLE_REQUIRED', 'New role is required', {
                    users: { href: '/api/users', method: 'GET' }
                });
            }

            const validRoles = ['user', 'authority', 'admin'];
            if (!validRoles.includes(newRole)) {
                return ErrorFactory.createError(res, 400, 'INVALID_ROLE', 'Invalid role', {
                    users: { href: '/api/users', method: 'GET' }
                });
            }

            await User.update(userId, { role: newRole });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: true,
                message: 'User role updated successfully',
                links: {
                    self: { href: `/api/users/${userId}/role`, method: 'PATCH' },
                    users: { href: '/api/users', method: 'GET' }
                }
            }));
        } catch (err) {
            console.error('changeUserRole error:', err);
            return ErrorFactory.createError(res, 500, 'INTERNAL_SERVER_ERROR', 'Internal server error', {});
        }
    }
}
