import {servePage} from "../servePage.js";
import { Session } from '../models/Session.js';
import { User } from '../models/User.js';

export class PageController {
    static home = servePage("home.html");
    static report = servePage("report.html");
    static login = servePage("login.html");
    static signup = servePage("signup.html");

    static dashboard = async (req, res) => {
        try {
            const cookies = req.headers.cookie;
            if (!cookies) {
                res.writeHead(302, { 'Location': '/login' });
                res.end();
                return;
            }

            const sessionId = cookies.split(';').find(c => c.trim().startsWith('sessionId='))?.split('=')[1];
            if (!sessionId) {
                res.writeHead(302, { 'Location': '/login' });
                res.end();
                return;
            }

            const session = await Session.findBySessionId(sessionId);
            if (!session) {
                res.writeHead(302, { 'Location': '/login' });
                res.end();
                return;
            }

            const user = await User.findByUsername(session.username);
            if (!user) {
                res.writeHead(302, { 'Location': '/login' });
                res.end();
                return;
            }

            let dashboardFile;
            switch (user.role) {
                case 'admin':
                    dashboardFile = 'admin-dashboard.html';
                    break;
                case 'authority':
                    dashboardFile = 'authority-dashboard.html';
                    break;
                default:
                    dashboardFile = 'user-dashboard.html';
            }

            servePage(dashboardFile)(req, res);
        } catch (error) {
            console.error('Dashboard error:', error);
            res.writeHead(302, { 'Location': '/login' });
            res.end();
        }
    };
}
