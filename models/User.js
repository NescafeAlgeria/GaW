import { insert, findOne } from '../db.js';

export class User {
    static async create(userData) {
        return await insert('users', userData);
    }

    static async findByEmail(email) {
        return await findOne('users', { email });
    }

    static async findByEmailOrUsername(email, username) {
        return await findOne('users', { $or: [{ email }, { username }] });
    }
}
