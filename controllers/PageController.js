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
    static map = servePage("map.html");
    static mapLoader = servePage("map-loader.html");

    static manageRecyclePoints = servePage("manage-recycle-points.html");
    static manageRecyclePointsLoader = servePage("manage-recycle-points-loader.html");
}
