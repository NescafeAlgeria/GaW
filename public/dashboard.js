document.getElementById('exportReportBtn').addEventListener('click', function () {
    const county = document.getElementById('countyDropdown').value;
    fetch(`/api/exportReport?county=${encodeURIComponent(county)}`)
        .then(res => res.blob())
        .then(blob => {
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        })
        .catch(err => {
            console.error('Error:', err)
        })
});

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
    })
    .catch(err => {
        console.error('Failed to load counties:', err);
    });



