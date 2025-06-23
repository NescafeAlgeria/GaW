
function getCookie(name) {
  const cookies = document.cookie.split('; ');
  for (const cookie of cookies) {
    const [key, value] = cookie.split('=');
    if (key === name) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

const sessionId = getCookie('sessionId');
if (sessionId) {
  document.querySelectorAll('.auth-buttons').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.logout-button').forEach(el => el.style.display = 'flex');
}