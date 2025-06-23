import https from 'https'
import { Report } from '../models/Report.js'
import { User } from '../models/User.js'
import { escapeHtml } from '../utils/xssProtection.js'

function reverseGeocode(lat, lon) {
    return new Promise((resolve, reject) => {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`
        const options = { headers: { 'User-Agent': 'GaW' } }
        https.get(url, options, (res) => {
            let data = ''
            res.on('data', chunk => data += chunk)
            res.on('end', () => {
                try {
                    const json = JSON.parse(data)
                    resolve(json.address)
                } catch (err) {
                    reject(err)
                }
            })
        }).on('error', reject)
    })
}

function getLocalityAndCounty(address) {
    const localityPriority = ['city', 'municipality', 'town', 'village', 'borough', 'suburb', 'neighbourhood'];
    let locality = 'Unknown'
    for (const key of localityPriority) {
        if (address[key]) {
            locality = address[key]
            break
        }
    }
    const county = address.county || 'Unknown'
    return { locality, county }
}

export class ReportController {
    static async create(req, res) {
        if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'text/plain' })
            res.end('Method Not Allowed')
            return
        }

        let body = ''
        req.on('data', chunk => body += chunk.toString())
        req.on('end', async () => {
            try {
                const reportData = JSON.parse(body)
                const { lat, lng } = reportData
                const address = await reverseGeocode(lat, lng)
                const { locality, county } = getLocalityAndCounty(address)
                reportData.county = county
                reportData.locality = locality
                const result = await Report.create(reportData)
                if (!result) {
                    res.writeHead(500, { 'Content-Type': 'application/json' })
                    res.end(JSON.stringify({ error: 'Failed to save report.' }))
                    return
                }
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ message: 'Report received successfully!' }))
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: 'Invalid JSON or failed to save report.' }))
            }
        })
    }

    static async getAllCounties(req, res) {
        try {
            const counties = await Report.getAllCounties();
            const sanitizedCounties = counties.map(county => escapeHtml(county));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ counties: sanitizedCounties }));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to fetch counties' }));
        }
    }

    static async getAllReports(req, res) {
        try {
            const reports = await Report.findAll();
            const sanitizedReports = reports.map(report => ({
                ...report,
                county: escapeHtml(report.county || ''),
                locality: escapeHtml(report.locality || ''),
                category: escapeHtml(report.category || ''),
                description: escapeHtml(report.description || ''),
                severity: escapeHtml(report.severity || '')
            }));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(sanitizedReports));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to fetch reports' }));
        }
    }

    static async getAllUsers(req, res) {
        try {
            const users = await User.findAll();
            const sanitizedUsers = users.map(user => ({
                ...user,
                username: escapeHtml(user.username || ''),
                email: escapeHtml(user.email || ''),
                role: escapeHtml(user.role || '')
            }));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(sanitizedUsers));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to fetch users' }));
        }
    }

    static async deleteReport(req, res) {
        if (req.method !== 'DELETE') {
            res.writeHead(405, { 'Content-Type': 'text/plain' });
            res.end('Method Not Allowed');
            return;
        }

        try {
            const reportId = req.url.split('/').pop();
            await Report.delete(reportId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to delete report' }));
        }
    }

    static async deleteUser(req, res) {
        if (req.method !== 'DELETE') {
            res.writeHead(405, { 'Content-Type': 'text/plain' });
            res.end('Method Not Allowed');
            return;
        }

        try {
            const userId = req.url.split('/').pop();
            await User.delete(userId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to delete user' }));
        }
    }
}
