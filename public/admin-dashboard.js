document.addEventListener('DOMContentLoaded', function () {
    loadReports();
    loadUsers();
});

async function loadReports() {
    try {
        const response = await fetch('/api/reports', {
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

async function loadUsers() {
    try {

        const response = await fetch('/api/users', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const users = await response.json();

        if (Array.isArray(users.data)) {
            displayUsers(users.data);
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
        <tr style="border-bottom: 1px solid #ddd; ${report.solved === 'true' ? `background-color:#ccc` : ``};">
            <td style="padding: 0.75rem;">${report.county || 'Unknown'}</td>
            <td style="padding: 0.75rem;">${report.locality || 'Unknown'}</td>
            <td style="padding: 0.75rem;">${report.category || 'N/A'}</td>
            <td style="padding: 0.75rem;">${report.severity || 'N/A'}</td>
            <td style="padding: 0.75rem; max-width: 200px; word-wrap: break-word;">${report.description || 'No description'}</td>
            <td style="padding: 0.75rem;">${report.createdAt ? new Date(report.createdAt).toLocaleDateString() : 'N/A'}</td>
            <td style="padding: 0.75rem;">
                <button onclick="deleteReport('${report._id}')" style="padding: 0.5rem 1rem; background-color: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">Delete</button>
                ${report.solved === 'true' ? '' : `<button onclick="solveReport('${report._id}')" style="padding: 0.5rem 1rem; background-color: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">Solve</button>`}
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
            <td style="padding: 0.75rem;">${user.username || 'N/A'}</td>
            <td style="padding: 0.75rem;">${user.email || 'N/A'}</td>
            <td style="padding: 0.75rem;">${user.role || 'user'}</td>
            <td style="padding: 0.75rem;">
                <button onclick="deleteUser('${user._id}')" style="padding: 0.5rem 1rem; background-color: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">Delete</button>
                <select class="role-select" onchange="updateUserRole('${user._id}', this.value)" style="margin-left: 0.5rem; padding: 0.25rem; border: 1px solid #ccc; border-radius: 4px; font-size: 0.9rem;">
                    <option value="" disabled selected>Change Role</option>
                    <option value="user">User</option>
                    <option value="authority">Authority</option>
                    <option value="admin">Admin</option>
                </select>
                ${!user.validated && user.role === 'authority' ? `<button onclick="validateUser('${user._id}')" style="padding: 0.5rem 1rem; background-color: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">Validate</button>` : ''}
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

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) {
        return;
    }

    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
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

async function validateUser(userId) {
    if (!confirm('Are you sure you want to validate this user?')) {
        return;
    }

    try {
        const response = await fetch(`/api/users/${userId}/validate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });



        if (response.ok) {
            loadUsers();
        } else {
            alert('Error validating user');
        }
    } catch (error) {
        console.error('Error validating user:', error);
        alert('Error validating user');
    }
}

async function updateUserRole(userId, newRole) {
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/users/${userId}/role`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ role: newRole })
        });

        if (response.ok) {
            loadUsers();
        } else {
            alert('Error updating user role');
        }
    } catch (error) {
        console.error('Error updating user role:', error);
        alert('Error updating user role');
    }
}

async function solveReport(reportId) {
    if (!confirm('Are you sure you want to mark this report as solved?')) {
        return;
    }

    try {
        const response = await fetch(`/api/reports/${reportId}/solve`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            loadReports();
        } else {
            alert('Error marking report as solved');
        }
    } catch (error) {
        console.error('Error marking report as solved:', error);
        alert('Error marking report as solved');
    }
}