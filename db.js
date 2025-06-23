import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

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
    return db.collection(collectionName).insertOne(data);
}
export async function find(collectionName, query = {}) {
    const db = await connect();
    return db.collection(collectionName).find(query).toArray();
}
export async function findOne(collectionName, query) {
    const db = await connect();
    return db.collection(collectionName).findOne(query);
}
export async function update(collectionName, query, updateData) {
    const db = await connect();
    return db.collection(collectionName).updateOne(query, { $set: updateData });
}
export async function remove(collectionName, query) {
    const db = await connect();
    return db.collection(collectionName).deleteOne(query);
}
