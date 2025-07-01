import url from 'url';
import { RecyclePoint } from "../models/RecyclePoint.js";
import { ErrorFactory } from "../utils/ErrorFactory.js";

export class RecyclePointController {
    static generalLinks = {
        self: '/recycle-points',
        delete: '/recycle-points',
        collection: '/recycle-points'
    }

    static itemLinks = (id) => ({
        self: `/recycle-points/${id}`,
        delete: `/recycle-points/${id}`,
        collection: '/recycle-points'
    })

    static async create(req, res) {

        if (req.method !== "POST") {
            ErrorFactory.createError(res, 405, "BAD_METHOD", "HTTP method not allowed", RecyclePointController.generalLinks);
            return;
        }

        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                await RecyclePoint.create(data);

                res.statusCode = 201;
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Cache-Control', 'no-cache, no-store');
                res.end(
                    JSON.stringify({
                        success: true,
                        message: "Recycle point created successfully.",
                        links: RecyclePointController.generalLinks
                    })
                );
            } catch (error) {
                ErrorFactory.createError(res, 400, "BAD_REQUEST", "Invalid JSON or failed to save recycle point.", RecyclePointController.generalLinks);
            }
        });
    }

    static async get(req, res) {
        try {
            if (req.method !== "GET") {
                ErrorFactory.createError(res, 405, "BAD_METHOD", "HTTP method not allowed", RecyclePointController.generalLinks);
                return;
            }

            const parsedUrl = url.parse(req.url, true);
            const pathName = parsedUrl.pathname;

            const subpaths = pathName.split('/').filter(Boolean);

            const invalidPathError = () => {
                ErrorFactory.createError(res, 404, "NOT_FOUND", "Couldn't find the requested resource.", RecyclePointController.generalLinks);
            }

            if (subpaths.length < 2 || subpaths[1] !== 'recycle-points') {
                invalidPathError();
                return;
            }

            let jsonResponse;

            switch (subpaths.length) {
                case 2:
                    const dbResponse = await RecyclePoint.findAll();
                    const data = dbResponse.map(entry => ({
                        ...entry,
                        links: RecyclePointController.itemLinks(entry.id)
                    }));
                    jsonResponse = {
                        success: true,
                        data: data,
                        links: RecyclePointController.generalLinks
                    };
                    break;
                case 3:
                    if (subpaths[2]) {
                        const id = subpaths[2];
                        const recyclePoint = await RecyclePoint.findById(id);
                        if (!recyclePoint) {
                            invalidPathError();
                            return;
                        }
                        const data = recyclePoint;
                        jsonResponse = {
                            success: true,
                            data: {
                                ...data,
                                links: RecyclePointController.itemLinks(data.id)
                            }
                        }
                    }
                    break;
                default:
                    invalidPathError();
                    return;
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-cache');
            res.end(
                JSON.stringify(jsonResponse)
            );
        } catch (error) {
            console.error('Error in RecyclePointController Get:', error);
            ErrorFactory.createError(res, 500, "INTERNAL_SERVER_ERROR", "An unexpected error occurred.", RecyclePointController.generalLinks);
        }
    }

    static async delete(req, res, params = {}) {
        if (req.method !== "DELETE") {
            ErrorFactory.createError(res, 405, "BAD_METHOD", "HTTP method not allowed", RecyclePointController.generalLinks);
            return;
        }

        const id = params.id;
        if (!id) {
            ErrorFactory.createError(res, 400, "BAD_REQUEST", "Recycle point ID is required", RecyclePointController.generalLinks);
            return;
        }

        try {
            await RecyclePoint.deleteById(id);
            res.statusCode = 204;
            res.setHeader('Cache-Control', 'no-cache, no-store');
            res.end();
        } catch (error) {
            console.error('Error in RecyclePointController Delete:', error);
            ErrorFactory.createError(res, 500, "INTERNAL_SERVER_ERROR", "An unexpected error occurred.", RecyclePointController.generalLinks);
        }
    }

    static async AddGarbage(req, res) {
        if (req.method !== "POST") {
            ErrorFactory.createError(res, 405, "BAD_METHOD", "HTTP method not allowed", RecyclePointController.generalLinks);
            return;
        }

        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const { id, amount, category } = data;

                if (!id || !amount || amount <= 0 || !category) {
                    ErrorFactory.createError(res, 400, "BAD_REQUEST", "ID, category and valid amount required", RecyclePointController.generalLinks);
                    return;
                } const recyclePoint = await RecyclePoint.findById(id);
                if (!recyclePoint) {
                    ErrorFactory.createError(res, 404, "NOT_FOUND", "Recycle point not found", RecyclePointController.generalLinks);
                    return;
                }

                const currentFillAmount = recyclePoint.fillAmounts?.[category] || 0;
                const categoryCapacity = recyclePoint.capacities?.[category] || 0;
                const newFillAmount = currentFillAmount + amount;

                if (newFillAmount > categoryCapacity) {
                    ErrorFactory.createError(res, 400, "BAD_REQUEST", "Cannot add more garbage than available capacity for this category", RecyclePointController.generalLinks);
                    return;
                }

                await RecyclePoint.updateCapacity(id, category, newFillAmount);

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Cache-Control', 'no-cache');
                res.end(JSON.stringify({
                    success: true,
                    message: `Added ${amount}kg of ${category} garbage successfully`,
                    fillAmounts: { ...recyclePoint.fillAmounts, [category]: newFillAmount },
                    links: RecyclePointController.itemLinks(id)
                }));

            } catch (error) {
                console.error('Error adding garbage:', error);
                ErrorFactory.createError(res, 400, "BAD_REQUEST", "Invalid JSON or failed to add garbage", RecyclePointController.generalLinks);
            }
        });
    }

    static async ClearGarbage(req, res) {

        if (req.method !== "DELETE") {
            ErrorFactory.createError(res, 405, "BAD_METHOD", "HTTP method not allowed", RecyclePointController.generalLinks);
            return;
        }

        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                const data = JSON.parse(body);

                console.log(data);
                const { id, amount, category } = data;

                if (!id || !amount || amount <= 0 || !category) {
                    ErrorFactory.createError(res, 400, "BAD_REQUEST", "ID, category and valid amount required", RecyclePointController.generalLinks);
                    return;
                } const recyclePoint = await RecyclePoint.findById(id);
                if (!recyclePoint) {
                    ErrorFactory.createError(res, 404, "NOT_FOUND", "Recycle point not found", RecyclePointController.generalLinks);
                    return;
                }

                const currentFillAmount = recyclePoint.fillAmounts?.[category] || 0;
                const newFillAmount = Math.max(currentFillAmount - amount, 0);

                await RecyclePoint.updateCapacity(id, category, newFillAmount);

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Cache-Control', 'no-cache');
                res.end(JSON.stringify({
                    success: true,
                    message: `Cleared ${amount}kg of ${category} garbage successfully`,
                    fillAmounts: { ...recyclePoint.fillAmounts, [category]: newFillAmount },
                    links: RecyclePointController.itemLinks(id)
                }));

            } catch (error) {
                console.error('Error clearing garbage:', error);
                ErrorFactory.createError(res, 400, "BAD_REQUEST", "Invalid JSON or failed to clear garbage", RecyclePointController.generalLinks);
            }
        });
    }
}