import fs from 'fs';

async function fetchChartJsLibrary() {
    try {
        const response = await fetch('https://cdn.jsdelivr.net/npm/chart.js');
        if (!response.ok) {
            throw new Error('Failed to fetch Chart.js library');
        }
        return await response.text();
    } catch (error) {
        console.error('Error fetching Chart.js library:', error);
        throw error;
    }
}

function processChartData(reports) {
    const dateMap = {};

    reports.forEach(report => {
        if (report.createdAt) {
            const date = new Date(report.createdAt).toISOString().split('T')[0];
            if (!dateMap[date]) {
                dateMap[date] = 0;
            }
            dateMap[date]++;
        }
    });

    const sortedDates = Object.keys(dateMap).sort();
    let cumulativeTotal = 0;

    const cumulativeData = sortedDates.map(date => {
        cumulativeTotal += dateMap[date];
        return cumulativeTotal;
    });

    return {
        labels: sortedDates,
        datasets: [{
            label: 'Total Reports',
            data: cumulativeData,
            borderColor: '#2e8b57',
            backgroundColor: 'rgba(46, 139, 87, 0.1)',
            tension: 0.1,
            fill: true
        }]
    };
}

export async function generateHtmlBuffer(reports, county, locality, startDate, endDate) {
    try {
        const chartJsLibrary = await fetchChartJsLibrary();
        const chartData = processChartData(reports);

        const title = locality ? `${locality} Report` : `${county} Report`;
        const dateRange = startDate && endDate ? `${startDate} to ${endDate}` : 'All Time';

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - Garbage Reporting Platform</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #2e8b57;
            padding-bottom: 20px;
        }
        .header h1 {
            color: #2e8b57;
            margin: 0 0 10px 0;
            font-size: 2.5em;
        }
        .header p {
            color: #333;
            margin: 5px 0;
            font-size: 1.1em;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .summary-card {
            background: #f5f5f5;
            padding: 20px;
            border-radius: 6px;
            text-align: center;
            border-left: 4px solid #2e8b57;
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            color: #333;
        }
        .summary-card .number {
            font-size: 2em;
            font-weight: bold;
            color: #2e8b57;
        }
        .chart-section {
            margin: 30px 0;
        }
        .chart-container {
            background: #fafafa;
            padding: 20px;
            border-radius: 6px;
            border: 1px solid #ddd;
            max-width: 800px;
            margin: 0 auto;
        }
        .chart-container h3 {
            text-align: center;
            margin-bottom: 20px;
            color: #333;
        }
        .table-container {
            margin-top: 30px;
        }
        .table-container h3 {
            color: #333;
            margin-bottom: 15px;
        }
        .table-wrapper {
            max-height: 400px;
            overflow-y: auto;
            border: 1px solid #ddd;
            border-radius: 6px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            background: white;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #2e8b57;
            color: white;
            font-weight: 600;
            position: sticky;
            top: 0;
        }
        tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        tr:hover {
            background-color: #e8f4f8;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #333;
        }
        @media print {
            body { background: white; }
            .container { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Garbage Reporting Platform</h1>
            <p><strong>${title}</strong></p>
            <p>Report Period: ${dateRange}</p>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <h3>Total Reports</h3>
                <div class="number">${reports.length}</div>
            </div>
            <div class="summary-card">
                <h3>Solved Reports</h3>
                <div class="number">${reports.filter(r => r.solved).length}</div>
            </div>
        </div>

        <div class="chart-section">
            <div class="chart-container">
                <h3>Cumulative Reports Over Time</h3>
                <canvas id="reportsChart" width="800" height="400"></canvas>
            </div>
        </div>

        <div class="table-container">
            <h3>Detailed Reports</h3>
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>County</th>
                            <th>Locality</th>
                            <th>Category</th>
                            <th>Severity</th>
                            <th>Description</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reports.map(report => `
                            <tr>
                                <td>${new Date(report.createdAt).toLocaleDateString()}</td>
                                <td>${report.county || 'N/A'}</td>
                                <td>${report.locality || 'N/A'}</td>
                                <td>${report.category || 'N/A'}</td>
                                <td>${report.severity || 'N/A'}</td>
                                <td>${(report.description || '').substring(0, 100)}${(report.description || '').length > 100 ? '...' : ''}</td>
                                <td>${report.solved ? 'Solved' : 'Pending'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Garbage Reporting Platform</p>
            <p>Working together for cleaner neighborhoods</p>
        </div>
    </div>

    <script>
        ${chartJsLibrary}
    </script>
    <script>
        const reportsData = ${JSON.stringify(chartData)};

        const ctx = document.getElementById('reportsChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: reportsData,
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Total Reports'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    title: {
                        display: true,
                        text: 'Cumulative Reports Growth'
                    }
                }
            }
        });
    </script>
</body>
</html>`;

        return Buffer.from(html, 'utf8');
    } catch (error) {
        console.error('Error generating HTML buffer:', error);
        throw error;
    }
}
