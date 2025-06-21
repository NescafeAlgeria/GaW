import { parse } from 'querystring';
import bcrypt from 'bcrypt';
import { User } from '../models/User.js';

export class AuthController {
    static signup = (req, res) => {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                const data = parse(body);
                const { username, email, password } = data;

                try {
                    const existingUser = await User.findByEmailOrUsername(email, username);

                    if (existingUser) {
                        res.writeHead(400, { 'Content-Type': 'text/plain' });
                        res.end('User already exists');
                        return;
                    }

                    const hashedPassword = await bcrypt.hash(password, 10);

                    const user = {
                        username,
                        email,
                        hashedPassword
                    };

                    await User.create(user);
                    res.writeHead(302, { Location: '/' });
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

                    res.writeHead(302, { Location: '/home' });
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
}
