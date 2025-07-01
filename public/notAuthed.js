(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        document.querySelector('main').innerHTML = '<section class="hero"><h2>Please log in to access the dashboard.</h2></section>';
      return;
    }

    try {
      const userRes = await fetch('/api/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!userRes.ok) {
        console.warn('Failed to fetch user info:', userRes.status);
        return;
      }
    //   console.log('User info response:', userRes);

      const user = await userRes.json();
      if(user.data.role==='authority'  && !user.data.validated) {
        document.querySelector('main').innerHTML = '<section class="hero"><h2>Your account is not validated. Please contact an administrator to validate your account.</h2></section>';
        return;
      }
      if (!user.data.role) {
        console.warn('User role missing');
        return;
      }

      let page;
      switch (user.data.role) {
        case 'admin':
          page = '/admin-dashboard';
          break;
        case 'authority':
          page = '/authority-dashboard';
          break;
        default:
          page = '/user-dashboard';
      }

      // Fetch dashboard HTML with auth header
      const dashRes = await fetch(page, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!dashRes.ok) {
        console.warn('Failed to load dashboard:', dashRes.status);
        return;
      }

      const html = await dashRes.text();
    //   const main = document.querySelector('main');
    //   if (main) main.innerHTML = html;
      document.open();
        document.write(html);
        document.close();

    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  })();