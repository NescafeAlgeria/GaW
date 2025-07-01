const token = localStorage.getItem('token');

if (token) {
  document.querySelectorAll('.auth-buttons').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.logout-button').forEach(el => el.style.display = 'flex');
}


