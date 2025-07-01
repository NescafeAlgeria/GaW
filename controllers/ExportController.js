import { Report } from '../models/Report.js';
import generatePdfBuffer from '../utils/generatePdfBuffer.js';
import generateCsvBuffer from '../utils/generateCsvBuffer.js';
import { generateHtmlBuffer } from '../utils/generateHtmlBuffer.js';
import { ErrorFactory } from '../utils/ErrorFactory.js';

export class ExportController {
    static async exportReport(req, res) {
        try {
            const { searchParams } = new URL(req.url, `http://${req.headers.host}`);

            const county = searchParams.get('county');
            const locality = searchParams.get('locality');
            const format = (searchParams.get('format') || 'pdf').toLowerCase();
            const startDate = searchParams.get('startDate');
            const endDate = searchParams.get('endDate');

            if (!county && !locality) {
                return ErrorFactory.createError(res, 400, 'MISSING_PARAMETER', 'Either county or locality parameter is required', {
                    reports: { href: '/api/reports', method: 'GET' },
                    counties: { href: '/api/reports/cities', method: 'GET' },
                    localities: { href: '/api/reports/localities', method: 'GET' }
                });
            }

            if (county && locality) {
                return ErrorFactory.createError(res, 400, 'CONFLICTING_PARAMETERS', 'Cannot specify both county and locality parameters', {
                    reports: { href: '/api/reports', method: 'GET' },
                    counties: { href: '/api/reports/cities', method: 'GET' },
                    localities: { href: '/api/reports/localities', method: 'GET' }
                });
            }

            if (!['pdf', 'csv', 'html'].includes(format)) {
                return ErrorFactory.createError(res, 400, 'INVALID_FORMAT', 'Format must be either "pdf", "csv", or "html"', {
                    reports: { href: '/api/reports', method: 'GET' }
                });
            }

            let reports;
            let sanitizedName;
            let groupBy;

            if (county) {
                reports = await Report.findByCounty(county, startDate, endDate);
                sanitizedName = county.replace(/[^a-zA-Z0-9-_]/g, '_');
                groupBy = 'locality';
            } else {
                reports = await Report.findByLocality(locality, startDate, endDate);
                sanitizedName = locality.replace(/[^a-zA-Z0-9-_]/g, '_');
                groupBy = 'suburb';
            }

            if (format === 'csv') {
                const csvBuffer = generateCsvBuffer(reports, startDate, endDate, groupBy);
                res.writeHead(200, {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="${sanitizedName}_report.csv"`,
                    'Cache-Control': 'private, max-age=0'
                });
                res.end(csvBuffer);
            } else if (format === 'html') {
                const htmlBuffer = await generateHtmlBuffer(reports, county, locality, startDate, endDate);
                res.writeHead(200, {
                    'Content-Type': 'text/html',
                    'Content-Disposition': `attachment; filename="${sanitizedName}_report.html"`,
                    'Cache-Control': 'private, max-age=0'
                });
                res.end(htmlBuffer);
            } else {
                const pdfBuffer = await generatePdfBuffer(reports, startDate, endDate, groupBy);
                res.writeHead(200, {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `inline; filename="${sanitizedName}_report.pdf"`,
                    'Cache-Control': 'private, max-age=0'
                });
                res.end(pdfBuffer);
            }

        } catch (err) {
            console.error('Export error:', err);
            return ErrorFactory.createError(res, 500, 'EXPORT_FAILED', 'Failed to generate report: ' + err.message, {
                reports: { href: '/api/reports', method: 'GET' }
            });
        }
    }
}
