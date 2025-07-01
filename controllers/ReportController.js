import https from 'https'
import { Report } from '../models/Report.js'
import { User } from '../models/User.js'
import { Session } from '../models/Session.js'
import { ErrorFactory } from '../utils/ErrorFactory.js'

async function getAuthenticatedUser(req) {
    const authHeader = req.headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) return null
    const sessionId = authHeader.split(' ')[1]
    const session = await Session.findBySessionId(sessionId)
    if (!session) return null
    return await User.findByUsername(session.username)
}

function requireRole(user, allowedRoles) {
    return user && allowedRoles.includes(user.role)
}

async function reverseGeocode(lat, lon) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`
    const response = await fetch(url, { headers: { 'User-Agent': 'GaW' } })
    if (!response.ok) {
        throw new Error(`Reverse geocoding failed: ${response.statusText}`)
    }
    const json = await response.json()
    return json.address
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
                ErrorFactory.createError(res, 400, 'INVALID_REQUEST', 'Invalid JSON or failed to save report')
                return ErrorFactory.createError(res, 400, 'INVALID_DATA', 'Invalid JSON or failed to save report', {
                    reports: { href: '/api/reports', method: 'GET' }
                });
            }
        })
    }

    static async getAllCounties(req, res, params = {}) {
        try {
            const counties = await Report.getAllCounties()
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' })
            res.end(JSON.stringify({
                success: true,
                data: { counties },
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
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' })
            res.end(JSON.stringify({
                success: true,
                data: { localities },
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
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' })
            res.end(JSON.stringify({
                success: true,
                data: reports,
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
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' })
            res.end(JSON.stringify({
                success: true,
                data: reports,
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
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' })
            res.end(JSON.stringify({
                success: true,
                data: users,
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

    static async getReportsByLocality(req, res, params = {}) {
        try {
            const locality = params.locality
            if (!locality) {
                return ErrorFactory.createError(res, 400, 'MISSING_PARAMETER', 'Locality parameter is required', {
                    localities: { href: '/api/reports/localities', method: 'GET' },
                    reports: { href: '/api/reports', method: 'GET' }
                })
            }

            const reports = await Report.findByLocality(locality)
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' })
            res.end(JSON.stringify({
                success: true,
                data: { reports },
                links: {
                    self: { href: `/api/reports/locality/${encodeURIComponent(locality)}`, method: 'GET' },
                    localities: { href: '/api/reports/localities', method: 'GET' },
                    reports: { href: '/api/reports', method: 'GET' }
                }
            }))
        } catch (err) {
            console.error('Error fetching reports by locality:', err)
            return ErrorFactory.createError(res, 500, 'FETCH_FAILED', 'Failed to fetch reports for locality', {
                localities: { href: '/api/reports/localities', method: 'GET' },
                reports: { href: '/api/reports', method: 'GET' }
            })
        }
    }

    static async getSupportedLocalities(req, res, params = {}) {
        try {
            const { getSupportedLocalities } = await import('../config/geoMapping.js');
            const localities = getSupportedLocalities();
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' })
            res.end(JSON.stringify({
                success: true,
                data: { localities },
                links: {
                    self: { href: '/api/localities/supported', method: 'GET' },
                    localities: { href: '/api/reports/localities', method: 'GET' },
                    reports: { href: '/api/reports', method: 'GET' }
                }
            }))
        } catch (err) {
            console.error('Error fetching supported localities:', err)
            return ErrorFactory.createError(res, 500, 'FETCH_FAILED', 'Failed to fetch supported localities', {
                localities: { href: '/api/reports/localities', method: 'GET' },
                reports: { href: '/api/reports', method: 'GET' }
            })
        }
    }

    static async getGeoJsonForLocality(req, res, params = {}) {
        try {
            const locality = params.locality
            if (!locality) {
                return ErrorFactory.createError(res, 400, 'MISSING_PARAMETER', 'Locality parameter is required', {
                    'supported-localities': { href: '/api/localities/supported', method: 'GET' },
                    localities: { href: '/api/reports/localities', method: 'GET' }
                })
            }

            const { getGeoJsonPath } = await import('../config/geoMapping.js')
            const geoJsonPath = getGeoJsonPath(locality)

            if (!geoJsonPath) {
                return ErrorFactory.createError(res, 404, 'NOT_FOUND', 'GeoJSON not found for locality', {
                    'supported-localities': { href: '/api/localities/supported', method: 'GET' },
                    localities: { href: '/api/reports/localities', method: 'GET' }
                })
            }

            const fs = await import('fs')
            const path = await import('path')
            const fullPath = path.join(process.cwd(), 'public', geoJsonPath)

            try {
                const geoJsonData = JSON.parse(await fs.promises.readFile(fullPath, 'utf8'))

                const responseData = {
                    success: true,
                    data: geoJsonData,
                    links: {
                        self: { href: `/api/geojson/${encodeURIComponent(locality)}`, method: 'GET' },
                        'supported-localities': { href: '/api/localities/supported', method: 'GET' },
                        localities: { href: '/api/reports/localities', method: 'GET' }
                    }
                }

                res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' })
                res.end(JSON.stringify(responseData))
            } catch (fileError) {
                console.error('Error reading GeoJSON file:', fileError)
                return ErrorFactory.createError(res, 404, 'FILE_NOT_FOUND', 'GeoJSON file not found', {
                    'supported-localities': { href: '/api/localities/supported', method: 'GET' },
                    localities: { href: '/api/reports/localities', method: 'GET' }
                })
            }
        } catch (err) {
            console.error('Error serving GeoJSON:', err)
            return ErrorFactory.createError(res, 500, 'SERVER_ERROR', 'Failed to serve GeoJSON', {
                'supported-localities': { href: '/api/localities/supported', method: 'GET' },
                localities: { href: '/api/reports/localities', method: 'GET' }
            })
        }
    }

    static async getReportsForChart(req, res, params = {}) {
        try {
            const url = await import('url')
            const parsedUrl = url.parse(req.url, true)
            const locality = params.locality
            const startDate = parsedUrl.query.startDate
            const endDate = parsedUrl.query.endDate

            if (!locality) {
                return ErrorFactory.createError(res, 400, 'MISSING_PARAMETER', 'Locality parameter is required', {
                    localities: { href: '/api/reports/localities', method: 'GET' },
                    reports: { href: '/api/reports', method: 'GET' }
                })
            }

            if (!startDate || !endDate) {
                return ErrorFactory.createError(res, 400, 'MISSING_PARAMETER', 'Start date and end date are required', {
                    self: { href: `/api/reports/chart/${encodeURIComponent(locality)}?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`, method: 'GET' },
                    localities: { href: '/api/reports/localities', method: 'GET' }
                })
            }

            const reports = await Report.findByLocalityAndDateRange(locality, startDate, endDate)

            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' })
            res.end(JSON.stringify({
                success: true,
                data: { reports },
                filters: { locality, startDate, endDate },
                links: {
                    self: { href: `/api/reports/chart/${encodeURIComponent(locality)}?startDate=${startDate}&endDate=${endDate}`, method: 'GET' },
                    locality: { href: `/api/reports/locality/${encodeURIComponent(locality)}`, method: 'GET' },
                    localities: { href: '/api/reports/localities', method: 'GET' },
                    reports: { href: '/api/reports', method: 'GET' }
                }
            }))
        } catch (err) {
            console.error('Error fetching reports for chart:', err)
            return ErrorFactory.createError(res, 500, 'FETCH_FAILED', 'Failed to fetch reports for chart', {
                localities: { href: '/api/reports/localities', method: 'GET' },
                reports: { href: '/api/reports', method: 'GET' }
            })
        }
    }

}
