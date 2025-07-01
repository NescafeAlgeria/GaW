import https from 'https'
import { Report } from '../models/Report.js'
import { User } from '../models/User.js'
import { Session } from '../models/Session.js'
import { escapeHtml } from '../utils/xssProtection.js'

// Helper: Get user from Authorization header
async function getAuthenticatedUser(req) {
    const authHeader = req.headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) return null
    const sessionId = authHeader.split(' ')[1]
    const session = await Session.findBySessionId(sessionId)
    if (!session) return null
    return await User.findByUsername(session.username)
}

// Helper: Role check
function requireRole(user, allowedRoles) {
    return user && allowedRoles.includes(user.role)
}

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
    const localityPriority = ['city', 'municipality', 'town', 'village', 'borough', 'suburb', 'neighbourhood']
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
    static async create(req, res, params = {}) {
        // if (req.method !== 'POST') {
        //     res.writeHead(405, { 'Content-Type': 'text/plain' })
        //     res.end('Method Not Allowed')
        //     return
        // }

        let body = ''
        req.on('data', chunk => body += chunk.toString())
        req.on('end', async () => {
            try {
                const user = await getAuthenticatedUser(req)
                if (!user) {
                    res.writeHead(401, { 'Content-Type': 'application/json' })
                    res.end(JSON.stringify({ error: 'Unauthorized' }))
                    return
                }

                const reportData = JSON.parse(body)
                const { lat, lng } = reportData
                const address = await reverseGeocode(lat, lng)
                const { locality, county } = getLocalityAndCounty(address)
                reportData.county = county
                reportData.locality = locality
                reportData.username = user.username // track who reported

                const result = await Report.create(reportData)
                if (!result) {
                    res.writeHead(500, { 'Content-Type': 'application/json' })
                    res.end(JSON.stringify({ error: 'Failed to save report.' }))
                    return
                }

                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ message: 'Report received successfully!' }))
            } catch (error) {
                console.error('Create report error:', error)
                res.writeHead(400, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: 'Invalid JSON or failed to save report.' }))
            }
        })
    }

    static async getAllCounties(req, res, params = {}) {
        try {
            const counties = await Report.getAllCounties()
            const sanitized = counties.map(escapeHtml)
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' })
            res.end(JSON.stringify({ counties: sanitized }))
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Failed to fetch counties' }))
        }
    }

    static async getAllReports(req, res, params = {}) {
        try {
            const reports = await Report.findAll()
            const sanitized = reports.map(r => ({
                ...r,
                county: escapeHtml(r.county || ''),
                locality: escapeHtml(r.locality || ''),
                category: escapeHtml(r.category || ''),
                description: escapeHtml(r.description || ''),
                severity: escapeHtml(r.severity || '')
            }))
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' })
            res.end(JSON.stringify(sanitized))
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Failed to fetch reports' }))
        }
    }

    static async getMyReports(req, res, params = {}) {
        const user = await getAuthenticatedUser(req)
        if (!user) {
            res.writeHead(401, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Unauthorized' }))
            return
        }
        try {
            const reports = await Report.findAll({ username: user.username })
            const sanitized = reports.map(r => ({
                ...r,
                county: escapeHtml(r.county || ''),
                locality: escapeHtml(r.locality || ''),
                category: escapeHtml(r.category || ''),
                description: escapeHtml(r.description || ''),
                severity: escapeHtml(r.severity || '')
            }))
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' })
            res.end(JSON.stringify(sanitized))
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Failed to fetch your reports' }))
        }
    }

    static async getReportCount(req, res, params = {}) {
        try {
            const reports = await Report.findAll();
            const count = reports.length;
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' })
            res.end(JSON.stringify({ count }));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Failed to fetch report count' }))
        }
    }

    static async getAllUsers(req, res, params = {}) {
        const user = await getAuthenticatedUser(req)
        if (!requireRole(user, ['admin'])) {
            res.writeHead(403, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Forbidden' }))
            return
        }

        try {
            const users = await User.findAll()
            const sanitized = users.map(u => ({
                ...u,
                username: escapeHtml(u.username || ''),
                email: escapeHtml(u.email || ''),
                role: escapeHtml(u.role || '')
            }))
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' })
            res.end(JSON.stringify(sanitized))
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Failed to fetch users' }))
        }
    }

    static async getUserCount(req, res, params = {}) {
        try {
            const users = await User.findAll()
            const count = users.length
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' })
            res.end(JSON.stringify({ count }))
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Failed to fetch user count' }))
        }
    }

    static async deleteReport(req, res, params = {}) {
        // if (req.method !== 'DELETE') {
        //     res.writeHead(405, { 'Content-Type': 'text/plain' })
        //     res.end('Method Not Allowed')
        //     return
        // }

        const reportId = params.id
        if (!reportId) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Report ID is required' }))
            return
        }
        const reportUser = await Report.findById(reportId)
        if (!reportUser) {
            res.writeHead(404, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Report not found' }))
            return
        }


        const user = await getAuthenticatedUser(req)
        if(user.username !== reportUser.username) {
            if (!requireRole(user, ['admin', 'authority'])) {
            res.writeHead(403, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Forbidden' }))
            return
        }
        }

        try {
            await Report.delete(reportId)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true }))
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Failed to delete report' }))
        }
    }

    static async deleteUser(req, res, params = {}) {
        // if (req.method !== 'DELETE') {
        //     res.writeHead(405, { 'Content-Type': 'text/plain' })
        //     res.end('Method Not Allowed')
        //     return
        // }

        const user = await getAuthenticatedUser(req)
        if (!requireRole(user, ['admin'])) {
            res.writeHead(403, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Forbidden' }))
            return
        }

        try {
            const userId = params.id
            if (!userId) {
                res.writeHead(400, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: 'User ID is required' }))
                return
            }
            await User.delete(userId)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true }))
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Failed to delete user' }))
        }
    }
}
