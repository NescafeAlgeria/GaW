document.addEventListener('DOMContentLoaded', async function () {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const response = await fetch('/api/users/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (response.ok) {
            const user = await response.json();
            document.getElementById('welcome-message').textContent = `Hi, ${user.data.username}!`;
        }
    } catch (error) {
        console.error('Error fetching user info:', error);
    }

    loadReports();
});

async function loadReports() {
    try {

        const response = await fetch('/api/reports/me', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reports = await response.json();

        if (Array.isArray(reports.data)) {
            displayReports(reports.data);
        } else {
            console.error('Reports is not an array:', reports.data);
            document.getElementById('reports-tbody').innerHTML = '<tr><td colspan="7" style="padding: 1rem; text-align: center;">Invalid data format</td></tr>';
        }
    } catch (error) {
        console.error('Error loading reports:', error);
        document.getElementById('reports-tbody').innerHTML = '<tr><td colspan="7" style="padding: 1rem; text-align: center;">Error loading reports</td></tr>';
    }
}

function displayReports(reports) {
    const tbody = document.getElementById('reports-tbody');
    if (reports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="padding: 1rem; text-align: center;">No reports found</td></tr>';
        return;
    }

    tbody.innerHTML = reports.map(report => `
        <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 0.75rem;">${report.county || 'Unknown'}</td>
            <td style="padding: 0.75rem;">${report.locality || 'Unknown'}</td>
            <td style="padding: 0.75rem;">${report.category || 'N/A'}</td>
            <td style="padding: 0.75rem;">${report.severity || 'N/A'}</td>
            <td style="padding: 0.75rem; max-width: 200px; word-wrap: break-word;">${report.description || 'No description'}</td>
            <td style="padding: 0.75rem;">${report.createdAt ? new Date(report.createdAt).toLocaleDateString() : 'N/A'}</td>
            <td style="padding: 0.75rem;">
                <button onclick="deleteReport('${report._id}')" style="padding: 0.5rem 1rem; background-color: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">Delete</button>
            </td>
        </tr>
    `).join('');
}

async function deleteReport(reportId) {
    if (!confirm('Are you sure you want to delete this report?')) {
        return;
    }

    try {
        const response = await fetch(`/api/reports/${reportId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (response.ok) {
            loadReports();
        } else {
            alert('Error deleting report');
        }
    } catch (error) {
        console.error('Error deleting report:', error);
        alert('Error deleting report');
    }
}