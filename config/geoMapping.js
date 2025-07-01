export const localityGeoJsonMapping = {
    'Iași': '/neighbourhoodGEOs/Iasi.geojson',
};

export const localityNormalizationMap = {
    'Iasi': 'Iași',
    'Iași': 'Iași',
    'iasi': 'Iași',
    'iași': 'Iași',
    'IASI': 'Iași',
    'IAȘI': 'Iași'
};

export function normalizeLocality(locality) {
    if (!locality) return locality;
    return localityNormalizationMap[locality] || locality;
}

export function getGeoJsonPath(locality) {
    const normalizedLocality = normalizeLocality(locality);
    return localityGeoJsonMapping[normalizedLocality] || localityGeoJsonMapping[locality] || null;
}

export function getSupportedLocalities() {
    return Object.keys(localityGeoJsonMapping);
}
