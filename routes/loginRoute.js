import { insert, findOne } from "../db.js";
import { parse } from 'querystring';
import bcrypt from 'bcrypt';

const loginRoute = (req, res) => {
    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            const data = JSON.parse(body);
            const { email, password } = data;

            try {
                const user = await findOne('users', { email });

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
}
export default loginRoute;