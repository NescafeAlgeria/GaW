var map = L.map('map').setView([51.505, -0.09], 13);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

let marker = undefined;

const mapDiv = document.getElementById('map');
const reportInfoTab = document.getElementById('report-info');
const longitudeText = document.getElementById('report-longitude');
const latitudeText = document.getElementById('report-latitude');
const severityText = document.getElementById('report-severity');
const severitySlider = document.getElementById('severity-slider');
const descriptionText = document.getElementById('report-text');
const submitButton = document.getElementById('submit-report');

severitySlider.oninput = () => {
    severityText.innerText = 'Severity: ' + severitySlider.value;
}

function onMapClick(e) {
    if (marker === undefined) {
        marker = L.marker(e.latlng).addTo(map);
    }

    marker
        .setLatLng(e.latlng);

    longitudeText.innerText = "Longitude: " + e.latlng.lng;
    latitudeText.innerText = "Latitude: " + e.latlng.lat;
    severityText.innerText = 'Severity: ' + 5;

    reportInfoTab.style.display = 'flex';
    reportInfoTab.style.width = '30%';
    mapDiv.style.width = '70%';
}


map.on('click', onMapClick);

submitButton.addEventListener('click', async (event) => {
    event.preventDefault();
    const severity = severitySlider.value;
    const lat = marker.getLatLng().lat;
    const lng = marker.getLatLng().lng;
    const description = descriptionText.value;
    const response = await fetch('/addReport', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            severity: severity,
            lat: lat,
            lng: lng,
            description: description
        })
    });
    console.log("Response: ", response);
});