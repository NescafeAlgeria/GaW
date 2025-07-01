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
        .setLatLng(e.latlng);
    longitudeText.innerText = e.latlng.lng;
    latitudeText.innerText = e.latlng.lat;
    severityValue.innerText = severitySlider.value;

    reportInfoTab.style.display = 'flex';
    reportInfoTab.style.width = '30%';
    mapDiv.style.width = '70%';
}


map.on('click', onMapClick);


fetch('/api/recycle-points')
    .then(response => response.json())
    .then(data => {
        if (!data.success) return;
        const recyclePoints = data.data;

        console.log(recyclePoints);

        recyclePoints.forEach(point => {
            const latitude = point.lat;
            const longitude = point.lng;

            const isOpen = (() => {
                if (!point.openingHour || !point.closingHour) return false;
                const now = new Date();
                const nowMinutes = now.getHours() * 60 + now.getMinutes();
                const [openH, openM] = point.openingHour.split(':').map(Number);
                const [closeH, closeM] = point.closingHour.split(':').map(Number);
                const openMinutes = openH * 60 + openM;
                const closeMinutes = closeH * 60 + closeM;
                return nowMinutes >= openMinutes && nowMinutes < closeMinutes;
            })();

            const isFull = point.capacities && Object.keys(point.capacities).some(cat =>
                (point.fillAmounts?.[cat] || 0) >= point.capacities[cat]
            );

            const iconSize = 48;
            const customIcon = L.icon({
                iconUrl: `/icons/${isOpen ? isFull ? 'fullRecyclePlant.png' : 'activeRecyclePlant.png' : 'inactiveRecyclePlant.png'}`,
                iconSize: [iconSize, iconSize],
                iconAnchor: [iconSize / 2, iconSize / 2],
                popupAnchor: [0, -32]
            });

            const marker = L.marker([latitude, longitude], { icon: customIcon }).addTo(map); const categories = ['household', 'plastic', 'paper', 'glass'];
            const supportedCategories = categories.filter(cat => point.capacities && point.capacities[cat] > 0);

            let categoriesHtml = '';
            supportedCategories.forEach(category => {
                const capacity = point.capacities[category] || 0;
                const fillAmount = point.fillAmounts?.[category] || 0;
                const percentage = capacity > 0 ? (fillAmount / capacity * 100).toFixed(1) : 0;

                categoriesHtml += `
                    <div style="margin-bottom: 6px; padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
                        <div style="font-size: 12px; font-weight: bold; margin-bottom: 2px; text-transform: capitalize;">${category.replace('household', 'Household Waste')}</div>
                        <div style="font-size: 11px; margin-bottom: 2px;">${fillAmount}kg / ${capacity}kg (${percentage}% filled)</div>
                        <div style="background-color: #e0e0e0; height: 8px; border-radius: 4px; overflow: hidden;">
                            <div style="background-color: ${percentage > 80 ? '#c04040' : percentage > 50 ? '#FF9800' : '#4bae50'}; height: 100%; width: ${percentage}%; transition: width 0.3s;"></div>
                        </div>
                    </div>
                `;
            });

            const statusText = isOpen ? '<span style="color: green;">Open</span>' : '<span style="color: red;">Closed</span>';

            const popupContent = `
                <div style="min-width: 250px; font-family: Arial, sans-serif;">
                    <div style="margin-bottom: 12px;">
                        <h3 style="margin: 0 0 8px 0; color: #333;">${point.name}</h3>
                        <div style="color: #666; font-size: 14px;">
                            <div style="margin-bottom: 4px;"><strong>Address:</strong> ${point.address}</div>
                            <div style="margin-bottom: 4px;"><strong>Hours:</strong> ${point.openingHour} - ${point.closingHour}</div>
                            <div style="margin-bottom: 4px;"><strong>Status:</strong> ${statusText}</div>
                            <div style="margin-bottom: 4px;"><strong>Description:</strong> ${point.description || 'No description available'}</div>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 12px;">
                        <div style="font-size: 14px; font-weight: bold; margin-bottom: 6px;">Waste Categories:</div>
                        ${categoriesHtml}
                    </div>
                    
                    ${point.contactInfo && (point.contactInfo.phone || point.contactInfo.email) ? `
                    <div style="background-color: #f3f3f4; padding: 8px; border-radius: 6px; border-left: 3px solid #2e8a57;">
                        <div style="font-size: 13px; font-weight: bold; color: #333; margin-bottom: 4px;">Contact</div>
                        ${point.contactInfo.phone ? `<div style="font-size: 12px; color: #555;"><strong>Phone:</strong> ${point.contactInfo.phone}</div>` : ''}
                        ${point.contactInfo.email ? `<div style="font-size: 12px; color: #555;"><strong>Email:</strong> ${point.contactInfo.email}</div>` : ''}
                    </div>
                    ` : ''}
                </div>
            `;

            marker.bindPopup(popupContent);

            marker.on('click', () => {
                console.log(`Recycle point clicked: ${point.name}`);
            });
        });

    })
    .catch(error => {
        console.error('Error fetching recycle points:', error);
    });


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

    const response = await fetch('/api/addReport', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
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
