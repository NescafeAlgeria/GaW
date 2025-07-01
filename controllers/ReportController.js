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
        let body = ''
        req.on('data', chunk => body += chunk.toString())
        req.on('end', async () => {
            try {
                const user = await getAuthenticatedUser(req)
                if (!user) {
                    return ErrorFactory.createError(res, 401, 'UNAUTHORIZED', 'Unauthorized', {
                        login: { href: '/api/login', method: 'POST' }
                    });
                }

                const reportData = JSON.parse(body)
                const { lat, lng } = reportData
                const address = await reverseGeocode(lat, lng)
                const { locality, county, suburb } = getLocalityAndCounty(address)
                reportData.county = county
                reportData.locality = locality
                reportData.suburb = suburb
                reportData.username = user.username

                const result = await Report.create(reportData)
                if (!result) {
                    return ErrorFactory.createError(res, 500, 'SAVE_FAILED', 'Failed to save report', {
                        reports: { href: '/api/reports', method: 'GET' }
                    });
                }

                res.writeHead(201, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ 
                    success: true,
                    message: 'Report received successfully!',
                    links: {
                        self: { href: '/api/reports', method: 'POST' },
                        reports: { href: '/api/reports', method: 'GET' },
                        'my-reports': { href: '/api/reports/me', method: 'GET' }
                    }
                }))
            } catch (error) {
                console.error('Create report error:', error)
                return ErrorFactory.createError(res, 400, 'INVALID_DATA', 'Invalid JSON or failed to save report', {
                    reports: { href: '/api/reports', method: 'GET' }
                });
            }
        })
    }

    static async getAllCounties(req, res, params = {}) {
        try {
            const counties = await Report.getAllCounties()
            const sanitized = counties.map(escapeHtml)
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' })
            res.end(JSON.stringify({ 
                success: true,
                data: { counties: sanitized },
                links: {
                    self: { href: '/api/reports/cities', method: 'GET' },
                    localities: { href: '/api/reports/localities', method: 'GET' },
                    reports: { href: '/api/reports', method: 'GET' }
                }
            }))
        } catch (err) {
            return ErrorFactory.createError(res, 500, 'FETCH_FAILED', 'Failed to fetch counties', {
                reports: { href: '/api/reports', method: 'GET' }
            });
        }
    }

    static async getAllLocalities(req, res, params = {}) {
        try {
            const localities = await Report.getAllLocalities()
            const sanitized = localities.map(escapeHtml)
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' })
            res.end(JSON.stringify({ 
                success: true,
                data: { localities: sanitized },
                links: {
                    self: { href: '/api/reports/localities', method: 'GET' },
                    counties: { href: '/api/reports/cities', method: 'GET' },
                    reports: { href: '/api/reports', method: 'GET' }
                }
            }))
        } catch (err) {
            return ErrorFactory.createError(res, 500, 'FETCH_FAILED', 'Failed to fetch localities', {
                reports: { href: '/api/reports', method: 'GET' }
            });
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
                severity: escapeHtml(r.severity || ''),
                solved: escapeHtml(r.solved || 'false'),
            }))
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' })
            res.end(JSON.stringify({
                success: true,
                data: sanitized,
                links: {
                    self: { href: '/api/reports', method: 'GET' },
                    create: { href: '/api/reports', method: 'POST' },
                    counties: { href: '/api/reports/cities', method: 'GET' },
                    localities: { href: '/api/reports/localities', method: 'GET' },
                    export: { href: '/api/reports/export', method: 'GET' }
                }
            }))
        } catch (err) {
            return ErrorFactory.createError(res, 500, 'FETCH_FAILED', 'Failed to fetch reports', {
                counties: { href: '/api/reports/cities', method: 'GET' },
                localities: { href: '/api/reports/localities', method: 'GET' }
            });
        }
    }

    static async getMyReports(req, res, params = {}) {
        const user = await getAuthenticatedUser(req)
        if (!user) {
            return ErrorFactory.createError(res, 401, 'UNAUTHORIZED', 'Unauthorized', {
                login: { href: '/api/login', method: 'POST' }
            });
        }
        try {
            const reports = await Report.findAll({ username: user.username })
            const sanitized = reports.map(r => ({
                ...r,
                county: escapeHtml(r.county || ''),
                locality: escapeHtml(r.locality || ''),
                category: escapeHtml(r.category || ''),
                description: escapeHtml(r.description || ''),
                severity: escapeHtml(r.severity || ''),
                solved: escapeHtml(r.solved || 'false'),
            }))
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' })
            res.end(JSON.stringify({
                success: true,
                data: sanitized,
                links: {
                    self: { href: '/api/reports/me', method: 'GET' },
                    'create-report': { href: '/api/reports', method: 'POST' },
                    'all-reports': { href: '/api/reports', method: 'GET' },
                    profile: { href: '/api/users/me', method: 'GET' }
                }
            }))
        } catch (err) {
            return ErrorFactory.createError(res, 500, 'FETCH_FAILED', 'Failed to fetch your reports', {
                reports: { href: '/api/reports', method: 'GET' }
            });
        }
    }

    static async getReportCount(req, res, params = {}) {
        try {
            const reports = await Report.findAll();
            const count = reports.length;
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' })
            res.end(JSON.stringify({ 
                success: true,
                data: { count },
                links: {
                    self: { href: '/api/reports/count', method: 'GET' },
                    reports: { href: '/api/reports', method: 'GET' },
                    'user-count': { href: '/api/users/count', method: 'GET' }
                }
            }));
        } catch (err) {
            return ErrorFactory.createError(res, 500, 'FETCH_FAILED', 'Failed to fetch report count', {
                reports: { href: '/api/reports', method: 'GET' }
            });
        }
    }

    static async solveReport(req, res, params = {}) {
        const reportId = params.id
        if (!reportId) {
            return ErrorFactory.createError(res, 400, 'REPORT_ID_REQUIRED', 'Report ID is required', {
                reports: { href: '/api/reports', method: 'GET' }
            });
        }
        const report = await Report.findById(reportId)
        if (!report) {
            return ErrorFactory.createError(res, 404, 'REPORT_NOT_FOUND', 'Report not found', {
                reports: { href: '/api/reports', method: 'GET' }
            });
        }
        const user = await getAuthenticatedUser(req)
        if (!user) {
            return ErrorFactory.createError(res, 401, 'UNAUTHORIZED', 'Unauthorized', {
                login: { href: '/api/login', method: 'POST' }
            });
        }
            if (!requireRole(user, ['admin', 'authority'])) {
                return ErrorFactory.createError(res, 403, 'FORBIDDEN', 'Forbidden', {
                    profile: { href: '/api/users/me', method: 'GET' },
                    reports: { href: '/api/reports', method: 'GET' }
                });
            }

        try {
            await Report.solve(reportId)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ 
                success: true,
                message: 'Report marked as solved successfully',
                links: {
                    self: { href: `/api/reports/${reportId}/solve`, method: 'POST' },
                    report: { href: `/api/reports/${reportId}`, method: 'GET' },
                }
            }))
        } catch (err) {
            console.error('Solve report error:', err)
            return ErrorFactory.createError(res, 500, 'SOLVE_FAILED', 'Failed to mark report as solved', {
                reports: { href: '/api/reports', method: 'GET' }
            });
        }
    }

    static async getSolvedReportCount(req, res, params = {}) {
        try {
            const solvedReports = await Report.findAll({ solved: 'true' })
            const count = solvedReports.length
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' })
            res.end(JSON.stringify({ 
                success: true,
                data: { count },
                links: {
                    self: { href: '/api/reports/count/solved', method: 'GET' },
                    reports: { href: '/api/reports', method: 'GET' },
                }
            }))
        } catch (err) {
            console.error('Get solved report count error:', err)
            return ErrorFactory.createError(res, 500, 'FETCH_FAILED', 'Failed to fetch solved report count', {
                reports: { href: '/api/reports', method: 'GET' }
            });
        }
    }

    static async getAllUsers(req, res, params = {}) {
        const user = await getAuthenticatedUser(req)
        if (!requireRole(user, ['admin'])) {
            return ErrorFactory.createError(res, 403, 'FORBIDDEN', 'Forbidden', {
                profile: { href: '/api/users/me', method: 'GET' },
            });
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
            res.end(JSON.stringify({
                success: true,
                data: sanitized,
                links: {
                    self: { href: '/api/users', method: 'GET' },
                    'user-count': { href: '/api/users/count', method: 'GET' }
                }
            }))
        } catch (err) {
            return ErrorFactory.createError(res, 500, 'FETCH_FAILED', 'Failed to fetch users', {
                'user-count': { href: '/api/users/count', method: 'GET' }
            });
        }
    }

    static async getUserCount(req, res, params = {}) {
        try {
            const users = await User.findAll()
            const count = users.length
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' })
            res.end(JSON.stringify({ 
                success: true,
                data: { count },
                links: {
                    self: { href: '/api/users/count', method: 'GET' },
                    users: { href: '/api/users', method: 'GET' },
                    'report-count': { href: '/api/reports/count', method: 'GET' }
                }
            }))
        } catch (err) {
            return ErrorFactory.createError(res, 500, 'FETCH_FAILED', 'Failed to fetch user count', {
                users: { href: '/api/users', method: 'GET' }
            });
        }
    }

    static async deleteReport(req, res, params = {}) {
        const reportId = params.id
        if (!reportId) {
            return ErrorFactory.createError(res, 400, 'REPORT_ID_REQUIRED', 'Report ID is required', {
                reports: { href: '/api/reports', method: 'GET' }
            });
        }
        const reportUser = await Report.findById(reportId)
        if (!reportUser) {
            return ErrorFactory.createError(res, 404, 'REPORT_NOT_FOUND', 'Report not found', {
                reports: { href: '/api/reports', method: 'GET' }
            });
        }


        const user = await getAuthenticatedUser(req)
        if (user.username !== reportUser.username) {
            if (!requireRole(user, ['admin', 'authority'])) {
                return ErrorFactory.createError(res, 403, 'FORBIDDEN', 'Forbidden', {
                    profile: { href: '/api/users/me', method: 'GET' },
                    reports: { href: '/api/reports', method: 'GET' }
                });
            }
        }

        try {
            await Report.delete(reportId)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ 
                success: true,
                message: 'Report deleted successfully',
                links: {
                    reports: { href: '/api/reports', method: 'GET' },
                    'my-reports': { href: '/api/reports/me', method: 'GET' }
                }
            }))
        } catch (err) {
            return ErrorFactory.createError(res, 500, 'DELETE_FAILED', 'Failed to delete report', {
                reports: { href: '/api/reports', method: 'GET' }
            });
        }
    }

    static async deleteUser(req, res, params = {}) {
        const user = await getAuthenticatedUser(req)
        if (!requireRole(user, ['admin'])) {
            return ErrorFactory.createError(res, 403, 'FORBIDDEN', 'Forbidden', {
                profile: { href: '/api/users/me', method: 'GET' }
            });
        }

        try {
            const userId = params.id
            if (!userId) {
                return ErrorFactory.createError(res, 400, 'USER_ID_REQUIRED', 'User ID is required', {
                    users: { href: '/api/users', method: 'GET' }
                });
            }
            await User.delete(userId)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ 
                success: true,
                message: 'User deleted successfully',
                links: {
                    self: { href: `/api/users/${userId}`, method: 'DELETE' },
                    users: { href: '/api/users', method: 'GET' }
                }
            }))
        } catch (err) {
            return ErrorFactory.createError(res, 500, 'DELETE_FAILED', 'Failed to delete user', {
                users: { href: '/api/users', method: 'GET' }
            });
        }
    }
}
