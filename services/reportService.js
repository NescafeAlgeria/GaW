import { db } from '../db/dbHandler.js';

export async function createReport(data) {
    const report = {
        severity: data.severity,
        lat: data.lat,
        lng: data.lng,
        description: data.description || '',
        category: data.category,
        createdAt: new Date(),
        locality: data.locality || 'Unknown',
        county: data.county || 'Unknown',
    };
    return await db.insert('reports', report);
}

export async function getReports(filter = {}) {
    return await db.find('reports', filter);
}

export async function getAllCounties() {
    const reports = await db.find('reports', {});
    const countiesSet = new Set();
    for (const report of reports) {
        if (report.county) {
            countiesSet.add(report.county);
        }
    }
    return Array.from(countiesSet);
}

export async function getReportsByCounty(county) {
    if (!county) {
        throw new Error('County is required');
    }
    return await db.find('reports', { county });
}
