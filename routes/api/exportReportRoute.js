import fs from 'fs';
import path from 'path';
import url from 'url';
import {getReportsByCounty} from "../../services/reportService.js";
import generatePdfBuffer from "../../utils/generatePdfBuffer.js";

const STATIC_PATH = path.join(process.cwd(), './public');
const SAMPLE_PDF_PATH = path.join(STATIC_PATH, 'sample.pdf');

const exportReportRoute = async (req, res) => {
    if (req.method !== 'GET') {
        res.writeHead(405, {'Content-Type': 'text/plain'})
        res.end('Method Not Allowed')
        return;
    }

    try {
        const parsedUrl = url.parse(req.url, true);
        const county = parsedUrl.query.county;

        if (!county) {
            res.writeHead(400, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({error: 'County parameter is required'}));
            return;
        }

        const allReports = await getReportsByCounty(county);
        const pdfBuffer = await generatePdfBuffer(allReports);

        res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'inline; filename="report.pdf"'
        });
        res.end(pdfBuffer);
    } catch (error) {
        console.error('Error generating report:', error);
        res.writeHead(500, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({error: 'Failed to generate report: ' + error.message}));
    }
}

export default exportReportRoute

