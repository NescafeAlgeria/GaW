document.addEventListener('DOMContentLoaded', async function () {
    try {
        const token = localStorage.getItem('token');
        if(!token) return;
        const response = await fetch('/api/users/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (response.ok) {
            const user = await response.json();
            document.getElementById('welcome-message').textContent = `Hi, ${user.username}!`;
        }
    } catch (error) {
        console.error('Error fetching user info:', error);
    }
});
