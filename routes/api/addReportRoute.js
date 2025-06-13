const addReportRoute = (req, res) => {
    if (req.method === 'POST') {
        let body = '';

        req.on('data', (chunk) => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const reportData = JSON.parse(body);
                console.log('Received report:', reportData);

                const { severity, lat, lng, description } = reportData;
                console.log(`Severity: ${severity}, Latitude: ${lat}, Longitude: ${lng}, Description: ${description}`);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Report received successfully!' }));
            } catch (error) {
                console.error('Error parsing JSON:', error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
    } else {
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        res.end('Method Not Allowed');
    }
};

export default addReportRoute;