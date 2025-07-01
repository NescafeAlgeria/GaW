import { Report } from '../models/Report.js';
import generatePdfBuffer from '../utils/generatePdfBuffer.js';
import generateCsvBuffer from '../utils/generateCsvBuffer.js';

export class ExportController {
    static async exportReport(req, res) {
        try {
            const { searchParams } = new URL(req.url, `http://${req.headers.host}`);

            const county = searchParams.get('county');
            const format = (searchParams.get('format') || 'pdf').toLowerCase();
            const startDate = searchParams.get('startDate');
            const endDate = searchParams.get('endDate');

            if (!county) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'County parameter is required' }));
                return;
            }

            if (!['pdf', 'csv'].includes(format)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Format must be either "pdf" or "csv"' }));
                return;
            }

            const reports = await Report.findByCounty(county, startDate, endDate);
            const sanitizedName = county.replace(/[^a-zA-Z0-9-_]/g, '_');

            if (format === 'csv') {
                const csvBuffer = generateCsvBuffer(reports, startDate, endDate);
                res.writeHead(200, {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="${sanitizedName}_report.csv"`
                });
                res.end(csvBuffer);
            } else {
                const pdfBuffer = await generatePdfBuffer(reports, startDate, endDate);
                res.writeHead(200, {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `inline; filename="${sanitizedName}_report.pdf"`
                });
                res.end(pdfBuffer);
            }

        } catch (err) {
            console.error('Export error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to generate report: ' + err.message }));
        }
    }
}
