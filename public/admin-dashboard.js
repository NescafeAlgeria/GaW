document.addEventListener('DOMContentLoaded', function () {
    loadReports();
    loadUsers();
});

async function loadReports() {
    try {
        const response = await fetch('/api/reports');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reports = await response.json();

        if (Array.isArray(reports)) {
            displayReports(reports);
        } else {
            console.error('Reports is not an array:', reports);
            document.getElementById('reports-tbody').innerHTML = '<tr><td colspan="7" style="padding: 1rem; text-align: center;">Invalid data format</td></tr>';
        }
    } catch (error) {
        console.error('Error loading reports:', error);
        document.getElementById('reports-tbody').innerHTML = '<tr><td colspan="7" style="padding: 1rem; text-align: center;">Error loading reports</td></tr>';
    }
}

async function loadUsers() {
    try {
        const response = await fetch('/api/users');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const users = await response.json();

        if (Array.isArray(users)) {
            displayUsers(users);
        } else {
            console.error('Users is not an array:', users);
            document.getElementById('users-tbody').innerHTML = '<tr><td colspan="4" style="padding: 1rem; text-align: center;">Invalid data format</td></tr>';
        }
    } catch (error) {
        console.error('Error loading users:', error);
        document.getElementById('users-tbody').innerHTML = '<tr><td colspan="4" style="padding: 1rem; text-align: center;">Error loading users</td></tr>';
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
            <td style="padding: 0.75rem;">${escapeHtml(report.county || 'Unknown')}</td>
            <td style="padding: 0.75rem;">${escapeHtml(report.locality || 'Unknown')}</td>
            <td style="padding: 0.75rem;">${escapeHtml(report.category || 'N/A')}</td>
            <td style="padding: 0.75rem;">${escapeHtml(report.severity || 'N/A')}</td>
            <td style="padding: 0.75rem; max-width: 200px; word-wrap: break-word;">${escapeHtml(report.description || 'No description')}</td>
            <td style="padding: 0.75rem;">${report.createdAt ? new Date(report.createdAt).toLocaleDateString() : 'N/A'}</td>
            <td style="padding: 0.75rem;">
                <button onclick="deleteReport('${report._id}')" style="padding: 0.5rem 1rem; background-color: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">Delete</button>
            </td>
        </tr>
    `).join('');
}

function displayUsers(users) {
    const tbody = document.getElementById('users-tbody');
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="padding: 1rem; text-align: center;">No users found</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(user => `
        <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 0.75rem;">${escapeHtml(user.username || 'N/A')}</td>
            <td style="padding: 0.75rem;">${escapeHtml(user.email || 'N/A')}</td>
            <td style="padding: 0.75rem;">${escapeHtml(user.role || 'user')}</td>
            <td style="padding: 0.75rem;">
                <button onclick="deleteUser('${user._id}')" style="padding: 0.5rem 1rem; background-color: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">Delete</button>
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
            method: 'DELETE'
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

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) {
        return;
    }

    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadUsers();
        } else {
            alert('Error deleting user');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting user');
    }
}
