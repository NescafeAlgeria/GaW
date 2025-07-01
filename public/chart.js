document.addEventListener("DOMContentLoaded", async () => {
  try {
    const [usersRes, reportsRes] = await Promise.all([
      fetch('/api/users/count'),
      fetch('/api/reports/count')
    ]);
    if (!usersRes.ok || !reportsRes.ok) {
      throw new Error(`Failed to fetch data: ${usersRes.status} ${reportsRes.status}`);
    }
    const users = await usersRes.json();
    const reports = await reportsRes.json();

    animateCounter("userCount", users.count);
    animateCounter("reportCount", reports.count);
  } catch (err) {
    console.error("Failed to load stats:", err);
  }
});

function animateCounter(id, target) {
  const el = document.getElementById(id);
  let start = 0;
  const duration = 500; // total animation time in ms
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const current = Math.floor(progress * target);
    el.textContent = current.toLocaleString(); // formatted with commas

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

