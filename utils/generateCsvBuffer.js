const escapeCSVField = (field) => {
    if (field === null || field === undefined) {
        return '';
    }

    const stringField = String(field);
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
        return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
};

const generateCsvBuffer = (data, startDate = null, endDate = null, groupBy = 'locality') => {
    if (!data || data.length === 0) {
        return Buffer.from('\uFEFF' + 'No data available\n', 'utf-8');
    }

    const sortedData = [...data].sort((a, b) => (parseInt(b.severity) || 0) - (parseInt(a.severity) || 0));

    const groupLabel = groupBy === 'locality' ? 'Locality' : 'Neighbourhood';

    const csvLines = [
        `Category,Severity,${groupLabel},${groupBy === 'locality' ? 'County' : 'Locality'},Latitude,Longitude,Description,Date`,
        ...sortedData.map(item =>
            `${escapeCSVField(item.category || 'N/A')},${parseInt(item.severity) || 0},${escapeCSVField(item[groupBy] || 'Unknown')},${escapeCSVField(item[groupBy === 'locality' ? 'county' : 'locality'] || 'Unknown')},${item.lat || 0},${item.lng || 0},${escapeCSVField(item.description || '')},${new Date(item.createdAt).toLocaleDateString()}`
        )
    ];

    return Buffer.from('\uFEFF' + csvLines.join('\n'), 'utf-8');
};



export default generateCsvBuffer;
