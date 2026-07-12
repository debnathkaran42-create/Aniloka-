/* ANILOKA — SPLASH PARTICLES */
(function () {
  const canvas = document.getElementById("particle-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let w, h, particles;

  function resize() {
    w = canvas.width = canvas.offsetWidth;
    h = canvas.height = canvas.offsetHeight;
  }

  function makeParticles() {
    const count = Math.min(90, Math.floor((w * h) / 14000));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.6 + 0.4,
      vy: Math.random() * 0.25 + 0.05,
      vx: (Math.random() - 0.5) * 0.15,
      a: Math.random() * 0.5 + 0.15
    }));
  }

  function tick() {
    ctx.clearRect(0, 0, w, h);
    particles.forEach(p => {
      p.y -= p.vy;
      p.x += p.vx;
      if (p.y < -5) { p.y = h + 5; p.x = Math.random() * w; }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(212,175,55,${p.a})`;
      ctx.fill();
    });
    requestAnimationFrame(tick);
  }

  window.addEventListener("resize", () => { resize(); makeParticles(); });
  resize();
  makeParticles();
  tick();
})();

document.getElementById("enter-btn")?.addEventListener("click", () => {
  if (DB.getSettings().maintenanceMode) { window.location.href = "maintenance.html"; return; }
  document.querySelector(".splash").style.transition = "opacity .5s ease";
  document.querySelector(".splash").style.opacity = "0";
  setTimeout(() => {
    window.location.href = DB.getSession() ? "home.html" : "login.html";
  }, 480);
});
