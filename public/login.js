
    const form = document.getElementById('loginForm');
    const popup = document.getElementById('popup');

    function showPopup(message, isSuccess = false) {
      popup.textContent = message;
      popup.className = 'popup' + (isSuccess ? ' success' : '');
      popup.style.display = 'block';
      setTimeout(() => {
        popup.style.display = 'none';
      }, 3000);
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      
      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Login failed');
        }

        // Store JWT token in localStorage
        localStorage.setItem('token', data.token);
        showPopup('Login successful!', true);

        // Redirect based on user role if provided
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);

      } catch (err) {
        showPopup(err.message || 'An error occurred during login.');
      }
    });