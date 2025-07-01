let map;
let neighborhoodData = {};
let reports = [];
let currentLocality = 'Iași';
let reportsChart = null;

async function loadSupportedLocalities() {
    try {
        const response = await fetch('/api/localities/supported');
        if (!response.ok) {
            throw new Error('Failed to load supported localities');
        }
        const data = await response.json();
        return data.data ? data.data.localities : data.localities;
    } catch (error) {
        console.error('Error loading supported localities:', error);
        return ['Iași'];
    }
}

function populateLocalityDropdown(localities) {
    const select = document.getElementById('locality-select');
    select.innerHTML = '';

    localities.forEach(locality => {
        const option = document.createElement('option');
        option.value = locality;
        option.textContent = locality;
        if (locality === currentLocality) {
            option.selected = true;
        }
        select.appendChild(option);
    });

    select.addEventListener('change', function () {
        currentLocality = this.value;
        if (currentLocality) {
            initMap();
        }
    });
}

function populateChartLocalityDropdown(localities) {
    const select = document.getElementById('chart-locality-select');
    select.innerHTML = '';

    localities.forEach(locality => {
        const option = document.createElement('option');
        option.value = locality;
        option.textContent = locality;
        select.appendChild(option);
    });
}

function setDefaultDates() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);

    document.getElementById('start-date').value = startDate.toISOString().split('T')[0];
    document.getElementById('end-date').value = endDate.toISOString().split('T')[0];
}

function getColorByReportCount(count) {
    if (count === 0) return '#f7f7f7';
    if (count <= 2) return '#006837';
    if (count <= 5) return '#31a354';
    if (count <= 10) return '#78c679';
    if (count <= 20) return '#addd8e';
    if (count <= 30) return '#d9f0a3';
    if (count <= 50) return '#fee08b';
    return '#fd8d3c';
}

function isPointInPolygon(point, polygon) {
    const x = point[0];
    const y = point[1];
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0];
        const yi = polygon[i][1];
        const xj = polygon[j][0];
        const yj = polygon[j][1];

        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }

    return inside;
}

function getNeighborhoodFromCoordinates(lat, lng) {
    for (const [neighborhoodName, data] of Object.entries(neighborhoodData)) {
        const coordinates = data.geometry.coordinates[0];
        if (isPointInPolygon([lng, lat], coordinates)) {
            return neighborhoodName;
        }
    }
    return 'Unknown';
}

function countReportsByNeighborhood() {
    const counts = {};

    Object.keys(neighborhoodData).forEach(name => {
        counts[name] = 0;
    });

    reports.forEach(report => {
        const neighborhood = getNeighborhoodFromCoordinates(report.lat, report.lng);
        if (neighborhood !== 'Unknown' && counts.hasOwnProperty(neighborhood)) {
            counts[neighborhood]++;
        }
    });

    return counts;
}

function onEachFeature(feature, layer) {
    const neighborhoodName = feature.properties.NameId;
    const reportCount = neighborhoodData[neighborhoodName]?.reportCount || 0;

    layer.bindPopup(`
        <strong>${neighborhoodName}</strong><br>
        Reports: ${reportCount}
    `);

    layer.on('mouseover', function (e) {
        this.setStyle({
            weight: 3,
            color: '#666',
            fillOpacity: 0.8
        });

        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
        }
    });

    layer.on('mouseout', function (e) {
        this.setStyle({
            weight: 1,
            color: '#333',
            fillOpacity: 0.7
        });
    });
}

function styleFeature(feature) {
    const neighborhoodName = feature.properties.NameId;
    const reportCount = neighborhoodData[neighborhoodName]?.reportCount || 0;

    return {
        fillColor: getColorByReportCount(reportCount),
        weight: 1,
        opacity: 1,
        color: '#333',
        fillOpacity: 0.7
    };
}

async function loadGeoJSON() {
    try {
        const response = await fetch(`/api/geojson/${encodeURIComponent(currentLocality)}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (!response.ok) {
            throw new Error('Failed to load GeoJSON data');
        }
        const data = await response.json();
        return data.data || data;
    } catch (error) {
        console.error('Error loading GeoJSON:', error);
        throw error;
    }
}

async function loadReports() {
    try {
        const response = await fetch('/api/reports/locality/' + encodeURIComponent(currentLocality));
        if (!response.ok) {
            throw new Error('Failed to load reports data');
        }
        const data = await response.json();
        return data.data ? data.data.reports : data;
    } catch (error) {
        console.error('Error loading reports:', error);
        throw error;
    }
}

async function loadChartData(locality, startDate, endDate) {
    try {
        const url = `/api/reports/chart/${encodeURIComponent(locality)}?startDate=${startDate}&endDate=${endDate}`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (!response.ok) {
            throw new Error('Failed to load chart data');
        }
        const data = await response.json();
        return data.data ? data.data.reports : data;
    } catch (error) {
        console.error('Error loading chart data:', error);
        throw error;
    }
}

function processChartData(reports) {
    const categories = ['household waste', 'paper', 'plastic', 'glass'];
    const categoryLabels = ['Household Waste', 'Paper', 'Plastic', 'Glass'];
    const dateMap = {};

    reports.forEach(report => {
        const date = new Date(report.createdAt).toISOString().split('T')[0];
        const category = report.category ? report.category.toLowerCase() : 'household waste';

        if (!dateMap[date]) {
            dateMap[date] = {};
            categories.forEach(cat => {
                dateMap[date][cat] = 0;
            });
        }
        if (categories.includes(category)) {
            dateMap[date][category]++;
        }
    });

    const sortedDates = Object.keys(dateMap).sort();

    const cumulativeTotals = {};
    categories.forEach(cat => {
        cumulativeTotals[cat] = 0;
    });

    const datasets = categoryLabels.map((label, index) => {
        const category = categories[index];
        const colors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'
        ];

        const cumulativeData = sortedDates.map(date => {
            cumulativeTotals[category] += dateMap[date][category];
            return cumulativeTotals[category];
        });

        return {
            label: label,
            data: cumulativeData,
            borderColor: colors[index],
            backgroundColor: colors[index] + '20',
            tension: 0.1,
            fill: false
        };
    });

    return {
        labels: sortedDates,
        datasets: datasets
    };
}

async function initMap() {
    try {
        document.getElementById('loading').style.display = 'block';

        if (map) {
            map.eachLayer(function (layer) {
                if (layer !== map._layers[Object.keys(map._layers)[0]]) {
                    map.removeLayer(layer);
                }
            });
        } else {
            map = L.map('map').setView([47.1585, 27.6014], 12);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);
        }

        neighborhoodData = {};

        const [geoJsonData, reportsData] = await Promise.all([
            loadGeoJSON(),
            loadReports()
        ]);

        reports = reportsData;

        geoJsonData.features.forEach(feature => {
            const name = feature.properties.NameId;
            neighborhoodData[name] = {
                geometry: feature.geometry,
                reportCount: 0
            };
        });

        const reportCounts = countReportsByNeighborhood();

        Object.keys(reportCounts).forEach(name => {
            if (neighborhoodData[name]) {
                neighborhoodData[name].reportCount = reportCounts[name];
            }
        });

        L.geoJSON(geoJsonData, {
            style: styleFeature,
            onEachFeature: onEachFeature
        }).addTo(map);

        document.getElementById('loading').style.display = 'none';

    } catch (error) {
        console.error('Error initializing map:', error);
        document.getElementById('loading').innerHTML = 'Error loading map data. Please try again later.';
    }
}

async function generateChart() {
    try {
        const locality = document.getElementById('chart-locality-select').value;
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;

        if (!locality || !startDate || !endDate) {
            alert('Please select locality and date range');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            alert('Start date must be before end date');
            return;
        }

        const reports = await loadChartData(locality, startDate, endDate);
        const chartData = processChartData(reports);

        const canvas = document.getElementById('reports-chart');
        if (!canvas) {
            console.error('Chart canvas not found');
            return;
        }

        const ctx = canvas.getContext('2d');

        if (reportsChart) {
            reportsChart.destroy();
        }

        canvas.style.display = 'block';
        canvas.style.position = 'relative';
        canvas.style.zIndex = '1';

        reportsChart = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `Cumulative Reports by Category in ${locality}`,
                        font: {
                            size: 16
                        }
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Total Number of Reports'
                        },
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });

    } catch (error) {
        console.error('Error generating chart:', error);
        alert('Failed to generate chart. Please try again.');
    }
}

async function initPage() {
    try {
        const [supportedLocalities, allLocalities] = await Promise.all([
            loadSupportedLocalities(),
            loadAllLocalities()
        ]);

        populateLocalityDropdown(supportedLocalities);
        populateChartLocalityDropdown(allLocalities);
        setDefaultDates();

        document.getElementById('generate-chart').addEventListener('click', generateChart);

        await initMap();

    } catch (error) {
        console.error('Error initializing page:', error);
    }
}

document.addEventListener('DOMContentLoaded', initPage);

async function loadAllLocalities() {
    try {
        const response = await fetch('/api/reports/localities', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (!response.ok) {
            throw new Error('Failed to load all localities');
        }
        const data = await response.json();
        return data.data ? data.data.localities : (data.localities || []);
    } catch (error) {
        console.error('Error loading all localities:', error);
        return [];
    }
}
