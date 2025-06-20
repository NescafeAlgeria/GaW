import fs from 'fs';
import path from 'path';
import url from 'url';
import { Report } from '../models/Report.js';
import generatePdfBuffer from '../utils/generatePdfBuffer.js';
import generateCsvBuffer from '../utils/generateCsvBuffer.js';

const STATIC_PATH = path.join(process.cwd(), './public');
const SAMPLE_PDF_PATH = path.join(STATIC_PATH, 'sample.pdf');

export class ExportController {
    static async exportReport(req, res) {
        if (req.method !== 'GET') {
            res.writeHead(405, {'Content-Type': 'text/plain'})
            res.end('Method Not Allowed')
            return;
        }

        try {
            const parsedUrl = url.parse(req.url, true);
            const county = parsedUrl.query.county;
            const format = parsedUrl.query.format || 'pdf';
            const startDate = parsedUrl.query.startDate;
            const endDate = parsedUrl.query.endDate;

            if (!county) {
                res.writeHead(400, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({error: 'County parameter is required'}));
                return;
            }

            if (!['pdf', 'csv'].includes(format.toLowerCase())) {
                res.writeHead(400, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({error: 'Format must be either "pdf" or "csv"'}));
                return;
            }

            const allReports = await Report.findByCounty(county, startDate, endDate);

            if (format.toLowerCase() === 'csv') {
                const csvBuffer = generateCsvBuffer(allReports, startDate, endDate);
                
                res.writeHead(200, {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="${county}_report.csv"`
                });
                res.end(csvBuffer);
            } else {
                const pdfBuffer = await generatePdfBuffer(allReports, startDate, endDate);
                
                res.writeHead(200, {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `inline; filename="${county}_report.pdf"`
                });
                res.end(pdfBuffer);
            }
        } catch (error) {
            console.error('Error generating report:', error);
            res.writeHead(500, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({error: 'Failed to generate report: ' + error.message}));
        }
    }
}
