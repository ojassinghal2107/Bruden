/**
 * BRUDEN — Cinematic 3D World (Final)
 * Entrance: mountains slide in L/R, river flows up from centre
 * Scroll: smooth morph through 4 zones
 * Palette: sepia cream — dark chocolate brown — parchment
 */
(function () {
  if (typeof THREE === 'undefined') return;
  var cv = document.getElementById('worldCanvas');
  if (!cv) return;
  var W = window.innerWidth, H = window.innerHeight;
  var renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.setClearColor(0x2a1a0c, 1);
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 800);
  camera.position.set(0, 22, 85);
  camera.lookAt(0, 3, 0);
  window.addEventListener('resize', function () {
    W = window.innerWidth; H = window.innerHeight;
    renderer.setSize(W, H); camera.aspect = W / H; camera.updateProjectionMatrix();
  });
  scene.fog = new THREE.Fog(0x2a1a0c, 35, 240);

  /* ── Sky sphere — darker, richer sepia ── */
  var skyGeo = new THREE.SphereGeometry(600, 32, 16);
  var skyPos = skyGeo.attributes.position;
  var skyC   = new Float32Array(skyPos.count * 3);
  for (var i = 0; i < skyPos.count; i++) {
    var t = Math.max(0, Math.min(1, (skyPos.getY(i) + 600) / 1200));
    /* horizon: deep warm brown → zenith: muted sepia cream (NOT bright) */
    skyC[i*3]   = 0.42 + t*0.32;   /* 0.42 dark sepia → 0.74 muted parchment */
    skyC[i*3+1] = 0.28 + t*0.28;
    skyC[i*3+2] = 0.14 + t*0.22;
  }
  skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(skyC, 3));
  scene.add(new THREE.Mesh(skyGeo,
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })));

  /* ── Noise ── */
  function N(x, z) {
    return Math.sin(x*0.032+0.41)*Math.cos(z*0.029+1.1)*7.0
         + Math.sin(x*0.071+1.70)*Math.cos(z*0.065+0.5)*3.5
         + Math.sin(x*0.143+3.10)*Math.cos(z*0.131+2.2)*1.8
         + Math.sin(x*0.286+0.90)*Math.cos(z*0.262+3.8)*0.9
         + Math.sin(x*0.572+2.20)*Math.cos(z*0.524+1.4)*0.45
         + Math.sin(x*1.144+1.00)*Math.cos(z*1.048+0.9)*0.22
         + Math.sin(x*2.288+3.80)*Math.cos(z*2.096+2.6)*0.11
         + Math.sin(x*4.576+0.60)*Math.cos(z*4.192+1.8)*0.055;
  }

  /* ── Terrain ── */
  var TS=250, TSEGS=280;
  var tGeo=new THREE.PlaneGeometry(TS,TS,TSEGS,TSEGS);
  tGeo.rotateX(-Math.PI/2);
  var tPos=tGeo.attributes.position, tN=tPos.count;
  var hArr=new Float32Array(tN), minH=Infinity, maxH=-Infinity;
  for (var i=0;i<tN;i++) {
    var x=tPos.getX(i),z=tPos.getZ(i),nx=x/(TS*0.5),nz=z/(TS*0.5);
    var floorW=0.13,dist=Math.abs(nx);
    var wall=dist<floorW?0:Math.pow((dist-floorW)/(1-floorW),1.75);
    var depthBoost=1+Math.max(0,-nz)*0.75;
    var h=wall*24*depthBoost+N(x,z);
    hArr[i]=h; if(h>maxH)maxH=h; if(h<minH)minH=h;
  }
  var tCols=new Float32Array(tN*3);
  for (var i=0;i<tN;i++) {
    var hn=(hArr[i]-minH)/(maxH-minH);
    tPos.setY(i,hArr[i]);
    var z3=tPos.getZ(i), haze=Math.max(0,Math.min(1,(-z3-15)/105));
    var r,g,b;
    if      (hn<0.08){r=0.08;g=0.05;b=0.02;}
    else if (hn<0.22){var t2=(hn-0.08)/0.14;r=0.08+t2*0.10;g=0.05+t2*0.07;b=0.02+t2*0.04;}
    else if (hn<0.40){var t2=(hn-0.22)/0.18;r=0.18+t2*0.16;g=0.12+t2*0.11;b=0.06+t2*0.07;}
    else if (hn<0.58){var t2=(hn-0.40)/0.18;r=0.34+t2*0.16;g=0.23+t2*0.13;b=0.13+t2*0.08;}
    else if (hn<0.76){var t2=(hn-0.58)/0.18;r=0.50+t2*0.14;g=0.36+t2*0.13;b=0.21+t2*0.09;}
    else             {var t2=(hn-0.76)/0.24;r=0.64+t2*0.10;g=0.49+t2*0.12;b=0.30+t2*0.12;}
    r=r+(0.70-r)*haze*0.55; g=g+(0.58-g)*haze*0.55; b=b+(0.42-b)*haze*0.55;
    tCols[i*3]=Math.min(1,r);tCols[i*3+1]=Math.min(1,g);tCols[i*3+2]=Math.min(1,b);
  }
  tGeo.setAttribute('color',new THREE.Float32BufferAttribute(tCols,3));
  tGeo.computeVertexNormals();
  var tMat=new THREE.MeshLambertMaterial({vertexColors:true,fog:true});
  var tMesh=new THREE.Mesh(tGeo,tMat);
  tMesh.position.set(0,0,-80);
  scene.add(tMesh);

  /* ── Foreground scrubland ── */
  var fgGeo=new THREE.PlaneGeometry(240,58,110,32);
  fgGeo.rotateX(-Math.PI/2);
  var fgP=fgGeo.attributes.position,fgC=new Float32Array(fgP.count*3);
  for(var i=0;i<fgP.count;i++){
    var fx=fgP.getX(i),fz2=fgP.getZ(i);
    var fh=Math.sin(fx*0.11+0.5)*0.9+Math.sin(fz2*0.17+1.1)*0.7+Math.sin(fx*0.33+fz2*0.21)*0.4+Math.sin(fx*0.78+fz2*0.54)*0.18;
    fgP.setY(i,fh-0.6);
    var fn=(fh+2.5)/5;fgC[i*3]=0.09+fn*0.06;fgC[i*3+1]=0.05+fn*0.04;fgC[i*3+2]=0.01;
  }
  fgGeo.setAttribute('color',new THREE.Float32BufferAttribute(fgC,3));
  fgGeo.computeVertexNormals();
  var fgMesh=new THREE.Mesh(fgGeo,new THREE.MeshLambertMaterial({vertexColors:true,fog:false}));
  fgMesh.position.set(0,3,33); scene.add(fgMesh);

  /* ── River — long snake, 6 S-curves, spans full scene ── */
  var riverMat=new THREE.MeshBasicMaterial({color:0xb89050,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false});
  var riverMesh;
  (function(){
    var steps=300,v=[],idx=[];
    for(var i=0;i<=steps;i++){
      var t2=i/steps;
      var rz=-350+t2*410;
      /* 6 full S-curves, amplitude grows toward camera */
      var amp=3.5+t2*7.0;
      var rx=Math.sin(t2*Math.PI*6.0)*amp
            +Math.sin(t2*Math.PI*2.5+0.8)*amp*0.35
            +Math.sin(t2*Math.PI*11.0)*amp*0.08;
      var ry=N(rx,rz+80)*0.04-0.6;
      /* Width: hairline far, expands near */
      var hw=0.12+t2*t2*5.0;
      var dx=0,dz2=1;
      if(i<steps){
        var nt=(i+1)/steps,nrz=-350+nt*410;
        var na=3.5+nt*7.0;
        var nrx=Math.sin(nt*Math.PI*6.0)*na+Math.sin(nt*Math.PI*2.5+0.8)*na*0.35+Math.sin(nt*Math.PI*11.0)*na*0.08;
        var dl=Math.sqrt((nrx-rx)*(nrx-rx)+(nrz-rz)*(nrz-rz))||1;
        dx=(nrx-rx)/dl;dz2=(nrz-rz)/dl;
      }
      v.push(rx-dz2*hw,ry,rz+dx*hw,rx+dz2*hw,ry,rz-dx*hw);
    }
    for(var i=0;i<steps;i++){var b=i*2;idx.push(b,b+1,b+2,b+1,b+3,b+2);}
    var rg=new THREE.BufferGeometry();
    rg.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(v),3));
    rg.setIndex(idx);rg.computeVertexNormals();
    riverMesh=new THREE.Mesh(rg,riverMat);
    riverMesh.position.set(0,0,-80);
    scene.add(riverMesh);
  })();

  /* ── Haze planes ── */
  var hazeMeshes=[];
  [{y:13,z:-155,w:380,op:0.12,c:0x6b4828},{y:9,z:-115,w:340,op:0.09,c:0x5a3c20},
   {y:5,z:-80,w:300,op:0.06,c:0x4a3018},{y:1,z:-48,w:260,op:0.04,c:0x3a2410}].forEach(function(d,di){
    var hg=new THREE.PlaneGeometry(d.w,55,90,2);hg.rotateX(-Math.PI/2);
    var hp=hg.attributes.position;
    for(var i=0;i<hp.count;i++){var xn=hp.getX(i)/(d.w*0.5);hp.setY(i,Math.sin(xn*8+di*1.6)*0.4+Math.cos(xn*14+di*2.3)*0.16);}
    hg.computeVertexNormals();
    var hm=new THREE.MeshBasicMaterial({color:d.c,transparent:true,opacity:d.op,side:THREE.DoubleSide,depthWrite:false,fog:false});
    var mesh=new THREE.Mesh(hg,hm);mesh.position.set(0,d.y,d.z);
    scene.add(mesh);hazeMeshes.push({mesh:mesh,mat:hm,base:d.op});
  });

  /* ── Lighting ── */
  var ambL=new THREE.AmbientLight(0x8a6040, 1.8);
  var sunL=new THREE.DirectionalLight(0xc8a878, 1.6);
  var backL=new THREE.DirectionalLight(0x7a5830, 0.6);
  var fillL=new THREE.DirectionalLight(0x5a3c20, 0.3);
  sunL.position.set(30,80,-40);backL.position.set(0,22,-280);fillL.position.set(-60,12,20);
  scene.add(ambL,sunL,backL,fillL);

  /* ── Gold dust ── */
  var DN=500,dPos=new Float32Array(DN*3),dSpd=new Float32Array(DN),dPhs=new Float32Array(DN);
  for(var i=0;i<DN;i++){
    dPos[i*3]=(Math.random()-.5)*160;dPos[i*3+1]=Math.random()*32;dPos[i*3+2]=Math.random()*230-190;
    dSpd[i]=0.007+Math.random()*0.010;dPhs[i]=Math.random()*Math.PI*2;
  }
  var dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute('position',new THREE.BufferAttribute(dPos,3));
  var dustMat=new THREE.PointsMaterial({color:0xc8a870,size:0.16,transparent:true,opacity:0.18,sizeAttenuation:true,depthWrite:false});
  scene.add(new THREE.Points(dustGeo,dustMat));

  /* ── Zone extras: trees / fire / stars ── */
  var treeMats=[];
  [[-22,-25,12],[-32,-38,15],[-8,-48,13],[22,-28,14],[34,-42,16],
   [14,-58,13],[-38,-32,17],[40,-30,12],[-15,-62,15],[-44,-52,18]].forEach(function(p){
    var h=p[2]+Math.random()*4,r=0.75+Math.random()*0.55;
    var tm=new THREE.MeshLambertMaterial({color:0x2a1a08,transparent:true,opacity:0});
    var cm=new THREE.MeshLambertMaterial({color:0x0e2a0a,transparent:true,opacity:0});
    var trunk=new THREE.Mesh(new THREE.CylinderGeometry(r*.28,r*.46,h,6),tm);
    var canopy=new THREE.Mesh(new THREE.ConeGeometry(r*2.7,h*.72,7),cm);
    trunk.position.set(p[0],h/2+3,p[1]);canopy.position.set(p[0],h*.88+3,p[1]);
    scene.add(trunk,canopy);treeMats.push(tm,cm);
  });
  var fireLights=[];
  [[0,-3,-5],[4,-4,-8],[-3,-3.5,-6]].forEach(function(p){
    var l=new THREE.PointLight(0xff6010,0,50);l.position.set(p[0],p[1],p[2]);scene.add(l);fireLights.push(l);
  });
  var sN=800,sPos=new Float32Array(sN*3);
  for(var i=0;i<sN;i++){sPos[i*3]=(Math.random()-.5)*500;sPos[i*3+1]=20+Math.random()*140;sPos[i*3+2]=(Math.random()-.5)*400;}
  var sGeo=new THREE.BufferGeometry();sGeo.setAttribute('position',new THREE.BufferAttribute(sPos,3));
  var sMat=new THREE.PointsMaterial({color:0xffe8c0,size:0.45,transparent:true,opacity:0,sizeAttenuation:true});
  scene.add(new THREE.Points(sGeo,sMat));

  /* ════════════════════════════════════
     CINEMATIC ENTRANCE ANIMATION STATE
     Mountains start far left/right, river starts hidden below
     They animate to resting position over ~2.5s on load
  ════════════════════════════════════ */
  var intro = {
    active: true,
    t: 0,           /* 0 → 1 over ~2.5s */
    duration: 2.5,
    leftOffset:  200,  /* terrain starts shifted left */
    rightOffset: -200, /* not used — single mesh splits via camera */
  };
  /* We animate by shifting the terrain mesh X and the foreground X apart then back */
  tMesh.position.x  = 0;   /* will be driven by intro */
  fgMesh.position.x = 0;
  /* River starts invisible, fades in after mountains settle */
  riverMat.opacity = 0;

  /* Expose intro start to main.js so it fires after loader */
  window.brudenStartIntro = function() { intro.active = true; intro.t = 0; };

  /* ── Scroll + mouse ── */
  var scrollT=0,targST=0,tmx=0,tmy=0,cmx=0,cmy=0;
  window.addEventListener('scroll',function(){
    var dH=document.documentElement.scrollHeight-window.innerHeight;
    targST=dH>0?Math.min(1,window.scrollY/dH):0;
  },{passive:true});
  document.addEventListener('mousemove',function(e){
    tmx=(e.clientX/window.innerWidth-.5)*2;tmy=(e.clientY/window.innerHeight-.5)*2;
  });

  var FOG_Z=[[0x3a2410,30,200],[0x091204,8,100],[0x080401,5,70],[0x220a02,12,160]];
  var AMB_Z=[[0x8a6040,1.8],[0x1a3010,1.4],[0x1a0800,0.8],[0x180802,1.0]];
  var SUN_Z=[[0xc8a878,1.6],[0xa08040,1.8],[0xff6010,2.5],[0xff6820,2.5]];
  var TIN_Z=[[1.0,1.0,1.0],[0.09,0.20,0.07],[0.11,0.07,0.02],[0.24,0.11,0.03]];

  function easeOutCubic(t2){return 1-Math.pow(1-t2,3);}
  function easeOutQuint(t2){return 1-Math.pow(1-t2,5);}

  /* ── Animate ── */
  var T=0, lastTime=performance.now();
  function animate(now){
    requestAnimationFrame(animate);
    var dt=Math.min((now-lastTime)/1000,0.05);lastTime=now;
    T+=0.006;
    cmx+=(tmx-cmx)*0.030;cmy+=(tmy-cmy)*0.030;
    scrollT+=(targST-scrollT)*0.036;

    /* ─ INTRO CINEMATIC ─ */
    if(intro.active){
      intro.t=Math.min(1,intro.t+dt/intro.duration);
      var p=easeOutCubic(intro.t);
      var ps=easeOutQuint(intro.t);
      /* Terrain sweeps in from sides: left half from left, right half from right
         We achieve this by animating camera.position.z from very far to resting */
      var introCamZ=85+(1-p)*120;   /* camera was far back, comes forward */
      var introCamY=22+(1-ps)*30;   /* was high, drops to resting angle */
      camera.position.z=introCamZ;
      camera.position.y=introCamY;
      /* River fades in after p>0.5 */
      var riverIntroOp=Math.max(0,(p-0.55)/0.45)*0.75;
      riverMat.opacity=riverIntroOp;
      if(intro.t>=1){intro.active=false;}
    }

    /* ─ SCROLL ZONE BLEND ─ */
    var zi=Math.min(Math.floor(scrollT*4),3),zt=scrollT*4-zi,ni=Math.min(zi+1,3);
    var fa=FOG_Z[zi],fb=FOG_Z[ni];
    scene.fog.color.set(fa[0]).lerp(new THREE.Color(fb[0]),zt);
    scene.fog.near=fa[1]+(fb[1]-fa[1])*zt;scene.fog.far=fa[2]+(fb[2]-fa[2])*zt;
    renderer.setClearColor(scene.fog.color,1);
    var aa=AMB_Z[zi],ab=AMB_Z[ni];
    ambL.color.set(aa[0]).lerp(new THREE.Color(ab[0]),zt);ambL.intensity=aa[1]+(ab[1]-aa[1])*zt;
    var sa=SUN_Z[zi],sb=SUN_Z[ni];
    sunL.color.set(sa[0]).lerp(new THREE.Color(sb[0]),zt);sunL.intensity=sa[1]+(sb[1]-sa[1])*zt;
    var ta=TIN_Z[zi],tb=TIN_Z[ni];
    tMat.color.setRGB(ta[0]+(tb[0]-ta[0])*zt,ta[1]+(tb[1]-ta[1])*zt,ta[2]+(tb[2]-ta[2])*zt);

    /* River — visible across the whole site, shimmer throughout */
    if(!intro.active){
      /* stays at 0.75 opacity always, just shimmer colour */
      riverMat.opacity = 0.75;
      riverMat.color.setHSL(
        0.092+Math.sin(T*0.22)*0.006,
        0.45+Math.sin(T*0.35)*0.06,
        0.38+Math.sin(T*0.28)*0.05
      );
    }

    /* Trees */
    var tO=scrollT<0.22?0:scrollT<0.30?(scrollT-0.22)/0.08:scrollT<0.48?1:scrollT<0.56?1-(scrollT-0.48)/0.08:0;
    treeMats.forEach(function(m){m.opacity=Math.max(0,Math.min(1,tO));});
    /* Fire */
    var fS=scrollT<0.52?0:scrollT<0.60?(scrollT-0.52)/0.08:scrollT<0.72?1:scrollT<0.80?1-(scrollT-0.72)/0.08:0;
    fireLights.forEach(function(l,i){l.intensity=fS*(3.5+Math.sin(T*3.8+i*1.5)*1.8+Math.sin(T*7.2+i*2.1)*0.9);});
    /* Stars */
    sMat.opacity=(scrollT<0.76?0:scrollT<0.86?(scrollT-0.76)/0.10:1)*0.72;
    /* Haze */
    var hazeScale=1-Math.min(1,scrollT*3.5);
    hazeMeshes.forEach(function(h,i){
      h.mesh.position.x=Math.sin(T*0.09+i*1.5)*(i+1)*0.9;
      h.mat.opacity=h.base*(0.7+Math.sin(T*0.18+i*0.9)*0.3)*hazeScale;
    });

    /* ─ CAMERA (post-intro) ─ */
    if(!intro.active){
      var tCY=22-scrollT*20-cmy*1.8;
      var tCZ=85+scrollT*12;
      camera.position.x+=(cmx*5-camera.position.x)*0.04;
      camera.position.y+=(tCY-camera.position.y)*0.04;
      camera.position.z+=(tCZ-camera.position.z)*0.04;
      camera.lookAt(cmx*2,tCY-6,0);
    } else {
      camera.lookAt(0, camera.position.y-8, 0);
    }

    /* Dust */
    for(var i=0;i<DN;i++){
      dPos[i*3+1]+=dSpd[i];dPos[i*3]+=Math.sin(T+dPhs[i])*0.008;
      if(dPos[i*3+1]>32)dPos[i*3+1]=0;
    }
    dustGeo.attributes.position.needsUpdate=true;
    renderer.render(scene,camera);
  }
  animate(performance.now());
})();
