export class ErrorFactory{
    static createError(res, statusCode, code, message, links){
        res.statusCode = statusCode;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        res.end(JSON.stringify({
            success: false,
            error: {
                code: code,
                message: message
            },
            links: links || {}
        }));
    }
}