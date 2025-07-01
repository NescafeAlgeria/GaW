import fs from 'fs';
import path from 'path';

export const servePage = (pageName) => {
    const filePath = path.join(process.cwd(), 'public', 'views', pageName);

    return (req, res) => {
        fs.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error loading page');
                return;
            }

            res.writeHead(200, {
                'Content-Type': 'text/html'
            });
            res.end(content);
        });
    };
};
