document.addEventListener('DOMContentLoaded', async function () {
    try {
        const response = await fetch('/api/currentUser');
        if (response.ok) {
            const user = await response.json();
            document.getElementById('welcome-message').textContent = `Hi, ${escapeHtml(user.username)}!`;
        }
    } catch (error) {
        console.error('Error fetching user info:', error);
    }
});
