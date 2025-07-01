import { db } from "../db/dbHandler.js";
import { ObjectId } from 'mongodb';

export class RecyclePoint {
    static async create(data) {
        const recyclePoint = {
            lat: data.lat,
            lng: data.lng, name: data.name,
            address: data.address,
            description: data.description,
            capacities: data.capacities || {},
            fillAmounts: data.fillAmounts || {},
            openingHour: data.openingHour, closingHour: data.closingHour,
            contactInfo: {
                phone: data.contactInfo?.phone,
                email: data.contactInfo?.email,
            },
            createdAt: new Date(),
        }
        return await db.insert('recyclePoints', recyclePoint);
    }

    static async findAll() {
        return await db.find('recyclePoints');
    }

    static async findById(id) {
        if (!id) throw new Error("ID is required");
        if (!ObjectId.isValid(id)) {
            throw new Error('Invalid ObjectId format');
        }
        const objectId = ObjectId.createFromHexString(id);
        return await db.findOne('recyclePoints', { _id: objectId });
    } static async updateCapacity(id, category, newFillAmount) {
        if (!id) throw new Error("ID is required");
        if (!category) throw new Error("Category is required");
        if (newFillAmount < 0) throw new Error("Fill amount cannot be negative");
        if (!ObjectId.isValid(id)) {
            throw new Error('Invalid ObjectId format');
        } const objectId = ObjectId.createFromHexString(id);
        const updateField = `fillAmounts.${category}`;
        return await db.update('recyclePoints', { _id: objectId }, { [updateField]: newFillAmount });
    }

    static async deleteById(id) {
        if (!id) throw new Error("ID is required");
        if (!ObjectId.isValid(id)) {
            throw new Error('Invalid ObjectId format');
        }
        const objectId = ObjectId.createFromHexString(id);
        return await db.remove('recyclePoints', { _id: objectId });
    }

}