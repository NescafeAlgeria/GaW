
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

const generateCsvBuffer = (data) => {
    if (!data || data.length === 0) {
        return Buffer.from('County,Message\n"No data","No reports available for the selected county"\n');
    }

    const headers = [
        'ID',
        'Category', 
        'Severity',
        'Latitude',
        'Longitude',
        'Locality',
        'County',
        'Description',
        'Created At'
    ];

    const rows = data.map((report, index) => [
        index + 1,
        escapeCSVField(report.category || 'N/A'),
        report.severity || 0,
        report.lat || '',
        report.lng || '',
        escapeCSVField(report.locality || 'Unknown'),
        escapeCSVField(report.county || 'Unknown'),
        escapeCSVField(report.description || ''),
        report.createdAt ? new Date(report.createdAt).toISOString() : ''
    ]);

    const summaryData = generateSummaryStats(data);
    
    const csvLines = [
        headers.join(','),
        ...rows.map(row => row.join(',')),
        '',
        '--- SUMMARY STATISTICS ---',
        `Total Reports,${data.length}`,
        `Average Severity,${summaryData.avgSeverity}`,
        ...summaryData.countiesSummary.map(county => 
            `Reports in ${escapeCSVField(county.county)},${county.count}`
        ),
        ...summaryData.categorySummary.map(category => 
            `${escapeCSVField(category.category)} Reports,${category.count}`
        ),
        ...summaryData.localitySummary.map(locality => 
            `${escapeCSVField(locality.locality)} (${escapeCSVField(locality.county)}) Reports,${locality.count}`
        )
    ];

    return Buffer.from(csvLines.join('\n'), 'utf-8');
};

const generateSummaryStats = (data) => {
    // Calculate average severity
    const validSeverities = data.filter(report => report.severity && !isNaN(report.severity));
    const avgSeverity = validSeverities.length > 0 
        ? (validSeverities.reduce((sum, report) => sum + Number(report.severity), 0) / validSeverities.length).toFixed(2)
        : 0;

    // Count by counties
    const countiesCount = {};
    data.forEach(report => {
        const county = report.county || 'Unknown';
        countiesCount[county] = (countiesCount[county] || 0) + 1;
    });

    // Count by categories
    const categoriesCount = {};
    data.forEach(report => {
        const category = report.category || 'Unknown';
        categoriesCount[category] = (categoriesCount[category] || 0) + 1;
    });

    // Count by localities
    const localitiesCount = {};
    data.forEach(report => {
        const locality = report.locality || 'Unknown';
        const county = report.county || 'Unknown';
        const key = `${locality}|${county}`;
        localitiesCount[key] = (localitiesCount[key] || 0) + 1;
    });

    return {
        avgSeverity,
        countiesSummary: Object.entries(countiesCount)
            .map(([county, count]) => ({ county, count }))
            .sort((a, b) => b.count - a.count),
        categorySummary: Object.entries(categoriesCount)
            .map(([category, count]) => ({ category, count }))
            .sort((a, b) => b.count - a.count),
        localitySummary: Object.entries(localitiesCount)
            .map(([key, count]) => {
                const [locality, county] = key.split('|');
                return { locality, county, count };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 10) // Top 10 localities
    };
};

export default generateCsvBuffer;
