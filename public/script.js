
// show/hide auth buttons based on session cookie

function getCookie(name) {
  const cookies = document.cookie.split('; ');
  console.log('Cookies:', cookies);
  for (const cookie of cookies) {
    const [key, value] = cookie.split('=');
    if (key === name) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

  const sessionId = getCookie('sessionId');
  console.log('Session ID:', sessionId);
  if (sessionId) {
    document.querySelectorAll('.auth-buttons').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.logout-button').forEach(el => el.style.display = 'flex');
  }