var map = L.map('map').setView([47.1585, 27.6014], 13);

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
const severityValue = document.getElementById('severity-value');
const descriptionText = document.getElementById('report-text');
const submitButton = document.getElementById('submit-report');
const resultText = document.getElementById('report-result');
const categorySelect = document.getElementById('report-category');

severitySlider.oninput = () => {
    severityValue.innerText = severitySlider.value;
}

function onMapClick(e) {
    if (marker === undefined) {
        marker = L.marker(e.latlng).addTo(map);
    }

    marker
        .setLatLng(e.latlng); longitudeText.innerText = e.latlng.lng;
    latitudeText.innerText = e.latlng.lat;
    severityValue.innerText = severitySlider.value;

    reportInfoTab.style.display = 'flex';
    reportInfoTab.style.width = '30%';
    mapDiv.style.width = '70%';
}


map.on('click', onMapClick);

submitButton.addEventListener('click', async (event) => {
    submitButton.innerText = 'Submitting...';
    submitButton.disabled = true;
    resultText.innerText = '';

    event.preventDefault();
    const severity = severitySlider.value;
    const description = descriptionText.value;
    const category = categorySelect.value;
    let lat, lng;
    if (marker) {
        lat = marker.getLatLng().lat;
        lng = marker.getLatLng().lng;
    }

    if (!lat || !lng || !description || !category) {
        resultText.innerText = 'Error: Please fill in all required fields and select a location on the map.';
        resultText.style.color = 'red';
        submitButton.innerText = 'Submit';
        submitButton.disabled = false;
        return;
    }

    const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
            severity: severity,
            lat: lat,
            lng: lng,
            description: description,
            category: category
        })
    });
    const result = await response.json();

    submitButton.innerText = 'Submit';
    submitButton.disabled = false;
    if (response.ok) {
        resultText.innerText = 'Report submitted successfully!';
        resultText.style.color = 'green';
    } else {
        resultText.innerText = 'Error: ' + result.error;
        resultText.style.color = 'red';
    }
});
