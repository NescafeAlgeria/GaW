document.getElementById('exportReportBtn').addEventListener('click', function () {
    const exportType = document.getElementById('exportType').value;
    const format = document.getElementById('formatDropdown').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    let exportUrl = '/api/reports/export?';
    let fileName = '';

    if (exportType === 'county') {
        const county = document.getElementById('countyDropdown').value;
        if (!county) {
            alert('Please select a county first.');
            return;
        }
        exportUrl += `county=${encodeURIComponent(county)}`;
        fileName = `${county}_report.${format}`;
    } else {
        const locality = document.getElementById('localityDropdown').value;
        if (!locality) {
            alert('Please select a locality first.');
            return;
        }
        exportUrl += `locality=${encodeURIComponent(locality)}`;
        fileName = `${locality}_neighbourhoods.${format}`;
    }

    exportUrl += `&format=${encodeURIComponent(format)}`;

    if (startDate) {
        exportUrl += `&startDate=${encodeURIComponent(startDate)}`;
    }
    if (endDate) {
        exportUrl += `&endDate=${encodeURIComponent(endDate)}`;
    }

    fetch(exportUrl, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
        .then(res => {
            if (!res.ok) {
                throw new Error('Export failed');
            }
            return res.blob();
        })
        .then(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        })
        .catch(err => {
            console.error('Error:', err);
            alert('Failed to export report. Please try again.');
        });
});

function updateExportButton() {
    const exportType = document.getElementById('exportType').value;
    const exportBtn = document.getElementById('exportReportBtn');

    if (exportType === 'county') {
        const county = document.getElementById('countyDropdown').value;
        exportBtn.disabled = !county;
    } else {
        const locality = document.getElementById('localityDropdown').value;
        exportBtn.disabled = !locality;
    }
}

function toggleExportType() {
    const exportType = document.getElementById('exportType').value;
    const countySelection = document.getElementById('countySelection');
    const localitySelection = document.getElementById('localitySelection');

    if (exportType === 'county') {
        countySelection.style.display = 'block';
        localitySelection.style.display = 'none';
    } else {
        countySelection.style.display = 'none';
        localitySelection.style.display = 'block';
    }

    updateExportButton();
}

document.getElementById('exportType').addEventListener('change', toggleExportType);
document.getElementById('countyDropdown').addEventListener('change', updateExportButton);
document.getElementById('localityDropdown').addEventListener('change', updateExportButton);

fetch('/api/reports/cities', {
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
})
    .then(response => response.json())
    .then(data => {
        const dropdown = document.getElementById('countyDropdown');
        if (data.data.counties && Array.isArray(data.data.counties)) {
            data.data.counties.forEach(county => {
                const option = document.createElement('option');
                option.value = county;
                option.textContent = escapeHtml(county);
                dropdown.appendChild(option);
            });
        }
        updateExportButton();
    })
    .catch(err => {
        console.error('Failed to load counties:', err);
    });

fetch('/api/reports/localities', {
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
})
    .then(response => response.json())
    .then(data => {
        const dropdown = document.getElementById('localityDropdown');
        if (data.data.localities && Array.isArray(data.data.localities)) {
            data.data.localities.forEach(locality => {
                const option = document.createElement('option');
                option.value = locality;
                option.textContent = escapeHtml(locality);
                dropdown.appendChild(option);
            });
        }
        updateExportButton();
    })
    .catch(err => {
        console.error('Failed to load localities:', err);
    });

toggleExportType();



