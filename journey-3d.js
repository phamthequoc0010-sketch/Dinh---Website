/* Đình — Hành trình 3D: từ vườn đến tách cà phê.
   Cuộn trang để camera đi qua 3 trạm: cây cà phê → mẻ rang → tách cà phê.
   Dùng three.js r128 (global THREE). Tự ẩn nếu không tải được WebGL. */
(function () {
  'use strict';
  var sec = document.getElementById('hanh-trinh-3d');
  var canvas = document.getElementById('j3d-canvas');
  if (!sec || !canvas || !window.THREE) { if (sec) sec.style.display = 'none'; return; }

  var sticky = sec.querySelector('.j3d-sticky');
  var caps = Array.prototype.slice.call(sec.querySelectorAll('.j3d-cap'));
  var dots = Array.prototype.slice.call(sec.querySelectorAll('.j3d-dots span'));

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  } catch (e) { sec.style.display = 'none'; return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf6f0e4);
  scene.fog = new THREE.Fog(0xf6f0e4, 20, 48);

  var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);

  /* ---------- Ánh sáng ---------- */
  scene.add(new THREE.HemisphereLight(0xfff6e6, 0x8a6f4d, 0.9));
  var sun = new THREE.DirectionalLight(0xffffff, 0.75);
  sun.position.set(8, 14, 8);
  scene.add(sun);
  var roastGlow = new THREE.PointLight(0xff7b2d, 1.4, 14, 2);
  roastGlow.position.set(12, 2.4, 1.5);
  scene.add(roastGlow);

  /* ---------- Mặt đất chung ---------- */
  var ground = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 30),
    new THREE.MeshStandardMaterial({ color: 0xe9dcc2, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(12, 0, -2);
  scene.add(ground);

  function disc(x, r, color) {
    var m = new THREE.Mesh(
      new THREE.CircleGeometry(r, 48),
      new THREE.MeshStandardMaterial({ color: color, roughness: 1 })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.02, 0);
    scene.add(m);
    return m;
  }
  disc(0, 4.6, 0x86a95e);   // vườn
  disc(12, 4.2, 0x54432e);  // sàn xưởng
  disc(24, 4.6, 0xd9c49a);  // bàn gỗ sáng

  /* ---------- Trạm 1: cây cà phê ---------- */
  var tree = new THREE.Group();
  var trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.26, 2.2, 12),
    new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.9 })
  );
  trunk.position.y = 1.1;
  tree.add(trunk);

  var leafMat1 = new THREE.MeshStandardMaterial({ color: 0x3f7a3a, roughness: 0.9 });
  var leafMat2 = new THREE.MeshStandardMaterial({ color: 0x4f9048, roughness: 0.9 });
  var leafGeo = new THREE.SphereGeometry(1, 14, 12);
  var foliagePts = [
    [0, 3.1, 0, 1.35], [0.9, 2.7, 0.4, 0.95], [-0.9, 2.8, -0.3, 1.0],
    [0.2, 2.5, -0.9, 0.9], [-0.3, 2.6, 0.9, 0.95], [0, 3.8, 0, 1.0]
  ];
  var cherrySpots = [];
  foliagePts.forEach(function (f, i) {
    var s = new THREE.Mesh(leafGeo, i % 2 ? leafMat1 : leafMat2);
    s.position.set(f[0], f[1], f[2]);
    s.scale.set(f[3], f[3] * 0.8, f[3]);
    tree.add(s);
    for (var k = 0; k < 5; k++) {
      var a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI - Math.PI / 2;
      cherrySpots.push([
        f[0] + Math.cos(a) * Math.cos(b) * f[3] * 1.02,
        f[1] + Math.sin(b) * f[3] * 0.82,
        f[2] + Math.sin(a) * Math.cos(b) * f[3] * 1.02
      ]);
    }
  });
  var cherryGeo = new THREE.SphereGeometry(0.1, 10, 8);
  var cherryMat = new THREE.MeshStandardMaterial({ color: 0xc1272d, roughness: 0.35 });
  cherrySpots.forEach(function (p) {
    var c = new THREE.Mesh(cherryGeo, cherryMat);
    c.position.set(p[0], p[1], p[2]);
    tree.add(c);
  });
  // cỏ
  var grassGeo = new THREE.ConeGeometry(0.09, 0.5, 6);
  var grassMat = new THREE.MeshStandardMaterial({ color: 0x5d8a48, roughness: 1 });
  for (var g = 0; g < 14; g++) {
    var cone = new THREE.Mesh(grassGeo, grassMat);
    var ga = Math.random() * Math.PI * 2, gr = 2.4 + Math.random() * 1.8;
    cone.position.set(Math.cos(ga) * gr, 0.25, Math.sin(ga) * gr);
    tree.add(cone);
  }
  scene.add(tree);

  /* ---------- Trạm 2: mẻ rang ---------- */
  var roast = new THREE.Group();
  roast.position.x = 12;
  var tray = new THREE.Mesh(
    new THREE.CylinderGeometry(1.7, 1.8, 0.4, 32),
    new THREE.MeshStandardMaterial({ color: 0x7a4f2c, roughness: 0.8 })
  );
  tray.position.y = 0.2;
  roast.add(tray);

  var beanGeo = new THREE.SphereGeometry(0.17, 10, 8);
  beanGeo.scale(1, 0.72, 0.62);
  var beanMats = [0x4a2c14, 0x553517, 0x3f2510].map(function (c) {
    return new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 });
  });
  for (var b = 0; b < 80; b++) {
    var bean = new THREE.Mesh(beanGeo, beanMats[b % 3]);
    var ba = Math.random() * Math.PI * 2, br = Math.sqrt(Math.random()) * 1.35;
    bean.position.set(Math.cos(ba) * br, 0.42 + (1 - br / 1.5) * 0.55 * Math.random() + Math.random() * 0.12, Math.sin(ba) * br);
    bean.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    roast.add(bean);
  }
  // hạt bay xoay trên mẻ rang
  var orbiters = [];
  for (var o = 0; o < 14; o++) {
    var ob = new THREE.Mesh(beanGeo, beanMats[o % 3]);
    ob.userData = { a: (o / 14) * Math.PI * 2, r: 1.1 + Math.random() * 0.5, y: 1.7 + Math.random() * 1.1, s: 0.5 + Math.random() * 0.5 };
    roast.add(ob);
    orbiters.push(ob);
  }
  scene.add(roast);

  /* ---------- Trạm 3: tách cà phê ---------- */
  var cupG = new THREE.Group();
  cupG.position.x = 24;
  var whiteMat = new THREE.MeshStandardMaterial({ color: 0xfdfbf5, roughness: 0.35 });
  var saucer = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 0.85, 0.12, 32), whiteMat);
  saucer.position.y = 0.06;
  cupG.add(saucer);
  var cupBody = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.44, 0.95, 32), whiteMat);
  cupBody.position.y = 0.6;
  cupG.add(cupBody);
  var coffee = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 32),
    new THREE.MeshStandardMaterial({ color: 0x2b1608, roughness: 0.25 })
  );
  coffee.rotation.x = -Math.PI / 2;
  coffee.position.y = 1.0;
  cupG.add(coffee);
  var rim = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.05, 12, 40), whiteMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.06;
  cupG.add(rim);
  var handle = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.07, 12, 24, Math.PI), whiteMat);
  handle.position.set(0.62, 0.62, 0);
  handle.rotation.z = -Math.PI / 2;
  cupG.add(handle);
  // hơi nóng
  function steamTexture() {
    var cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    var ctx = cv.getContext('2d');
    var grd = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grd.addColorStop(0, 'rgba(255,255,255,0.85)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(cv);
  }
  var steamTex = steamTexture();
  var steams = [];
  for (var st = 0; st < 16; st++) {
    var sm = new THREE.SpriteMaterial({ map: steamTex, transparent: true, opacity: 0.3, depthWrite: false });
    var spr = new THREE.Sprite(sm);
    spr.userData = { x: (Math.random() - 0.5) * 0.5, z: (Math.random() - 0.5) * 0.5, sp: 0.35 + Math.random() * 0.4, ph: Math.random() * 6.28 };
    spr.position.set(spr.userData.x, 1.2 + Math.random() * 2, spr.userData.z);
    spr.scale.set(0.5, 0.5, 1);
    cupG.add(spr);
    steams.push(spr);
  }
  scene.add(cupG);

  /* ---------- Camera theo cuộn ---------- */
  var camPos = [
    new THREE.Vector3(0, 3.6, 10), new THREE.Vector3(12, 3.0, 8.4), new THREE.Vector3(24, 3.2, 9)
  ];
  var camLook = [
    new THREE.Vector3(0, 1.9, 0), new THREE.Vector3(12, 1.3, 0), new THREE.Vector3(24, 1.3, 0)
  ];
  function smooth(t) { return t * t * (3 - 2 * t); }
  function progress() {
    var r = sec.getBoundingClientRect();
    var total = r.height - window.innerHeight;
    if (total <= 0) return 0;
    return Math.min(1, Math.max(0, -r.top / total));
  }
  var tmpP = new THREE.Vector3(), tmpL = new THREE.Vector3();
  function applyProgress(p) {
    var seg = Math.min(1.999, Math.max(0, p * 2));
    var i = Math.floor(seg), t = smooth(seg - i);
    tmpP.lerpVectors(camPos[i], camPos[i + 1], t);
    tmpL.lerpVectors(camLook[i], camLook[i + 1], t);
    camera.position.copy(tmpP);
    camera.lookAt(tmpL);
    var idx = Math.round(p * 2);
    caps.forEach(function (c, k) { c.classList.toggle('on', k === idx); });
    dots.forEach(function (d, k) { d.classList.toggle('on', k === idx); });
  }

  /* ---------- Vòng lặp ---------- */
  var clock = new THREE.Clock();
  var running = true;
  function inView() {
    var r = sec.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  }
  function tick() {
    if (!running) return;
    requestAnimationFrame(tick);
    if (document.hidden || !inView()) return;
    var dt = Math.min(clock.getDelta(), 0.05);
    var t = clock.elapsedTime;
    applyProgress(progress());
    // cây khẽ đung đưa
    tree.rotation.y = Math.sin(t * 0.25) * 0.02;
    // hạt rang xoay
    orbiters.forEach(function (ob) {
      var u = ob.userData;
      u.a += dt * u.s;
      ob.position.set(Math.cos(u.a) * u.r, u.y + Math.sin(t * 2 + u.a) * 0.12, Math.sin(u.a) * u.r);
      ob.rotation.x += dt; ob.rotation.y += dt * 0.7;
    });
    // lửa rang chập chờn
    roastGlow.intensity = 1.2 + Math.sin(t * 9) * 0.25 + Math.sin(t * 23) * 0.12;
    // hơi cà phê bay lên
    steams.forEach(function (s) {
      var u = s.userData;
      s.position.y += u.sp * dt;
      s.position.x = u.x + Math.sin(t * 1.5 + u.ph) * 0.12;
      var h = (s.position.y - 1.2) / 2.2;
      if (h >= 1) { s.position.y = 1.2; h = 0; }
      s.material.opacity = 0.32 * (1 - h);
      var sc = 0.5 + h * 0.9;
      s.scale.set(sc, sc, 1);
    });
    renderer.render(scene, camera);
  }

  function resize() {
    var w = sticky.clientWidth, h = sticky.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();
  applyProgress(progress());

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    renderer.render(scene, camera); // dựng 1 khung hình tĩnh
  } else {
    tick();
  }
})();
