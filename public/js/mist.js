/* Bruden — Canvas mist overlay  (cream × sepia palette) */
(function () {
  const canvas = document.getElementById('mistCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, tick = 0;

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  /* smooth organic noise via layered sines */
  function noise(x, seed) {
    return Math.sin(x * 0.18 + seed)        * 0.40
         + Math.sin(x * 0.51 + seed * 1.7)  * 0.32
         + Math.sin(x * 1.10 + seed * 3.1)  * 0.20
         + Math.sin(x * 2.30 + seed * 5.8)  * 0.08;
  }

  /* Each layer: yR=centre (0-1 of H), hR=half-height ratio, a=alpha, sp=scroll speed */
  const layers = [
    { yR: 0.28, hR: 0.07, a: 0.09, sp: 0.06, seed:  1.3, c: '232,215,185' }, // pale cream high
    { yR: 0.38, hR: 0.10, a: 0.13, sp: 0.10, seed:  4.7, c: '220,200,165' }, // warm sand
    { yR: 0.48, hR: 0.11, a: 0.16, sp: 0.15, seed:  9.2, c: '208,186,148' }, // golden haze
    { yR: 0.58, hR: 0.10, a: 0.13, sp: 0.19, seed: 16.5, c: '195,172,132' }, // amber mist
    { yR: 0.68, hR: 0.08, a: 0.08, sp: 0.08, seed: 24.1, c: '180,158,118' }, // deep valley mist
  ];

  function drawLayer(l) {
    const cy  = H * l.yR;
    const hh  = H * l.hR;
    const spd = tick * l.sp;
    const off = spd % W;

    // draw tiled so it scrolls seamlessly
    for (let rep = -1; rep <= 1; rep++) {
      const ox = off + rep * W;
      const steps = 130;

      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const frac = i / steps;
        const x = ox + frac * W;
        const wave = noise(frac * 10, l.seed + tick * 0.0018) * hh * 0.55;
        if (i === 0) ctx.moveTo(x, cy - hh + wave);
        else         ctx.lineTo(x, cy - hh + wave);
      }
      for (let i = steps; i >= 0; i--) {
        const frac = i / steps;
        const x = ox + frac * W;
        const wave = noise(frac * 10, l.seed * 1.5 + tick * 0.0018) * hh * 0.55;
        ctx.lineTo(x, cy + hh + wave);
      }
      ctx.closePath();

      const g = ctx.createLinearGradient(0, cy - hh, 0, cy + hh);
      g.addColorStop(0,    `rgba(${l.c},0)`);
      g.addColorStop(0.28, `rgba(${l.c},${l.a})`);
      g.addColorStop(0.72, `rgba(${l.c},${l.a})`);
      g.addColorStop(1,    `rgba(${l.c},0)`);
      ctx.fillStyle = g;
      ctx.fill();
    }
  }

  /* Soft centre glow — valley haze bloom */
  function drawValleyGlow() {
    // horizontal band across valley centre
    const cy = H * 0.54;
    const g = ctx.createRadialGradient(W * 0.5, cy, 0, W * 0.5, cy, W * 0.42);
    g.addColorStop(0,    'rgba(228,208,168,0.13)');
    g.addColorStop(0.45, 'rgba(215,192,148,0.06)');
    g.addColorStop(1,    'rgba(200,175,130,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  /* Bottom vignette to ground the scene */
  function drawBottomVignette() {
    const g = ctx.createLinearGradient(0, H * 0.72, 0, H);
    g.addColorStop(0, 'rgba(30,16,6,0)');
    g.addColorStop(1, 'rgba(20,10,4,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function loop() {
    tick++;
    ctx.clearRect(0, 0, W, H);
    drawValleyGlow();
    layers.forEach(drawLayer);
    drawBottomVignette();
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', resize);
  resize();
  loop();
})();
