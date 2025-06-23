import { insert, findOne } from '../db.js';

export class User {
  constructor(data) {
    Object.assign(this, data);
  }

  static async create(data) {
    const inserted = await insert('users', data);
    return new User(inserted);
  }

  static async findByEmail(email) {
    const data = await findOne('users', { email });
    return data ? new User(data) : null;
  }

  static async findByUsername(username) {
    const data = await findOne('users', { username });
    return data ? new User(data) : null;
  }

  static async findByEmailOrUsername(email, username) {
    const data = await findOne('users', {
      $or: [{ email }, { username }]
    });
    return data ? new User(data) : null;
  }

}
