import {servePage} from "../../servePage.js";

/**
 * Home page route handler for Garbage Reporting Platform
 * @param {http.IncomingMessage} req - The request object
 * @param {http.ServerResponse} res - The response object
 */
const homePageRoute = servePage("home.html");

export default homePageRoute;