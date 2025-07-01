var map = L.map('map').setView([47.1585, 27.6014], 13);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

let marker = undefined;
let recyclePointMarkers = [];

const mapDiv = document.getElementById('map');
const formTab = document.getElementById('recycle-point-form');
const infoTab = document.getElementById('recycle-point-info');
const pointInfoDisplay = document.getElementById('point-info-display');
const longitudeText = document.getElementById('point-longitude');
const latitudeText = document.getElementById('point-latitude');
const nameInput = document.getElementById('point-name');
const addressInput = document.getElementById('point-address');
const descriptionInput = document.getElementById('point-description');
const householdCapacityInput = document.querySelector('input[name="householdCapacity"]');
const plasticCapacityInput = document.querySelector('input[name="plasticCapacity"]');
const paperCapacityInput = document.querySelector('input[name="paperCapacity"]');
const glassCapacityInput = document.querySelector('input[name="glassCapacity"]');
const openingHourInput = document.getElementById('opening-hour');
const closingHourInput = document.getElementById('closing-hour');
const contactPhoneInput = document.getElementById('contact-phone');
const contactEmailInput = document.getElementById('contact-email');
const submitButton = document.getElementById('submit-point');
const resultText = document.getElementById('form-result');

function showRecyclePointInfo(point) {
    const isOpen = (() => {
        if (!point.openingHour || !point.closingHour) return false;
        const now = new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const [openH, openM] = point.openingHour.split(':').map(Number);
        const [closeH, closeM] = point.closingHour.split(':').map(Number);
        const openMinutes = openH * 60 + openM;
        const closeMinutes = closeH * 60 + closeM;
        return nowMinutes >= openMinutes && nowMinutes < closeMinutes;
    })(); const categories = ['household', 'plastic', 'paper', 'glass'];
    const supportedCategories = categories.filter(cat => point.capacities && point.capacities[cat] > 0);
    const statusText = isOpen ? '<span style="color: green;">Open</span>' : '<span style="color: red;">Closed</span>';

    let categoriesHtml = '';
    supportedCategories.forEach(category => {
        const capacity = point.capacities[category] || 0;
        const fillAmount = point.fillAmounts?.[category] || 0;
        const percentage = capacity > 0 ? (fillAmount / capacity * 100).toFixed(1) : 0;
        const isFull = fillAmount >= capacity; categoriesHtml += `
            <div style="margin-bottom: 8px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                <div style="font-size: 14px; font-weight: bold; margin-bottom: 4px; text-transform: capitalize;">${category.replace('household', 'Household Waste')}</div>
                <div style="font-size: 12px; margin-bottom: 4px;">${fillAmount}kg / ${capacity}kg (${percentage}% filled)</div>
                <div style="background-color: #e0e0e0; height: 12px; border-radius: 6px; overflow: hidden;">
                    <div style="background-color: ${percentage > 80 ? '#c04040' : percentage > 50 ? '#FF9800' : '#4bae50'}; height: 100%; width: ${percentage}%; transition: width 0.3s;"></div>
                </div>
                <div style="margin-top: 6px; display: flex; gap: 4px; align-items: center;">
                    <input type="number" id="amount-${category}-${point._id}" min="0" max="${capacity - fillAmount}" style="flex: 1; padding: 4px; border: 1px solid #ccc; border-radius: 4px;" placeholder="Enter kg">
                    <button onclick="addGarbage('${point._id}', '${category}')" style="padding: 4px 8px; background-color: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;" ${isFull ? 'disabled' : ''}>Add</button>
                    <button onclick="clearGarbage('${point._id}', '${category}')" style="padding: 4px 8px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;" ${fillAmount === 0 ? 'disabled' : ''}>Clear</button>
                </div>
            </div>
        `;
    });

    const infoContent = `
        <div style="margin-bottom: 12px;">
            <h3 style="margin: 0 0 8px 0; color: #333;">${point.name}</h3>
            <div style="color: #666; font-size: 14px;">
                <div style="margin-bottom: 4px;"><strong>Address:</strong> ${point.address}</div>
                <div style="margin-bottom: 4px;"><strong>Hours:</strong> ${point.openingHour} - ${point.closingHour}</div>
                <div style="margin-bottom: 4px;"><strong>Status:</strong> ${statusText}</div>
                <div style="margin-bottom: 4px;"><strong>Description:</strong> ${point.description || 'No description available'}</div>
                ${point.contactInfo && point.contactInfo.phone ? `<div style="margin-bottom: 4px;"><strong>Phone:</strong> ${point.contactInfo.phone}</div>` : ''}
                ${point.contactInfo && point.contactInfo.email ? `<div style="margin-bottom: 4px;"><strong>Email:</strong> ${point.contactInfo.email}</div>` : ''}
            </div>
        </div>        <div style="margin-bottom: 12px;">
            <div style="font-size: 16px; font-weight: bold; margin-bottom: 8px;">Waste Categories:</div>
            ${categoriesHtml}
        </div>
        
        <div class="delete-section">
            <button onclick="deleteRecyclePoint('${point._id}')" class="delete-btn">Delete Recycle Point</button>
        </div>
        
        <div id="garbage-result-${point._id}" style="margin-top: 8px; font-size: 12px;"></div>
        <div id="delete-result-${point._id}" class="delete-result"></div>
    `;

    pointInfoDisplay.innerHTML = infoContent;

    formTab.style.display = 'none';
    infoTab.style.display = 'flex';
    infoTab.style.width = '30%';
    mapDiv.style.width = '70%';
}

function showAddForm() {
    if (marker) {
        longitudeText.innerText = marker.getLatLng().lng;
        latitudeText.innerText = marker.getLatLng().lat;
    }

    infoTab.style.display = 'none';
    formTab.style.display = 'flex';
    formTab.style.width = '30%';
    mapDiv.style.width = '70%';
}

submitButton.addEventListener('click', async (event) => {
    submitButton.innerText = 'Adding...';
    submitButton.disabled = true;
    resultText.innerText = '';

    event.preventDefault();

    let lat, lng;
    if (marker) {
        lat = marker.getLatLng().lat;
        lng = marker.getLatLng().lng;
    } const name = nameInput.value.trim();
    const address = addressInput.value.trim();
    const description = descriptionInput.value.trim();
    const householdCapacity = parseFloat(householdCapacityInput.value) || 0;
    const plasticCapacity = parseFloat(plasticCapacityInput.value) || 0;
    const paperCapacity = parseFloat(paperCapacityInput.value) || 0;
    const glassCapacity = parseFloat(glassCapacityInput.value) || 0;
    const openingHour = openingHourInput.value;
    const closingHour = closingHourInput.value;
    const contactPhone = contactPhoneInput.value.trim();
    const contactEmail = contactEmailInput.value.trim();

    const capacities = {};
    const fillAmounts = {};
    if (householdCapacity > 0) { capacities.household = householdCapacity; fillAmounts.household = 0; }
    if (plasticCapacity > 0) { capacities.plastic = plasticCapacity; fillAmounts.plastic = 0; }
    if (paperCapacity > 0) { capacities.paper = paperCapacity; fillAmounts.paper = 0; }
    if (glassCapacity > 0) { capacities.glass = glassCapacity; fillAmounts.glass = 0; }

    if (!lat || !lng || !name || !address || Object.keys(capacities).length === 0 || !openingHour || !closingHour) {
        resultText.innerText = 'Error: Please fill in all required fields, add at least one waste category capacity, and select a location on the map.';
        resultText.style.color = 'red';
        submitButton.innerText = 'Add Recycle Point';
        submitButton.disabled = false;
        return;
    }

    const requestData = {
        lat: lat,
        lng: lng,
        name: name,
        address: address, description: description,
        capacities: capacities,
        fillAmounts: fillAmounts,
        openingHour: openingHour,
        closingHour: closingHour,
        contactInfo: {
            phone: contactPhone || null,
            email: contactEmail || null
        }
    };

    try {
        const response = await fetch('/api/recycle-points', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(requestData)
        });

        const result = await response.json();

        if (response.ok) {
            resultText.innerText = 'Recycle point added successfully!';
            resultText.style.color = 'green';

            nameInput.value = '';
            addressInput.value = '';
            descriptionInput.value = '';
            householdCapacityInput.value = '';
            plasticCapacityInput.value = '';
            paperCapacityInput.value = '';
            glassCapacityInput.value = '';
            openingHourInput.value = '';
            closingHourInput.value = '';
            contactPhoneInput.value = '';
            contactEmailInput.value = '';
            longitudeText.innerText = '';
            latitudeText.innerText = '';

            if (marker) {
                map.removeLayer(marker);
                marker = undefined;
            }

            setTimeout(() => {
                loadRecyclePoints();
            }, 100);
        } else {
            resultText.innerText = 'Error: ' + (result.error?.message || 'Failed to add recycle point');
            resultText.style.color = 'red';
        }
    } catch (error) {
        resultText.innerText = 'Error: Network error occurred';
        resultText.style.color = 'red';
    }

    submitButton.innerText = 'Add Recycle Point';
    submitButton.disabled = false;
});

function loadRecyclePoints() {
    recyclePointMarkers.forEach(markerData => {
        map.removeLayer(markerData.marker);
    });
    recyclePointMarkers = [];

    fetch('/api/recycle-points', {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    },)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data.success) {
                console.error('Failed to load recycle points:', data);
                return;
            }
            const recyclePoints = data.data;

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

                const recycleMarker = L.marker([latitude, longitude], { icon: customIcon }).addTo(map);
                recycleMarker.on('click', e => {
                    L.DomEvent.stopPropagation(e);
                    if (marker) {
                        map.removeLayer(marker);
                        marker = undefined;
                    }
                    showRecyclePointInfo(point);
                });
                recyclePointMarkers.push({ marker: recycleMarker, point: point });
            });
        })
        .catch(error => {
            console.error('Error fetching recycle points:', error);
        });
}

map.off('click');
map.on('click', (e) => {
    if (e.sourceTarget && e.sourceTarget instanceof L.Marker) return;
    if (marker) {
        marker.setLatLng(e.latlng);
    } else {
        marker = L.marker(e.latlng).addTo(map);
    }
    showAddForm();
});

async function addGarbage(pointId, category) {
    const amountInput = document.getElementById(`amount-${category}-${pointId}`);
    const resultDiv = document.getElementById(`garbage-result-${pointId}`);
    const amount = parseFloat(amountInput.value);

    if (!amount || amount <= 0) {
        resultDiv.innerText = 'Please enter a valid amount';
        resultDiv.style.color = 'red';
        return;
    }

    try {
        const response = await fetch('/api/recycle-points/garbage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ id: pointId, amount: amount, category: category })
        });

        const result = await response.json(); if (response.ok) {
            resultDiv.innerText = `Added ${amount}kg of ${category} garbage successfully!`;
            resultDiv.style.color = 'green';
            amountInput.value = '';

            const updatedPoint = recyclePointMarkers.find(marker => marker.point._id === pointId);
            if (updatedPoint) {
                if (!updatedPoint.point.fillAmounts) updatedPoint.point.fillAmounts = {};
                updatedPoint.point.fillAmounts[category] = (updatedPoint.point.fillAmounts[category] || 0) + amount;
                showRecyclePointInfo(updatedPoint.point);
            }

            loadRecyclePoints();
        } else {
            resultDiv.innerText = 'Error: ' + (result.error?.message || 'Failed to add garbage');
            resultDiv.style.color = 'red';
        }
    } catch (error) {
        resultDiv.innerText = 'Error: Network error occurred';
        resultDiv.style.color = 'red';
    }
}

async function clearGarbage(pointId, category) {
    const amountInput = document.getElementById(`amount-${category}-${pointId}`);
    const resultDiv = document.getElementById(`garbage-result-${pointId}`);
    const amount = parseFloat(amountInput.value);

    if (!amount || amount <= 0) {
        resultDiv.innerText = 'Please enter a valid amount';
        resultDiv.style.color = 'red';
        return;
    }

    try {
        const response = await fetch('/api/recycle-points/garbage', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ id: pointId, amount: amount, category: category })
        });

        const result = await response.json(); if (response.ok) {
            resultDiv.innerText = `Cleared ${amount}kg of ${category} garbage successfully!`;
            resultDiv.style.color = 'green';
            amountInput.value = '';

            const updatedPoint = recyclePointMarkers.find(marker => marker.point._id === pointId);
            if (updatedPoint) {
                if (!updatedPoint.point.fillAmounts) updatedPoint.point.fillAmounts = {};
                updatedPoint.point.fillAmounts[category] = Math.max((updatedPoint.point.fillAmounts[category] || 0) - amount, 0);
                showRecyclePointInfo(updatedPoint.point);
            }

            loadRecyclePoints();
        } else {
            resultDiv.innerText = 'Error: ' + (result.error?.message || 'Failed to clear garbage');
            resultDiv.style.color = 'red';
        }
    } catch (error) {
        resultDiv.innerText = 'Error: Network error occurred';
        resultDiv.style.color = 'red';
    }
}

async function deleteRecyclePoint(pointId) {
    const resultDiv = document.getElementById(`delete-result-${pointId}`);

    if (!confirm('Are you sure you want to delete this recycle point? This action cannot be undone.')) {
        return;
    } try {
        const response = await fetch(`/api/recycle-points/${pointId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            resultDiv.innerText = 'Recycle point deleted successfully!';
            resultDiv.style.color = 'green';

            formTab.style.display = 'flex';
            infoTab.style.display = 'none';
            formTab.style.width = '30%';
            mapDiv.style.width = '70%';

            loadRecyclePoints();
        } else {
            let errorMessage = 'Failed to delete recycle point';
            try {
                const result = await response.json();
                errorMessage = result.error?.message || errorMessage;
            } catch (error) {
            }
            resultDiv.innerText = 'Error: ' + errorMessage;
            resultDiv.style.color = 'red';
        }
    } catch (error) {
        resultDiv.innerText = 'Error: Network error occurred';
        resultDiv.style.color = 'red';
    }
}

loadRecyclePoints();
