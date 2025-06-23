import { parse } from 'querystring';
import bcrypt from 'bcrypt';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';

export class AuthController {
    static signup = (req, res) => {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                const data = parse(body);
                const { username, email, password, role } = data;

                try {
                    const existingUser = await User.findByEmailOrUsername(email, username);

                    if (existingUser) {
                        res.writeHead(400, { 'Content-Type': 'text/plain' });
                        res.end('User already exists');
                        return;
                    }

                    const validRoles = ['user', 'authority'];
                    const userRole = validRoles.includes(role) ? role : 'user';

                    const hashedPassword = await bcrypt.hash(password, 10);

                    const user = {
                        username,
                        email,
                        hashedPassword,
                        role: userRole
                    };

                    await User.create(user);
                    const sessionId = await Session.create(username);
                    res.writeHead(302, { 
                        'Set-Cookie': `sessionId=${sessionId}; Path=/; Max-Age=3600`,
                        'Location' : '/' 
                    });
                    res.end();

                } catch (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Internal server error');
                    console.error(err);
                }
            });
        }
        else {
            res.writeHead(405, { 'Content-Type': 'text/plain' });
            res.end('Method Not Allowed');
        }
    };

    static login = (req, res) => {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                const data = parse(body);
                const { email, password } = data;

                try {
                    const user = await User.findByEmail(email);

                    if (!user) {
                        res.writeHead(401, { 'Content-Type': 'text/plain' });
                        res.end('Invalid email or password');
                        return;
                    }

                    const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);

                    if (!isPasswordValid) {
                        res.writeHead(401, { 'Content-Type': 'text/plain' });
                        res.end('Invalid email or password');
                        return;
                    }

                    const sessionId = await Session.create(user.username);
                    
                    res.writeHead(302, { 
                        'Set-Cookie': `sessionId=${sessionId};  Path=/; Max-Age=3600`, // 1 hour
                        'Location' : '/' 
                    });
                    res.end();

                } catch (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Internal server error');
                    console.error(err);
                }
            });
        } else {
            res.writeHead(405, { 'Content-Type': 'text/plain' });
            res.end('Method Not Allowed');
        }
    };

    static logout = (req, res) => {
        if (req.method === 'GET') {
            // console.log(req.headers);
            Session.destroy(req.headers.cookie?.sessionId)
                .then(() => {
                    res.writeHead(302, { 
                        'Set-Cookie': 'sessionId=; Path=/; Max-Age=0',
                        'Location': '/' 
                    });
                    res.end();
                })
                .catch(err => {
                    console.error('Logout error:', err);
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Internal server error');
                });
        } else {
            res.writeHead(405, { 'Content-Type': 'text/plain' });
            res.end('Method Not Allowed');
        }
    };

    static getCurrentUser = async (req, res) => {
        try {
            const cookies = req.headers.cookie;
            if (!cookies) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Not authenticated' }));
                return;
            }

            const sessionId = cookies.split(';').find(c => c.trim().startsWith('sessionId='))?.split('=')[1];
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
            res.end(JSON.stringify({ username: user.username, role: user.role }));
        } catch (error) {
            console.error('getCurrentUser error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
    };
}
