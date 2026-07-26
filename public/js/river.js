/**
 * BRUDEN — 3D Molten Chocolate River
 *
 * MATCHES world.js exactly:
 *  - Same camera start: (0, 22, 85) lookAt (0, 3, 0)
 *  - Same terrain offset: mesh at (0, 0, -80)
 *  - River source: deep in the mountain valley (z ≈ -155 in world space)
 *  - River flows toward camera (z increasing toward +60 near foreground)
 *
 * Scroll behaviour:
 *  - Hero (scroll=0): camera matches world.js, river seen in perspective
 *    coming from the mountain valley — thin at source, wide near camera
 *  - Scrolling: camera stays above river surface and glides forward,
 *    giving the "flowing down through the site" sensation
 */
(function () {
  var cv = document.getElementById('riverCanvas');
  if (!cv) return;
  if (typeof THREE === 'undefined') return;

  var W = window.innerWidth, H = window.innerHeight;
  var renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.setClearColor(0x000000, 0);

  window.addEventListener('resize', function () {
    W = window.innerWidth; H = window.innerHeight;
    renderer.setSize(W, H);
    cam.aspect = W / H; cam.updateProjectionMatrix();
  });

  var scene = new THREE.Scene();

  /* Camera exactly matching world.js at rest */
  var cam = new THREE.PerspectiveCamera(55, W / H, 0.1, 800);
  cam.position.set(0, 22, 85);
  cam.lookAt(0, 3, 0);

  /* Scroll */
  var scrollY = 0, scrollFrac = 0, targFrac = 0, scrollSpd = 0;
  window.addEventListener('scroll', function () {
    var dH = document.documentElement.scrollHeight - window.innerHeight;
    scrollSpd  = window.scrollY - scrollY;
    scrollY    = window.scrollY;
    targFrac   = dH > 0 ? Math.min(1, scrollY / dH) : 0;
  }, { passive: true });

  /* Mouse */
  var tmx = 0, tmy = 0, cmx = 0, cmy = 0;
  document.addEventListener('mousemove', function (e) {
    tmx = (e.clientX / W - 0.5) * 2;
    tmy = (e.clientY / H - 0.5) * 2;
  });

  /* ══════════════════════════════════════════════════
     RIVER CENTRELINE
     All coordinates in world.js space.
     Source: behind the mountains at z ≈ -155 (relative to terrain mesh at -80)
             = absolute z ≈ -155.
     Mouth:  in the foreground at z ≈ +55 (near the camera foot).

     t=0 → source (mountain valley, far, thin)
     t=1 → mouth  (foreground, near camera, wide)
  ══════════════════════════════════════════════════ */
  var STEPS  = 300;
  var SLICES = 28;

  /* River occupies world Z from source to foreground */
  var Z_SOURCE = -155;   /* behind mountain peaks */
  var Z_MOUTH  =  55;    /* near foreground       */

  var CL = [];
  for (var i = 0; i <= STEPS; i++) {
    var t  = i / STEPS;                              /* 0=source, 1=mouth */
    var z  = Z_SOURCE + t * (Z_MOUTH - Z_SOURCE);

    /* Snake — S-curves that grow in amplitude as river approaches camera.
       Perspective naturally makes far curves look tighter. */
    var amp = 0.4 + t * t * 10.0;
    var x   = Math.sin(t * Math.PI * 5.5 + 0.2)        * amp
            + Math.sin(t * Math.PI * 2.4 + 1.1)         * amp * 0.40
            + Math.sin(t * Math.PI * 9.0 + 2.8)         * amp * 0.10;

    /* Width: very narrow at source (pouring out of valley gap),
       widens strongly as it flows toward camera */
    var hw = 0.08 + t * t * 7.5;

    /* Y: river sits on terrain — slightly below flat (valley floor).
       world.js terrain mesh is at y=0, valley floor at y≈-0.5 */
    var y = -0.5 - hw * 0.04;   /* concave — edges slightly lower */

    CL.push({ x: x, y: y, z: z, hw: hw, t: t });
  }

  /* ── Geometry ── */
  var VCOUNT  = (STEPS + 1) * (SLICES + 1);
  var basePos = [];
  var animPos = new Float32Array(VCOUNT * 3);
  var uvArr   = new Float32Array(VCOUNT * 2);
  var idxArr  = [];

  for (var i = 0; i <= STEPS; i++) {
    var cur = CL[i];
    var nxt = CL[Math.min(i + 1, STEPS)];
    var tdx = nxt.x - cur.x, tdz = nxt.z - cur.z;
    var tl  = Math.sqrt(tdx * tdx + tdz * tdz) || 1;
    tdx /= tl; tdz /= tl;
    var pdx = -tdz, pdz = tdx;

    for (var j = 0; j <= SLICES; j++) {
      var s  = j / SLICES;
      var sw = s * 2 - 1;
      var dip = sw * sw * cur.hw * 0.05;

      var vx = cur.x + pdx * sw * cur.hw;
      var vy = cur.y - dip;
      var vz = cur.z + pdz * sw * cur.hw;

      var vi = i * (SLICES + 1) + j;
      animPos[vi*3    ] = vx;
      animPos[vi*3 + 1] = vy;
      animPos[vi*3 + 2] = vz;
      uvArr  [vi*2    ] = s;
      uvArr  [vi*2 + 1] = cur.t;
      basePos.push({ bx: vx, by: vy, bz: vz, sx: sw, t: cur.t, hw: cur.hw });
    }
  }

  for (var i = 0; i < STEPS; i++) {
    for (var j = 0; j < SLICES; j++) {
      var a = i*(SLICES+1)+j, b=a+1, c=a+(SLICES+1), d=c+1;
      idxArr.push(a, c, b,  b, c, d);
    }
  }

  var rGeo  = new THREE.BufferGeometry();
  var posBA = new THREE.BufferAttribute(animPos, 3);
  posBA.usage = THREE.DynamicDrawUsage;
  rGeo.setAttribute('position', posBA);
  rGeo.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
  rGeo.setIndex(idxArr);
  rGeo.computeVertexNormals();  /* once only */

  var rMat = new THREE.MeshPhongMaterial({
    color:     new THREE.Color(0x1e0902),
    specular:  new THREE.Color(0x8a4010),
    shininess: 85,
    transparent: true, opacity: 0,
    side: THREE.DoubleSide, depthWrite: false,
  });
  scene.add(new THREE.Mesh(rGeo, rMat));

  /* ── Gloss streak ── */
  var gPos  = new Float32Array((STEPS + 1) * 2 * 3);
  var gBase = [];
  var gIdx  = [];
  for (var i = 0; i <= STEPS; i++) {
    var cur = CL[i];
    var nxt = CL[Math.min(i + 1, STEPS)];
    var tdx = nxt.x - cur.x, tdz = nxt.z - cur.z;
    var tl  = Math.sqrt(tdx*tdx + tdz*tdz) || 1;
    var pdx = -tdz/tl, pdz = tdx/tl;
    var gw  = cur.hw * 0.15;
    gPos[(i*2  )*3    ] = cur.x + pdx*gw;
    gPos[(i*2  )*3 + 1] = cur.y + 0.06;
    gPos[(i*2  )*3 + 2] = cur.z + pdz*gw;
    gPos[(i*2+1)*3    ] = cur.x - pdx*gw;
    gPos[(i*2+1)*3 + 1] = cur.y + 0.06;
    gPos[(i*2+1)*3 + 2] = cur.z - pdz*gw;
    gBase.push({ cy: cur.y, t: cur.t });
  }
  for (var i = 0; i < STEPS; i++) {
    var b2 = i*2;
    gIdx.push(b2, b2+1, b2+2,  b2+1, b2+3, b2+2);
  }
  var gGeo   = new THREE.BufferGeometry();
  var gPosBA = new THREE.BufferAttribute(gPos, 3);
  gPosBA.usage = THREE.DynamicDrawUsage;
  gGeo.setAttribute('position', gPosBA);
  gGeo.setIndex(gIdx);
  gGeo.computeVertexNormals();
  var gMat = new THREE.MeshPhongMaterial({
    color: 0x9a4c18, specular: 0xffe0a0, shininess: 200,
    transparent: true, opacity: 0,
    side: THREE.DoubleSide, depthWrite: false,
  });
  scene.add(new THREE.Mesh(gGeo, gMat));

  /* ── Drip blobs ── */
  var NDRIPS = 8;
  var dripMs = [], dripD = [];
  var dGeo = new THREE.SphereGeometry(1, 6, 4);
  for (var d = 0; d < NDRIPS; d++) {
    var dm = new THREE.Mesh(dGeo, new THREE.MeshPhongMaterial({
      color: 0x3a1008, specular: 0xd06020, shininess: 120,
      transparent: true, opacity: 0, depthWrite: false,
    }));
    scene.add(dm); dripMs.push(dm);
    dripD.push({
      t:    Math.random(),
      side: d < NDRIPS/2 ? -1 : 1,
      spd:  0.0006 + Math.random() * 0.001,
      sz:   0.07 + Math.random() * 0.10,
    });
  }

  /* ── Lighting ── */
  scene.add(new THREE.AmbientLight(0x3a1808, 2.0));
  var keyL = new THREE.DirectionalLight(0xd4a060, 2.2);
  keyL.position.set(-10, 22, 15);
  scene.add(keyL);
  var rimL = new THREE.DirectionalLight(0x7a3810, 0.8);
  rimL.position.set(12, 6, -30);
  scene.add(rimL);
  var movL = new THREE.PointLight(0xff8820, 3.5, 55);
  movL.position.set(0, 5, 0);
  scene.add(movL);

  /* ══════════════════════════════════════════════════
     CAMERA RAIL — mirrors world.js scroll behaviour

     scroll=0: exactly world.js rest position (0,22,85) → (0,3,0)
               River seen in full perspective, source at mountains
     scroll→1: camera descends and moves forward, riding the flow
               Feels like flowing down the river through the site
  ══════════════════════════════════════════════════ */
  /* Smoothed camera state — initialised to world.js rest */
  var sm = { cx:0, cy:22, cz:85, lx:0, ly:3, lz:0 };

  function getTarget(frac) {
    /* Mirror world.js camera movement */
    var tCY  = 22 - frac * 20 - cmy * 1.8;
    var tCZ  = 85 + frac * 12;
    var tCX  = cmx * 5;
    /* LookAt descends into the river as we scroll */
    var tLX  = cmx * 2;
    var tLY  = tCY - 6 - frac * 8;   /* look down more as we scroll */
    var tLZ  = 0   - frac * 30;       /* look further into the flow */
    return { cx:tCX, cy:tCY, cz:tCZ, lx:tLX, ly:tLY, lz:tLZ };
  }

  /* ── Animate ── */
  var T = 0, lastMs = performance.now();
  var introT = 0, introDone = false;

  function animate(now) {
    requestAnimationFrame(animate);
    var dt = Math.min((now - lastMs) / 1000, 0.05);
    lastMs = now;
    T += dt;

    cmx       += (tmx - cmx)              * 0.022;
    cmy       += (tmy - cmy)              * 0.022;
    scrollFrac += (targFrac - scrollFrac) * 0.028;
    scrollSpd  *= 0.72;

    /* Intro fade-in */
    if (!introDone) {
      introT = Math.min(1, introT + dt / 2.2);
      if (introT >= 1) introDone = true;
    }
    var op = Math.max(0, (introT - 0.45) / 0.55);
    rMat.opacity = op * 0.92;
    gMat.opacity = op * 0.60;
    dripMs.forEach(function(m) { m.material.opacity = op * 0.78; });

    /* Flow speed */
    var flowSpd = 1.1 + Math.abs(scrollSpd) * 0.025;

    /* ── Wave displacement — fixed small amplitude, NO normal recompute ── */
    for (var i = 0; i <= STEPS; i++) {
      for (var j = 0; j <= SLICES; j++) {
        var vi  = i * (SLICES + 1) + j;
        var b   = basePos[vi];
        var ph  = b.t * 12 - T * flowSpd;
        var wave = Math.sin(ph)               * 0.14
                 + Math.sin(ph * 2.1 + b.sx)  * 0.06
                 + Math.sin(b.sx * 2.5 + T * 0.6) * 0.03;
        animPos[vi*3 + 1] = b.by + wave;
      }
    }
    rGeo.attributes.position.needsUpdate = true;

    /* ── Gloss streak ── */
    for (var i = 0; i <= STEPS; i++) {
      var gb  = gBase[i];
      var ph2 = gb.t * 12 - T * flowSpd;
      var gv  = Math.sin(ph2) * 0.13 + Math.sin(ph2 * 2.0 + 1.0) * 0.06;
      gPos[(i*2  ) * 3 + 1] = gb.cy + gv + 0.09;
      gPos[(i*2+1) * 3 + 1] = gb.cy + gv + 0.09;
    }
    gGeo.attributes.position.needsUpdate = true;

    /* ── Drips ── */
    for (var d = 0; d < NDRIPS; d++) {
      var dd = dripD[d];
      dd.t   = (dd.t + dd.spd) % 1.0;
      var ci = Math.min(STEPS, Math.round(dd.t * STEPS));
      var cl = CL[ci];
      var cn = CL[Math.min(ci + 1, STEPS)];
      var dx = cn.x - cl.x, dz = cn.z - cl.z;
      var dl = Math.sqrt(dx*dx + dz*dz) || 1;
      var px = -dz/dl, pz = dx/dl;
      var sz = dd.sz * (0.5 + cl.hw * 0.10);
      dripMs[d].scale.setScalar(sz);
      dripMs[d].position.set(
        cl.x + px * dd.side * cl.hw * 0.94,
        cl.y - 0.05,
        cl.z + pz * dd.side * cl.hw * 0.94
      );
    }

    /* ── Moving specular light ── */
    var lf  = (T * 0.11) % 1.0;
    var lci = Math.min(STEPS, Math.round(lf * STEPS));
    var lc  = CL[lci];
    movL.position.set(lc.x + Math.sin(T * 0.6) * 1.5, lc.y + 5, lc.z + 4);
    movL.intensity = 3.0 + Math.sin(T * 1.2) * 0.7;

    /* ── Colour pulse ── */
    rMat.color.setHSL(0.055 + Math.sin(T*0.08)*0.003, 0.90, 0.086 + Math.sin(T*0.14)*0.008);
    rMat.specular.setHSL(0.068 + Math.sin(T*0.11)*0.004, 0.68, 0.19 + Math.sin(T*0.20)*0.04);

    /* ── Camera: matches world.js movement exactly ── */
    var tgt = getTarget(scrollFrac);
    var k   = 0.025;
    sm.cx += (tgt.cx - sm.cx) * k;
    sm.cy += (tgt.cy - sm.cy) * k;
    sm.cz += (tgt.cz - sm.cz) * k;
    sm.lx += (tgt.lx - sm.lx) * k;
    sm.ly += (tgt.ly - sm.ly) * k;
    sm.lz += (tgt.lz - sm.lz) * k;

    cam.position.set(sm.cx, sm.cy, sm.cz);
    cam.lookAt(sm.lx, sm.ly, sm.lz);

    renderer.render(scene, cam);
  }

  animate(performance.now());
})();
