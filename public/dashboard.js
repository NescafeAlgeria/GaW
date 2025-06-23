document.getElementById('exportReportBtn').addEventListener('click', function () {
    const county = document.getElementById('countyDropdown').value;
    const format = document.getElementById('formatDropdown').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!county) {
        alert('Please select a county first.');
        return;
    }

    let exportUrl = `/api/exportReport?county=${encodeURIComponent(county)}&format=${encodeURIComponent(format)}`;
    
    if (startDate) {
        exportUrl += `&startDate=${encodeURIComponent(startDate)}`;
    }
    if (endDate) {
        exportUrl += `&endDate=${encodeURIComponent(endDate)}`;
    }
    
    fetch(exportUrl)
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
            a.download = `${county}_report.${format}`;
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
    const county = document.getElementById('countyDropdown').value;
    const exportBtn = document.getElementById('exportReportBtn');
    exportBtn.disabled = !county;
}

document.getElementById('countyDropdown').addEventListener('change', updateExportButton);

fetch('/api/getAllReportedCities')
    .then(response => response.json())
    .then(data => {
        const dropdown = document.getElementById('countyDropdown');
        if (data.counties && Array.isArray(data.counties)) {
            data.counties.forEach(county => {
                const option = document.createElement('option');
                option.value = county;
                option.textContent = county;
                dropdown.appendChild(option);
            });
        }
        updateExportButton();
    })
    .catch(err => {
        console.error('Failed to load counties:', err);
    });



