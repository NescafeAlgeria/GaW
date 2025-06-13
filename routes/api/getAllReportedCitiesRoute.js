import { getAllCounties } from '../../services/reportService.js';

const getAllReportedCitiesRoute = async (req, res) => {
    try {
        const counties = await getAllCounties();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ counties }));
    } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to fetch counties' }));
    }
};

export default getAllReportedCitiesRoute;

