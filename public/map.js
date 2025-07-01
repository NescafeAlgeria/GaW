let map;
let neighborhoodData = {};
let reports = [];
let currentLocality = 'Iași';

async function loadSupportedLocalities() {
    try {
        const response = await fetch('/api/localities/supported');
        if (!response.ok) {
            throw new Error('Failed to load supported localities');
        }
        const data = await response.json();
        return data.localities;
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
        const response = await fetch(`/api/geojson/${encodeURIComponent(currentLocality)}`);
        if (!response.ok) {
            throw new Error('Failed to load GeoJSON data');
        }
        return await response.json();
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
        return await response.json();
    } catch (error) {
        console.error('Error loading reports:', error);
        throw error;
    }
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

async function initPage() {
    try {
        const localities = await loadSupportedLocalities();
        populateLocalityDropdown(localities);
        await initMap();
    } catch (error) {
        console.error('Error initializing page:', error);
    }
}

document.addEventListener('DOMContentLoaded', initPage);
