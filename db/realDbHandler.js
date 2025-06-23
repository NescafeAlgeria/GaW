import { insert as mongoInsert, find as mongoFind, findOne as mongoFindOne, update as mongoUpdate, remove as mongoRemove } from '../db.js';

export async function insert(collection, document) {
    return await mongoInsert(collection, document);
}

export async function find(collection, query = {}) {
    return await mongoFind(collection, query);
}

export async function findOne(collection, query) {
    return await mongoFindOne(collection, query);
}

export async function update(collection, query, updateData) {
    return await mongoUpdate(collection, query, updateData);
}

export async function remove(collection, query) {
    return await mongoRemove(collection, query);
}
