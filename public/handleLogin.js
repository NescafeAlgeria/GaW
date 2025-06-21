const form = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Form submitted');

    errorMessage.style.display = 'none';
    errorMessage.textContent = '';

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    console.log('Form data:', data);
    try {
        const res = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (res.ok) {
            window.location.href = '/';
        } else {
            const errorData = await res.json();
            errorMessage.textContent = errorData.message || 'Login failed';
            errorMessage.style.display = 'block';
        }
    } catch (err) {
        errorMessage.textContent = 'Network error';
        errorMessage.style.display = 'block';
    }
});