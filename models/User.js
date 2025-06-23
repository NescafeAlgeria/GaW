import { db } from '../db/dbHandler.js';

export class User {
  constructor(data) {
    Object.assign(this, data);
  }

  static async create(data) {
    const inserted = await db.insert('users', data);
    return new User(inserted);
  }

  static async findByEmail(email) {
    const data = await db.findOne('users', { email });
    return data ? new User(data) : null;
  }

  static async findByEmailOrUsername(email, username) {
    const data = await db.findOne('users', {
      $or: [{ email }, { username }]
    });
    return data ? new User(data) : null;
  }

  static async findByUsername(username) {
    const data = await db.findOne('users', { username });
    return data ? new User(data) : null;
  }

  static async findAll() {
    return await db.find('users', {});
  }

  static async delete(userId) {
    return await db.remove('users', { _id: userId });
  }
}
