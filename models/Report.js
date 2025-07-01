import { db } from '../db/dbHandler.js';
import { ObjectId } from 'mongodb';
import { normalizeLocality } from '../config/geoMapping.js';

export class Report {
    static async create(data) {
        const report = {
            severity: data.severity,
            lat: data.lat,
            lng: data.lng,
            description: data.description || '',
            category: data.category,
            createdAt: new Date(),
            locality: normalizeLocality(data.locality) || 'Unknown',
            county: data.county || 'Unknown',
            suburb: data.suburb || 'Unknown',
            username: data.username || 'Unknown',
            solved: 'false',
        };
        return await db.insert('reports', report);
    }

    static async findAll(filter = {}) {
        return await db.find('reports', filter);
    }

    static async findById(reportId) {
        if (!ObjectId.isValid(reportId)) {
            throw new Error('Invalid ObjectId format');
        }
        const objectId = ObjectId.createFromHexString(reportId);
        const report = await db.findOne('reports', { _id: objectId });
        if (!report) {
            throw new Error('Report not found');
        }
        return report;
    }

    static async findByCounty(county, startDate = null, endDate = null) {
        if (!county) {
            throw new Error('County is required');
        }

        let filter = { county };

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate).toISOString();
            }
            if (endDate) {
                const endDateTime = new Date(endDate);
                endDateTime.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = endDateTime.toISOString();
            }
        }

        const allReports = await db.find('reports', { county });

        if (!startDate && !endDate) {
            return allReports;
        }

        return allReports.filter(report => {
            if (!report.createdAt) return false;

            const reportDate = new Date(report.createdAt);

            if (startDate) {
                const start = new Date(startDate);
                if (reportDate < start) return false;
            }

            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                if (reportDate > end) return false;
            }

            return true;
        });
    }

    static async getAllCounties() {
        const reports = await db.find('reports', {});
        const countiesSet = new Set();
        for (const report of reports) {
            if (report.county) {
                countiesSet.add(report.county);
            }
        }
        return Array.from(countiesSet);
    }

    static async getAllLocalities() {
        const reports = await db.find('reports', {});
        const localitiesSet = new Set();
        for (const report of reports) {
            if (report.locality) {
                localitiesSet.add(report.locality);
            }
        }
        return Array.from(localitiesSet);
    }

    static async findByLocality(locality, startDate = null, endDate = null) {
        if (!locality) {
            throw new Error('Locality is required');
        }

        const normalizedLocality = normalizeLocality(locality);
        let filter = { locality: normalizedLocality };

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate).toISOString();
            }
            if (endDate) {
                const endDateTime = new Date(endDate);
                endDateTime.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = endDateTime.toISOString();
            }
        }

        const allReports = await db.find('reports', { locality: normalizedLocality });

        if (!startDate && !endDate) {
            return allReports;
        }

        return allReports.filter(report => {
            if (!report.createdAt) return false;

            const reportDate = new Date(report.createdAt);

            if (startDate) {
                const start = new Date(startDate);
                if (reportDate < start) return false;
            }

            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                if (reportDate > end) return false;
            }

            return true;
        });
    }

    static async solve(reportId) {
        try {
            if (!ObjectId.isValid(reportId)) {
                throw new Error('Invalid ObjectId format');
            }
            const objectId = ObjectId.createFromHexString(reportId);
            const report = await db.findOne('reports', { _id: objectId });
            if (!report) {
                throw new Error('Report not found');
            }
            report.solved = 'true';
            return await db.update('reports', { _id: objectId }, report);
        } catch (error) {
            console.error('Error solving report:', error);
            throw error;
        }
    }

    static async findByLocalityAndDateRange(locality, startDate, endDate) {
        return await this.findByLocality(locality, startDate, endDate);
    }

    static async delete(reportId) {
        try {
            if (!ObjectId.isValid(reportId)) {
                throw new Error('Invalid ObjectId format');
            }
            const objectId = ObjectId.createFromHexString(reportId);
            return await db.remove('reports', { _id: objectId });
        } catch (error) {
            console.error('Error deleting report:', error);
            throw error;
        }
    }
}
