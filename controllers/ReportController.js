import https from 'https'
import { Report } from '../models/Report.js'
import { User } from '../models/User.js'
import { Session } from '../models/Session.js'
import { escapeHtml } from '../utils/xssProtection.js'
import { ErrorFactory } from '../utils/ErrorFactory.js'

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
    const suburb = address.suburb || locality
    return { locality, county, suburb }
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
                    ErrorFactory.createError(res, 401, 'UNAUTHORIZED', 'Authentication required')
                    return
                }

                const reportData = JSON.parse(body)
                const { lat, lng } = reportData
                const address = await reverseGeocode(lat, lng)
                const { locality, county, suburb } = getLocalityAndCounty(address)
                reportData.county = county
                reportData.locality = locality
                reportData.suburb = suburb
                reportData.username = user.username // track who reported

                const result = await Report.create(reportData)
                if (!result) {
                    ErrorFactory.createError(res, 500, 'SAVE_FAILED', 'Failed to save report')
                    return
                }

                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ message: 'Report received successfully!' }))
            } catch (error) {
                console.error('Create report error:', error)
                ErrorFactory.createError(res, 400, 'INVALID_REQUEST', 'Invalid JSON or failed to save report')
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
            ErrorFactory.createError(res, 500, 'FETCH_FAILED', 'Failed to fetch counties')
        }
    }

    static async getAllLocalities(req, res, params = {}) {
        try {
            const localities = await Report.getAllLocalities()
            const sanitized = localities.map(escapeHtml)
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' })
            res.end(JSON.stringify({ localities: sanitized }))
        } catch (err) {
            ErrorFactory.createError(res, 500, 'FETCH_FAILED', 'Failed to fetch localities')
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
            ErrorFactory.createError(res, 500, 'FETCH_FAILED', 'Failed to fetch reports')
        }
    }

    static async getMyReports(req, res, params = {}) {
        const user = await getAuthenticatedUser(req)
        if (!user) {
            ErrorFactory.createError(res, 401, 'UNAUTHORIZED', 'Authentication required')
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
            ErrorFactory.createError(res, 500, 'FETCH_FAILED', 'Failed to fetch your reports')
        }
    }

    static async getReportCount(req, res, params = {}) {
        try {
            const reports = await Report.findAll();
            const count = reports.length;
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' })
            res.end(JSON.stringify({ count }));
        } catch (err) {
            ErrorFactory.createError(res, 500, 'FETCH_FAILED', 'Failed to fetch report count')
        }
    }

    static async getAllUsers(req, res, params = {}) {
        const user = await getAuthenticatedUser(req)
        if (!requireRole(user, ['admin'])) {
            ErrorFactory.createError(res, 403, 'FORBIDDEN', 'Admin access required')
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
            ErrorFactory.createError(res, 500, 'FETCH_FAILED', 'Failed to fetch users')
        }
    }

    static async getUserCount(req, res, params = {}) {
        try {
            const users = await User.findAll()
            const count = users.length
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' })
            res.end(JSON.stringify({ count }))
        } catch (err) {
            ErrorFactory.createError(res, 500, 'FETCH_FAILED', 'Failed to fetch user count')
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
            ErrorFactory.createError(res, 400, 'MISSING_PARAMETER', 'Report ID is required')
            return
        }
        const reportUser = await Report.findById(reportId)
        if (!reportUser) {
            ErrorFactory.createError(res, 404, 'NOT_FOUND', 'Report not found')
            return
        }


        const user = await getAuthenticatedUser(req)
        if (user.username !== reportUser.username) {
            if (!requireRole(user, ['admin', 'authority'])) {
                ErrorFactory.createError(res, 403, 'FORBIDDEN', 'Access denied')
                return
            }
        }

        try {
            await Report.delete(reportId)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true }))
        } catch (err) {
            ErrorFactory.createError(res, 500, 'DELETE_FAILED', 'Failed to delete report')
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
            ErrorFactory.createError(res, 403, 'FORBIDDEN', 'Admin access required')
            return
        }

        try {
            const userId = params.id
            if (!userId) {
                ErrorFactory.createError(res, 400, 'MISSING_PARAMETER', 'User ID is required')
                return
            }
            await User.delete(userId)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true }))
        } catch (err) {
            ErrorFactory.createError(res, 500, 'DELETE_FAILED', 'Failed to delete user')
        }
    }

    static async getReportsByLocality(req, res, params = {}) {
        try {
            const locality = params.locality
            if (!locality) {
                ErrorFactory.createError(res, 400, 'MISSING_PARAMETER', 'Locality parameter is required')
                return
            }

            console.log('Fetching reports for locality:', locality)
            const reports = await Report.findByLocality(locality)
            const sanitized = reports.map(r => ({
                ...r,
                county: escapeHtml(r.county || ''),
                locality: escapeHtml(r.locality || ''),
                suburb: escapeHtml(r.suburb || ''),
                category: escapeHtml(r.category || ''),
                description: escapeHtml(r.description || ''),
                severity: escapeHtml(r.severity || '')
            }))
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' })
            res.end(JSON.stringify(sanitized))
        } catch (err) {
            console.error('Error fetching reports by locality:', err)
            ErrorFactory.createError(res, 500, 'FETCH_FAILED', 'Failed to fetch reports for locality')
        }
    }

    static async getSupportedLocalities(req, res, params = {}) {
        try {
            const { getSupportedLocalities } = await import('../config/geoMapping.js');
            const localities = getSupportedLocalities();
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' })
            res.end(JSON.stringify({ localities }))
        } catch (err) {
            console.error('Error fetching supported localities:', err)
            ErrorFactory.createError(res, 500, 'FETCH_FAILED', 'Failed to fetch supported localities')
        }
    }

    static async getGeoJsonForLocality(req, res, params = {}) {
        try {
            const locality = params.locality
            if (!locality) {
                ErrorFactory.createError(res, 400, 'MISSING_PARAMETER', 'Locality parameter is required')
                return
            }

            const { getGeoJsonPath } = await import('../config/geoMapping.js')
            const geoJsonPath = getGeoJsonPath(locality)

            if (!geoJsonPath) {
                ErrorFactory.createError(res, 404, 'NOT_FOUND', 'GeoJSON not found for locality')
                return
            }

            const fs = await import('fs')
            const path = await import('path')
            const fullPath = path.join(process.cwd(), 'public', geoJsonPath)

            try {
                const geoJsonData = await fs.promises.readFile(fullPath, 'utf8')
                res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' })
                res.end(geoJsonData)
            } catch (fileError) {
                console.error('Error reading GeoJSON file:', fileError)
                ErrorFactory.createError(res, 404, 'FILE_NOT_FOUND', 'GeoJSON file not found')
            }
        } catch (err) {
            console.error('Error serving GeoJSON:', err)
            ErrorFactory.createError(res, 500, 'SERVER_ERROR', 'Failed to serve GeoJSON')
        }
    }

    static async getReportsForChart(req, res, params = {}) {
        try {
            const url = await import('url')
            const parsedUrl = url.parse(req.url, true)
            const locality = params.locality
            const startDate = parsedUrl.query.startDate
            const endDate = parsedUrl.query.endDate

            console.log('Fetching reports for chart:', { locality, startDate, endDate })

            if (!locality) {
                ErrorFactory.createError(res, 400, 'MISSING_PARAMETER', 'Locality parameter is required')
                return
            }

            if (!startDate || !endDate) {
                ErrorFactory.createError(res, 400, 'MISSING_PARAMETER', 'Start date and end date are required')
                return
            }

            const reports = await Report.findByLocalityAndDateRange(locality, startDate, endDate)
            const sanitized = reports.map(r => ({
                ...r,
                county: escapeHtml(r.county || ''),
                locality: escapeHtml(r.locality || ''),
                suburb: escapeHtml(r.suburb || ''),
                category: escapeHtml(r.category || ''),
                description: escapeHtml(r.description || ''),
                severity: escapeHtml(r.severity || ''),
                timestamp: r.timestamp
            }))

            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' })
            res.end(JSON.stringify(sanitized))
        } catch (err) {
            console.error('Error fetching reports for chart:', err)
            ErrorFactory.createError(res, 500, 'FETCH_FAILED', 'Failed to fetch reports for chart')
        }
    }
}
