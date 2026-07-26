/**
 * BRUDEN — Mountain Valley Scene (Final)
 *
 * Reference: sepia mountain valley, cream sky, hazy layered ridges,
 * dark foreground, winding golden river.
 *
 * Technique: 7 parallax billboard ridges rendered as proper 3D meshes
 * Each ridge = PlaneGeometry standing vertical, top edge procedurally
 * carved into mountain silhouette, bottom extends below frame.
 * Camera is orthographic-style perspective, looking straight ahead.
 * Result matches the painterly low-poly mountain look exactly.
 */
(function () {
  if (typeof THREE === 'undefined') return;
  var cv = document.getElementById('threeCanvas');
  if (!cv) return;

  var W = window.innerWidth, H = window.innerHeight;
  var renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf2e8d8);

  /* Camera: narrow FOV, eye-level, looking straight ahead */
  var camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 500);
  camera.position.set(0, 0, 80);
  camera.lookAt(0, 0, 0);

  /* ─────────────────────────────────────────
     NOISE — deterministic multi-octave
  ───────────────────────────────────────── */
  function noise1(x, freq, amp, phase) {
    return Math.sin(x * freq + phase) * amp
         + Math.cos(x * freq * 1.7 + phase * 1.3) * amp * 0.45
         + Math.sin(x * freq * 2.9 + phase * 0.7) * amp * 0.22
         + Math.cos(x * freq * 5.1 + phase * 2.1) * amp * 0.11
         + Math.sin(x * freq * 8.3 + phase * 0.4) * amp * 0.06;
  }

  /* ─────────────────────────────────────────
     RIDGE BUILDER
     Creates a rectangular mesh where the
     TOP edge is displaced into mountains,
     bottom edge is flat (off-screen below).
     Valley gap = open V in the centre.
  ───────────────────────────────────────── */
  function buildRidge(cfg) {
    var W3  = cfg.width  || 300;
    var H3  = cfg.height || 60;
    var segs = cfg.segs  || 320;

    /* Two rows: top (y=+H3/2) and bottom (y=-H3/2) */
    var verts = [];
    var uvs   = [];
    var idx   = [];

    for (var s = 0; s <= segs; s++) {
      var t  = s / segs;       /* 0..1 across width */
      var x  = (t - 0.5) * W3;
      var nx = t * 2 - 1;     /* -1..1 */

      /* ── Valley mask: 0 in centre, 1 at edges ── */
      var vhalf = cfg.valleyWidth * 0.5;
      var dist  = Math.abs(nx);
      var vmask = dist < vhalf ? 0 : Math.pow((dist - vhalf) / (1 - vhalf), cfg.valleyPow || 2.2);

      /* ── Mountain profile noise ── */
      var mh = noise1(nx, cfg.freq, cfg.amp, cfg.phase)
             + noise1(nx, cfg.freq * 2.3, cfg.amp * 0.4, cfg.phase * 1.7)
             + noise1(nx, cfg.freq * 5.1, cfg.amp * 0.18, cfg.phase * 0.8);

      var topY = cfg.baseY + vmask * cfg.peakH + mh * cfg.peakH * 0.30;
      var botY = cfg.baseY - H3;   /* deep below scene */

      /* Top vertex */
      verts.push(x, topY, 0);
      uvs.push(t, 1);
      /* Bottom vertex */
      verts.push(x, botY, 0);
      uvs.push(t, 0);
    }

    for (var s = 0; s < segs; s++) {
      var a = s * 2, b = s * 2 + 1, c = s * 2 + 2, d = s * 2 + 3;
      idx.push(a, b, c,  b, d, c);
    }

    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();

    var mat = new THREE.MeshLambertMaterial({
      color: cfg.color,
      transparent: cfg.opacity < 1,
      opacity: cfg.opacity,
      fog: true,
    });

    var mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(cfg.px || 0, cfg.py || 0, cfg.pz || 0);
    scene.add(mesh);
    return { mesh: mesh, mat: mat };
  }

  /* ─────────────────────────────────────────
     SCENE FOG — cream haze fades far ridges
  ───────────────────────────────────────── */
  scene.fog = new THREE.Fog(0xf0e4cc, 20, 160);

  /* ─────────────────────────────────────────
     SKY — gradient quad behind everything
  ───────────────────────────────────────── */
  (function () {
    var sg  = new THREE.PlaneGeometry(600, 300, 1, 12);
    var sp  = sg.attributes.position;
    var sc  = new Float32Array(sp.count * 3);
    for (var i = 0; i < sp.count; i++) {
      var y = sp.getY(i); /* -150..150 */
      var t = Math.max(0, Math.min(1, (y + 150) / 300));
      /* horizon: warm amber → zenith: parchment cream */
      sc[i*3]   = 0.82 + t * 0.12;
      sc[i*3+1] = 0.74 + t * 0.11;
      sc[i*3+2] = 0.56 + t * 0.18;
    }
    sg.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
    var sky = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({
      vertexColors: true, fog: false,
    }));
    sky.position.set(0, 60, -200);
    scene.add(sky);
  })();

  /* ─────────────────────────────────────────
     MOUNTAIN RIDGES  — back to front
     Each gets progressively darker & larger valley gap
  ───────────────────────────────────────── */
  var ridges = [];

  /* Ridge 0 — ghostly far (almost cream) */
  ridges.push(buildRidge({
    width: 400, height: 80, segs: 280,
    peakH: 22, valleyWidth: 0.44, valleyPow: 2.0,
    baseY: 8, freq: 1.8, amp: 1.0, phase: 0.3,
    color: 0xd0b898, opacity: 0.60,
    pz: -140,
  }));

  /* Ridge 1 */
  ridges.push(buildRidge({
    width: 380, height: 80, segs: 290,
    peakH: 26, valleyWidth: 0.38, valleyPow: 2.1,
    baseY: 5, freq: 2.1, amp: 1.0, phase: 1.4,
    color: 0xb89870, opacity: 0.72,
    pz: -110,
  }));

  /* Ridge 2 */
  ridges.push(buildRidge({
    width: 360, height: 80, segs: 300,
    peakH: 30, valleyWidth: 0.30, valleyPow: 2.2,
    baseY: 2, freq: 1.6, amp: 1.0, phase: 2.8,
    color: 0xa08058, opacity: 0.82,
    pz: -82,
  }));

  /* Ridge 3 — mid */
  ridges.push(buildRidge({
    width: 340, height: 80, segs: 310,
    peakH: 34, valleyWidth: 0.24, valleyPow: 2.3,
    baseY: -1, freq: 2.4, amp: 1.0, phase: 4.1,
    color: 0x886040, opacity: 0.90,
    pz: -58,
  }));

  /* Ridge 4 */
  ridges.push(buildRidge({
    width: 320, height: 80, segs: 310,
    peakH: 30, valleyWidth: 0.18, valleyPow: 2.4,
    baseY: -3, freq: 1.9, amp: 1.0, phase: 0.9,
    color: 0x6c4828, opacity: 0.95,
    pz: -36,
  }));

  /* Ridge 5 — near */
  ridges.push(buildRidge({
    width: 300, height: 80, segs: 320,
    peakH: 26, valleyWidth: 0.12, valleyPow: 2.5,
    baseY: -5, freq: 2.2, amp: 1.0, phase: 3.5,
    color: 0x503318, opacity: 0.98,
    pz: -16,
  }));

  /* Ridge 6 — foreground dark silhouette */
  ridges.push(buildRidge({
    width: 280, height: 80, segs: 330,
    peakH: 20, valleyWidth: 0.06, valleyPow: 2.8,
    baseY: -8, freq: 2.6, amp: 1.0, phase: 5.2,
    color: 0x301e0a, opacity: 1.0,
    pz: 2,
  }));

  /* ─────────────────────────────────────────
     VALLEY FLOOR — dark horizontal plane
  ───────────────────────────────────────── */
  (function () {
    var fg = new THREE.PlaneGeometry(40, 200, 30, 60);
    fg.rotateX(-Math.PI / 2);
    var fp = fg.attributes.position;
    for (var i = 0; i < fp.count; i++) {
      var x = fp.getX(i), z = fp.getZ(i);
      var bh = Math.sin(x * 0.4 + 0.5) * 0.4
             + Math.sin(z * 0.15 + 1.1) * 0.5
             + Math.sin(x * 0.9 + z * 0.12) * 0.2;
      fp.setY(i, bh - 10);
    }
    fg.computeVertexNormals();
    var floor = new THREE.Mesh(fg,
      new THREE.MeshLambertMaterial({ color: 0x201006, fog: false }));
    floor.position.set(0, 0, 10);
    scene.add(floor);
  })();

  /* ─────────────────────────────────────────
     RIVER — winding ribbon in valley centre
  ───────────────────────────────────────── */
  var riverMat;
  (function () {
    var steps = 120;
    var verts = [], idx = [];
    for (var i = 0; i <= steps; i++) {
      var t  = i / steps;
      var rz = -160 + t * 200;
      var rx = Math.sin(t * Math.PI * 2.5) * 2.8
             + Math.sin(t * Math.PI * 1.1 + 0.4) * 1.4;
      var ry = -9.2;
      var hw = 0.6 + t * 1.8;

      var dx = 0, dz = 1;
      if (i < steps) {
        var nt = (i+1)/steps;
        var nrz = -160 + nt * 200;
        var nrx = Math.sin(nt*Math.PI*2.5)*2.8 + Math.sin(nt*Math.PI*1.1+0.4)*1.4;
        var dl = Math.sqrt((nrx-rx)*(nrx-rx)+(nrz-rz)*(nrz-rz)) || 1;
        dx = (nrx-rx)/dl; dz = (nrz-rz)/dl;
      }
      verts.push(rx - dz*hw, ry, rz + dx*hw);
      verts.push(rx + dz*hw, ry, rz - dx*hw);
    }
    for (var i = 0; i < steps; i++) {
      var b = i*2;
      idx.push(b,b+1,b+2, b+1,b+3,b+2);
    }
    var rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(verts), 3));
    rg.setIndex(idx);
    rg.computeVertexNormals();
    riverMat = new THREE.MeshBasicMaterial({
      color: 0xc8a850, transparent: true, opacity: 0.80,
      side: THREE.DoubleSide, depthWrite: false,
    });
    scene.add(new THREE.Mesh(rg, riverMat));
  })();

  /* ─────────────────────────────────────────
     HAZE PLANES — atmospheric cream sheets
  ───────────────────────────────────────── */
  var hazePlanes = [];
  [
    { y: 14, z: -130, w: 400, op: 0.18, c: 0xf2e8d8 },
    { y: 10, z:  -95, w: 360, op: 0.14, c: 0xecddc8 },
    { y:  6, z:  -62, w: 320, op: 0.10, c: 0xe6d5bc },
    { y:  2, z:  -32, w: 280, op: 0.07, c: 0xdeccb0 },
    { y: -1, z:   -8, w: 240, op: 0.05, c: 0xd6c4a4 },
  ].forEach(function(d, di) {
    var hg = new THREE.PlaneGeometry(d.w, 50, 100, 2);
    hg.rotateX(-Math.PI / 2);
    var hp = hg.attributes.position;
    for (var i = 0; i < hp.count; i++) {
      var xn = hp.getX(i) / (d.w * 0.5);
      hp.setY(i, Math.sin(xn * 7 + di * 1.6) * 0.5 + Math.cos(xn * 13 + di) * 0.2);
    }
    hg.computeVertexNormals();
    var hm = new THREE.MeshBasicMaterial({
      color: d.c, transparent: true, opacity: d.op,
      side: THREE.DoubleSide, depthWrite: false,
    });
    var mesh = new THREE.Mesh(hg, hm);
    mesh.position.set(0, d.y, d.z);
    scene.add(mesh);
    hazePlanes.push({ mesh: mesh, mat: hm, base: d.op });
  });

  /* ─────────────────────────────────────────
     LIGHTING
  ───────────────────────────────────────── */
  scene.add(new THREE.AmbientLight(0xd8c8a8, 2.8));
  var sun = new THREE.DirectionalLight(0xf4dca0, 3.2);
  sun.position.set(20, 60, -50);
  scene.add(sun);
  var bounce = new THREE.DirectionalLight(0xe0cca0, 0.9);
  bounce.position.set(-30, 10, 20);
  scene.add(bounce);

  /* ─────────────────────────────────────────
     DUST PARTICLES
  ───────────────────────────────────────── */
  var DN = 400, dPos = new Float32Array(DN*3), dSpd = new Float32Array(DN), dPhs = new Float32Array(DN);
  for (var i = 0; i < DN; i++) {
    dPos[i*3]   = (Math.random()-0.5)*120;
    dPos[i*3+1] = Math.random()*35 - 5;
    dPos[i*3+2] = Math.random()*180 - 150;
    dSpd[i] = 0.01 + Math.random()*0.015;
    dPhs[i] = Math.random()*Math.PI*2;
  }
  var dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  var dustMat = new THREE.PointsMaterial({
    color: 0xd4b870, size: 0.20, transparent: true,
    opacity: 0.32, sizeAttenuation: true, depthWrite: false,
  });
  scene.add(new THREE.Points(dustGeo, dustMat));

  /* ─────────────────────────────────────────
     RESIZE + INPUT
  ───────────────────────────────────────── */
  window.addEventListener('resize', function() {
    W = window.innerWidth; H = window.innerHeight;
    renderer.setSize(W, H);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  });

  var tmx = 0, tmy = 0, cmx = 0, cmy = 0, sY = 0;
  document.addEventListener('mousemove', function(e) {
    tmx = (e.clientX/window.innerWidth  - 0.5) * 2;
    tmy = (e.clientY/window.innerHeight - 0.5) * 2;
  });
  window.addEventListener('scroll', function() { sY = window.scrollY; }, { passive: true });

  /* ─────────────────────────────────────────
     ANIMATE
  ───────────────────────────────────────── */
  var T = 0;
  function animate() {
    requestAnimationFrame(animate);
    T += 0.006;

    cmx += (tmx - cmx) * 0.032;
    cmy += (tmy - cmy) * 0.032;

    var heroH = (document.getElementById('hero')||{}).offsetHeight || window.innerHeight;
    var st    = Math.min(sY / heroH, 1);

    /* Camera pan with mouse — narrow FOV makes it feel very cinematic */
    camera.position.x = cmx * 4.0;
    camera.position.y = cmy * -1.5 - st * 2;
    camera.position.z = 80 + st * 15;
    camera.lookAt(cmx * 1.5, cmy * -0.6, 0);

    /* Parallax: each ridge shifts at a different rate based on depth */
    ridges.forEach(function(r, i) {
      /* Front ridges move more, back ridges less — classic parallax */
      var strength = (7 - i) * 0.35;
      r.mesh.position.x = cmx * -strength;
    });

    /* Haze drift */
    hazePlanes.forEach(function(h, i) {
      h.mesh.position.x = Math.sin(T*0.08 + i*1.4) * (i*0.6 + 1.0) - cmx * i * 0.12;
      h.mat.opacity = h.base * (0.72 + Math.sin(T*0.18 + i*0.9) * 0.28);
    });

    /* River shimmer */
    riverMat.opacity = 0.70 + Math.sin(T*0.5) * 0.10;
    riverMat.color.setHSL(0.096 + Math.sin(T*0.22)*0.006, 0.52 + Math.sin(T*0.35)*0.05, 0.50 + Math.sin(T*0.28)*0.04);

    /* Dust */
    for (var i = 0; i < DN; i++) {
      dPos[i*3+1] += dSpd[i];
      dPos[i*3]   += Math.sin(T + dPhs[i]) * 0.007;
      if (dPos[i*3+1] > 30) dPos[i*3+1] = -5;
    }
    dustGeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  }
  animate();
})();
