// Helper function to properly escape CSV fields
const escapeCSVField = (field) => {
    if (field === null || field === undefined) {
        return '';
    }
    
    const stringField = String(field);
    // If field contains comma, quote, or newline, wrap it in quotes and escape internal quotes
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
        return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
};

const generateCsvBuffer = (data, startDate = null, endDate = null) => {
    if (!data || data.length === 0) {
        return Buffer.from('No data available\n');
    }

    const garbageStatusPerZone = {};
    data.forEach(report => {
        const zone = report.locality || 'Unknown';
        if (!garbageStatusPerZone[zone]) {
            garbageStatusPerZone[zone] = {
                locality: zone,
                reportsCount: 0,
                totalSeverity: 0,
            };
        }
        garbageStatusPerZone[zone].reportsCount += 1;
        garbageStatusPerZone[zone].totalSeverity += report.severity || 0;
    });

    const garbageStatusSorted = Object.values(garbageStatusPerZone).sort((a, b) => (b.reportsCount + b.totalSeverity) - (a.reportsCount + a.totalSeverity));

    let timeIntervalText = '';
    if (startDate && endDate) {
        timeIntervalText = `Time Period: ${startDate} to ${endDate}`;
    } else if (startDate) {
        timeIntervalText = `Time Period: From ${startDate}`;
    } else if (endDate) {
        timeIntervalText = `Time Period: Until ${endDate}`;
    }

    const csvLines = [
        `Garbage Situation for ${data[0]?.county || 'Unknown'}`,
        timeIntervalText,
        '',
        'Garbage Status by Locality',
        'Locality,Severity Score,Nr of Reports',
        ...garbageStatusSorted.map(zone => 
            `${escapeCSVField(zone.locality)},${zone.totalSeverity},${zone.reportsCount}`
        ),
        '',
        `Dirtiest locality: ${garbageStatusSorted[0]?.locality || 'Unknown'}`,
        `Cleanest locality: ${garbageStatusSorted[garbageStatusSorted.length - 1]?.locality || 'Unknown'}`,
        '',
        'Detailed Reports',
        '#,Category,Severity,Locality,County',
        ...data.map((item, index) => 
            `${index + 1},${escapeCSVField(item.category || 'N/A')},${item.severity},${escapeCSVField(item.locality || 'Unknown')},${escapeCSVField(item.county || 'Unknown')}`
        )
    ];

    return Buffer.from(csvLines.join('\n'), 'utf-8');
};



export default generateCsvBuffer;
