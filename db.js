import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { escapeHtml } from './utils/xssProtection.js';
dotenv.config();

function sanitizeQuery(query) {
    if (typeof query !== 'object' || query === null) {
        return {};
    }
    
    const sanitized = {};
    for (const key in query) {
        if (query.hasOwnProperty(key)) {
            const value = query[key];
            
            if (key.startsWith('$')) {
                continue;
            }
            
            if (typeof value === 'object' && value !== null) {
                if (Array.isArray(value)) {
                    sanitized[key] = value.filter(item => typeof item !== 'object' || item === null);
                } else {
                    const hasOperators = Object.keys(value).some(k => k.startsWith('$'));
                    if (hasOperators) {
                        continue;
                    }
                    sanitized[key] = value;
                }
            } else {
                sanitized[key] = value;
            }
        }
    }
    return sanitized;
}

function sanitizeUpdateData(updateData) {
    if (typeof updateData !== 'object' || updateData === null) {
        return {};
    }
    
    const sanitized = {};
    for (const key in updateData) {
        if (updateData.hasOwnProperty(key) && !key.startsWith('$')) {
            const value = updateData[key];
            if (typeof value !== 'object' || value === null) {
                sanitized[key] = typeof value === 'string' ? escapeHtml(value) : value;
            }
        }
    }
    return sanitized;
}

const uri = process.env.MONGO_URL; 
const dbName = 'GaW';             

let client;

async function connect() {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
  }
  return client.db(dbName);
}

export async function insert(collectionName, data) {
    const db = await connect();
    const sanitizedData = sanitizeUpdateData(data);
    return db.collection(collectionName).insertOne(sanitizedData);
}
export async function find(collectionName, query = {}) {
    const db = await connect();
    const sanitizedQuery = sanitizeQuery(query);
    return db.collection(collectionName).find(sanitizedQuery).toArray();
}
export async function findOne(collectionName, query) {
    const db = await connect();
    const sanitizedQuery = sanitizeQuery(query);
    return db.collection(collectionName).findOne(sanitizedQuery);
}
export async function update(collectionName, query, updateData) {
    const db = await connect();
    const sanitizedQuery = sanitizeQuery(query);
    const sanitizedUpdateData = sanitizeUpdateData(updateData);
    return db.collection(collectionName).updateOne(sanitizedQuery, { $set: sanitizedUpdateData });
}
export async function remove(collectionName, query) {
    const db = await connect();
    const sanitizedQuery = sanitizeQuery(query);
    return db.collection(collectionName).deleteOne(sanitizedQuery);
}
