document.addEventListener("DOMContentLoaded", async () => {
  try {
    const [usersRes, reportsRes, solvedRes] = await Promise.all([
      fetch('/api/users/count'),
      fetch('/api/reports/count'),
      fetch('/api/reports/count/solved')
    ]);
    if (!usersRes.ok || !reportsRes.ok || !solvedRes.ok) {
      throw new Error(`Failed to fetch data: ${usersRes.status} ${reportsRes.status} ${solvedRes.status}`);
    }
    const users = await usersRes.json();
    const reports = await reportsRes.json();
    const solved = await solvedRes.json();
    console.log("solved", solved.data);
    animateCounter("userCount", users.data.count);
    animateCounter("reportCount", reports.data.count);
    animateCounter("solvedCount", solved.data.count);
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

