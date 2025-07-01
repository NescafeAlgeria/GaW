import { db } from '../db/dbHandler.js';
import { ObjectId } from 'mongodb';

export class User {
  constructor(data) {
    Object.assign(this, data);
  }

  static async create(data) {
    const inserted = await db.insert('users', data);
    const newUser = {
      _id: inserted.insertedId,
      username: data.username,
      email: data.email,
      role: data.role || 'user',
    }
    return new User(data);
  }

  static async findByEmail(email) {
    const data = await db.findOne('users', { email });
    return data ? new User(data) : null;
  }
  static async findById(userId) {
    try {
      if (!ObjectId.isValid(userId)) {
        throw new Error('Invalid ObjectId format');
      }
      const objectId = ObjectId.createFromHexString(userId);
      const data = await db.findOne('users', { _id: objectId });
      return data ? new User(data) : null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  static async update(userId, updates) {
    try {
      if (!ObjectId.isValid(userId)) {
        throw new Error('Invalid ObjectId format');
      }
      const objectId = ObjectId.createFromHexString(userId);
      const updatedData = await db.update('users', { _id: objectId }, updates);
      return new User(updatedData);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
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
    try {
      if (!ObjectId.isValid(userId)) {
        throw new Error('Invalid ObjectId format');
      }
      const objectId = ObjectId.createFromHexString(userId);
      return await db.remove('users', { _id: objectId });
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
}
