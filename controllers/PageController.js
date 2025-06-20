import {servePage} from "../servePage.js";

export class PageController {
    static home = servePage("home.html");
    static report = servePage("report.html");
    static dashboard = servePage("dashboard.html");
}
