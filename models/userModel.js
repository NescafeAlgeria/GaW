import { findOne } from '../db.js';

export async function getUserByEmail(email) {
  return await findOne('users', { email });
}
export async function getUserByUsername(username) {
  return await findOne('users', { username });
}