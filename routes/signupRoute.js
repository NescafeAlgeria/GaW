import { insert, findOne } from "../db.js";
import { parse } from 'querystring';
import bcrypt from 'bcrypt';

const signupRoute = (req, res) => {
    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            const data = parse(body);
            const { username, email, password } = data;

            try {
                const existingUser = await findOne('users', { $or: [{ email }, { username }] });

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

                await insert('users', user);
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
}

export default signupRoute;