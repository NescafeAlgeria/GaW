import { servePage } from "../servePage.js";

export class PageController {
    static home = servePage("home.html");
    static report = servePage("report.html");
    static login = servePage("login.html");
    static signup = servePage("signup.html");
    static token = servePage("token.html");
    static dashboard = servePage("dashboard.html");
    static adminDashboard = servePage("admin-dashboard.html");
    static authorityDashboard = servePage("authority-dashboard.html");
    static userDashboard = servePage("user-dashboard.html");

    // static dashboard = async (req, res) => {
    //     try {
    //         const authHeader = req.headers['authorization'];
    //         if (!authHeader || !authHeader.startsWith('Bearer ')) {
    //             res.writeHead(302, { 'Location': '/login' });
    //             res.end();
    //             return;
    //         }

    //         const sessionId = authHeader.split(' ')[1];
    //         if (!sessionId) {
    //             res.writeHead(302, { 'Location': '/login' });
    //             res.end();
    //             return;
    //         }

    //         const session = await Session.findBySessionId(sessionId);
    //         if (!session) {
    //             res.writeHead(302, { 'Location': '/login' });
    //             res.end();
    //             return;
    //         }

    //         const user = await User.findByUsername(session.username);
    //         if (!user) {
    //             res.writeHead(302, { 'Location': '/login' });
    //             res.end();
    //             return;
    //         }

    //         let dashboardFile;
    //         switch (user.role) {
    //             case 'admin':
    //                 dashboardFile = 'admin-dashboard.html';
    //                 break;
    //             case 'authority':
    //                 dashboardFile = 'authority-dashboard.html';
    //                 break;
    //             default:
    //                 dashboardFile = 'user-dashboard.html';
    //         }

    //         servePage(dashboardFile)(req, res);
    //     } catch (error) {
    //         console.error('Dashboard error:', error);
    //         res.writeHead(500, { 'Content-Type': 'text/plain' });
    //         res.end('Internal server error');
    //     }
    // };
    static manageRecyclePoints = servePage("manage-recycle-points.html");
}
