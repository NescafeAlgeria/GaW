import mockData from './mockReports.json' with { type: 'json' };


export async function insert(collection, document) {
    mockData.push({ collection, ...document });
    console.log(`Mock insert into "${collection}":`, document);
    return { acknowledged: true };
}

export async function find(collection, query = {}) {
    return mockData.filter(doc =>
        doc.collection === collection &&
        Object.entries(query).every(([k, v]) => doc[k] === v)
    );
}
