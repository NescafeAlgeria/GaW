import https from 'https'
import { Report } from '../models/Report.js'

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
                console.log("Received report data:", reportData);
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
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ counties }));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to fetch counties' }));
        }
    }
}
