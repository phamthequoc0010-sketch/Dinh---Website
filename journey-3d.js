/* Đình — Hành trình 3D: từ vườn đến tách cà phê (phong cách chân thực).
   Cuộn trang để camera đi qua 3 trạm: cây cà phê → xưởng rang → tách cà phê.
   Module three.js r160: ACES tone mapping, bóng đổ mềm, texture vẽ procedural,
   vật liệu PBR (gốm clearcoat, cherry bóng, hạt có rãnh giữa, crema espresso).
   Thêm ?p=0..1 vào URL để khóa camera một trạm (phục vụ kiểm tra). */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

(function () {
  'use strict';
  var sec = document.getElementById('hanh-trinh-3d');
  var canvas = document.getElementById('j3d-canvas');
  if (!sec || !canvas) return;

  var sticky = sec.querySelector('.j3d-sticky');
  var caps = Array.prototype.slice.call(sec.querySelectorAll('.j3d-cap'));
  var dots = Array.prototype.slice.call(sec.querySelectorAll('.j3d-dots span'));

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  } catch (e) { sec.style.display = 'none'; return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf3ead6);
  scene.fog = new THREE.Fog(0xf3ead6, 24, 58);

  var pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  var camera = new THREE.PerspectiveCamera(40, 1, 0.1, 140);

  /* ================= Texture vẽ bằng canvas ================= */
  function makeTex(w, h, draw, repeatX, repeatY) {
    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    draw(cv.getContext('2d'), w, h);
    var t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    if (repeatX) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeatX, repeatY || repeatX); }
    return t;
  }
  function speckle(ctx, w, h, n, colors, rMin, rMax, aMax) {
    for (var i = 0; i < n; i++) {
      ctx.fillStyle = colors[(Math.random() * colors.length) | 0];
      ctx.globalAlpha = Math.random() * aMax;
      var r = rMin + Math.random() * (rMax - rMin);
      ctx.beginPath(); ctx.arc(Math.random() * w, Math.random() * h, r, 0, 6.29); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  var woodTex = makeTex(512, 256, function (ctx, w, h) {
    ctx.fillStyle = '#9c6b40'; ctx.fillRect(0, 0, w, h);
    for (var i = 0; i < 46; i++) {
      ctx.strokeStyle = 'rgba(58,34,14,' + (0.12 + Math.random() * 0.2) + ')';
      ctx.lineWidth = 1 + Math.random() * 2.5;
      ctx.beginPath();
      var y = Math.random() * h;
      ctx.moveTo(0, y);
      for (var x = 0; x <= w; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.02 + i) * 6);
      ctx.stroke();
    }
    speckle(ctx, w, h, 300, ['#7a4f28', '#b98d55'], 0.5, 1.5, 0.25);
  }, 2, 2);

  var burlapTex = makeTex(256, 256, function (ctx, w, h) {
    ctx.fillStyle = '#a37f4e'; ctx.fillRect(0, 0, w, h);
    for (var y = 0; y < h; y += 7) for (var x = 0; x < w; x += 7) {
      ctx.fillStyle = ((x + y) / 7) % 2 ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.07)';
      ctx.fillRect(x, y, 7, 7);
    }
    speckle(ctx, w, h, 500, ['#6e5230', '#c49c63'], 0.5, 1.5, 0.3);
  }, 3, 3);

  var beanTex = makeTex(256, 256, function (ctx, w, h) {
    var g = ctx.createRadialGradient(128, 110, 20, 128, 128, 165);
    g.addColorStop(0, '#7d5230'); g.addColorStop(0.55, '#5c3719'); g.addColorStop(1, '#38200f');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // rãnh giữa hạt
    ctx.strokeStyle = 'rgba(22,12,5,0.9)'; ctx.lineWidth = 15; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(128, 8);
    ctx.bezierCurveTo(102, 80, 154, 170, 128, 248); ctx.stroke();
    ctx.strokeStyle = 'rgba(150,100,55,0.35)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(140, 14);
    ctx.bezierCurveTo(116, 84, 164, 172, 140, 242); ctx.stroke();
    speckle(ctx, w, h, 160, ['#8a5c30', '#2c180a'], 1, 3, 0.3);
  });

  var cremaTex = makeTex(256, 256, function (ctx, w, h) {
    var g = ctx.createRadialGradient(128, 128, 10, 128, 128, 130);
    g.addColorStop(0, '#4d2a12'); g.addColorStop(0.7, '#3a1e0c'); g.addColorStop(1, '#241005');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // vân crema
    for (var i = 0; i < 70; i++) {
      ctx.strokeStyle = ['#8a5a28', '#c98f4e', '#a06a32'][(Math.random() * 3) | 0];
      ctx.globalAlpha = 0.18 + Math.random() * 0.25;
      ctx.lineWidth = 2 + Math.random() * 5;
      var r = 20 + Math.random() * 95, a0 = Math.random() * 6.29;
      ctx.beginPath(); ctx.arc(128, 128, r, a0, a0 + 0.6 + Math.random() * 1.6); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    speckle(ctx, w, h, 120, ['#d9a45b', '#6e4420'], 1, 4, 0.3);
  });

  var grassTex = makeTex(512, 512, function (ctx, w, h) {
    ctx.fillStyle = '#7fa35c'; ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, 1400, ['#5d8a48', '#93b86e', '#6e9a50'], 1, 5, 0.4);
  }, 3, 3);

  var concreteTex = makeTex(512, 512, function (ctx, w, h) {
    ctx.fillStyle = '#5e4e3b'; ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, 1200, ['#4a3c2c', '#6e5c46', '#7d6a52'], 1, 4, 0.3);
    for (var i = 0; i < 8; i++) {
      var g = ctx.createRadialGradient(Math.random() * w, Math.random() * h, 4, Math.random() * w, Math.random() * h, 40 + Math.random() * 60);
      g.addColorStop(0, 'rgba(30,22,14,0.25)'); g.addColorStop(1, 'rgba(30,22,14,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
  }, 2, 2);

  var barkTex = makeTex(256, 512, function (ctx, w, h) {
    ctx.fillStyle = '#6b4a2a'; ctx.fillRect(0, 0, w, h);
    for (var i = 0; i < 40; i++) {
      ctx.strokeStyle = 'rgba(32,20,9,' + (0.2 + Math.random() * 0.25) + ')';
      ctx.lineWidth = 2 + Math.random() * 5;
      ctx.beginPath();
      var x = Math.random() * w;
      ctx.moveTo(x, 0);
      for (var y = 0; y <= h; y += 40) ctx.lineTo(x + Math.sin(y * 0.03 + i) * 8, y);
      ctx.stroke();
    }
  }, 1, 2);

  /* ================= Ánh sáng ================= */
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x8a6f4d, 0.35));
  var sun = new THREE.DirectionalLight(0xfff1dc, 2.4);
  sun.position.set(12, 15, 9);
  sun.target.position.set(12, 0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -17; sun.shadow.camera.right = 17;
  sun.shadow.camera.top = 14; sun.shadow.camera.bottom = -8;
  sun.shadow.camera.near = 2; sun.shadow.camera.far = 45;
  sun.shadow.bias = -0.0006;
  scene.add(sun); scene.add(sun.target);
  var fill = new THREE.DirectionalLight(0xdfe8ff, 0.5);
  fill.position.set(-6, 6, -8);
  scene.add(fill);
  var roastGlow = new THREE.PointLight(0xff7b2d, 14, 16, 2);
  roastGlow.position.set(12, 2.6, 1.6);
  scene.add(roastGlow);

  /* ================= Mặt đất ================= */
  var ground = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 34),
    new THREE.MeshStandardMaterial({ color: 0xe6d6b4, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(12, -0.02, -2);
  ground.receiveShadow = true;
  scene.add(ground);

  function disc(x, r, mat) {
    var m = new THREE.Mesh(new THREE.CircleGeometry(r, 56), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.01, 0);
    m.receiveShadow = true;
    scene.add(m);
    return m;
  }
  disc(0, 4.8, new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 }));
  disc(12, 4.4, new THREE.MeshStandardMaterial({ map: concreteTex, roughness: 0.95 }));
  disc(24, 4.8, new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.7 }));

  function shadowify(obj) {
    obj.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  }

  /* ================= Trạm 1: cây cà phê ================= */
  var tree = new THREE.Group();
  var barkMat = new THREE.MeshStandardMaterial({ map: barkTex, roughness: 0.95 });
  var trunk1 = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, 1.6, 12), barkMat);
  trunk1.position.y = 0.8; trunk1.rotation.z = 0.05;
  var trunk2 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.17, 1.5, 12), barkMat);
  trunk2.position.set(0.12, 2.2, 0); trunk2.rotation.z = -0.1;
  tree.add(trunk1); tree.add(trunk2);
  // cành
  var branchMat = barkMat;
  [[0.5, 2.9, 0.5, 0.5], [-0.55, 3.1, -0.3, -0.55], [0.1, 3.3, -0.6, 2.6]].forEach(function (b) {
    var br = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 1.1, 8), branchMat);
    br.position.set(b[0], b[1], b[2]);
    br.rotation.z = b[3]; br.rotation.x = 0.25;
    tree.add(br);
  });
  // tán lá: nhiều khối icosahedron dẹt, màu loang
  var leafMats = [0x3e7a38, 0x4c8f43, 0x356b31].map(function (c) {
    return new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true });
  });
  var blobs = [
    [0, 3.6, 0, 1.5], [1.1, 3.1, 0.5, 1.05], [-1.05, 3.2, -0.4, 1.1],
    [0.3, 2.9, -1.0, 1.0], [-0.4, 3.0, 1.0, 1.05], [0, 4.35, 0, 1.05],
    [0.75, 3.9, -0.6, 0.85], [-0.7, 3.95, 0.55, 0.9], [0.1, 3.3, 0.1, 1.25]
  ];
  var cherryPts = [];
  blobs.forEach(function (f, i) {
    var s = new THREE.Mesh(new THREE.IcosahedronGeometry(f[3], 1), leafMats[i % 3]);
    s.position.set(f[0], f[1], f[2]);
    s.scale.y = 0.78;
    s.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    tree.add(s);
    for (var k = 0; k < 6; k++) {
      var a = Math.random() * 6.29, b2 = Math.random() * 3.14 - 1.57;
      cherryPts.push([
        f[0] + Math.cos(a) * Math.cos(b2) * f[3] * 1.0,
        f[1] + Math.sin(b2) * f[3] * 0.78,
        f[2] + Math.sin(a) * Math.cos(b2) * f[3] * 1.0
      ]);
    }
  });
  // cherry chín bóng
  var cherryGeo = new THREE.SphereGeometry(0.1, 14, 12);
  var cherryMat = new THREE.MeshPhysicalMaterial({ color: 0xb81f24, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.15 });
  cherryPts.forEach(function (p) {
    var c = new THREE.Mesh(cherryGeo, cherryMat);
    c.position.set(p[0], p[1], p[2]);
    tree.add(c);
  });
  // hoa cà phê trắng điểm xuyết
  var flowerGeo = new THREE.SphereGeometry(0.05, 8, 6);
  var flowerMat = new THREE.MeshStandardMaterial({ color: 0xfdfdf4, roughness: 0.6 });
  for (var fl = 0; fl < 14; fl++) {
    var f2 = new THREE.Mesh(flowerGeo, flowerMat);
    var bf = blobs[(Math.random() * blobs.length) | 0];
    f2.position.set(bf[0] + (Math.random() - 0.5) * 2, bf[1] + (Math.random() - 0.5) * 1.4, bf[2] + (Math.random() - 0.5) * 2);
    tree.add(f2);
  }
  // cỏ
  var grassGeo = new THREE.ConeGeometry(0.09, 0.55, 6);
  var grassMat = new THREE.MeshStandardMaterial({ color: 0x5d8a48, roughness: 1 });
  for (var g = 0; g < 18; g++) {
    var cone = new THREE.Mesh(grassGeo, grassMat);
    var ga = Math.random() * 6.29, gr = 2.6 + Math.random() * 1.9;
    cone.position.set(Math.cos(ga) * gr, 0.26, Math.sin(ga) * gr);
    cone.rotation.z = (Math.random() - 0.5) * 0.3;
    tree.add(cone);
  }
  shadowify(tree);
  scene.add(tree);

  /* ================= Trạm 2: xưởng rang ================= */
  var roast = new THREE.Group();
  roast.position.x = 12;
  var steelMat = new THREE.MeshStandardMaterial({ color: 0x3c3c40, metalness: 0.85, roughness: 0.38 });
  // máy rang gợi ý: thân trụ + cửa tròn phát sáng + ống khói
  var drum = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.5, 28), steelMat);
  drum.position.set(1.9, 1.15, -1.7);
  roast.add(drum);
  var doorRing = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.06, 12, 28), steelMat);
  doorRing.position.set(1.9, 1.15, -0.93);
  roast.add(doorRing);
  var doorGlow = new THREE.Mesh(
    new THREE.CircleGeometry(0.32, 28),
    new THREE.MeshBasicMaterial({ color: 0xff8c2e })
  );
  doorGlow.position.set(1.9, 1.15, -0.94);
  roast.add(doorGlow);
  var chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.4, 12), steelMat);
  chimney.position.set(1.9, 2.6, -1.7);
  roast.add(chimney);
  var drumLeg1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.12), steelMat);
  drumLeg1.position.set(1.5, 0.25, -1.7);
  var drumLeg2 = drumLeg1.clone(); drumLeg2.position.x = 2.3;
  roast.add(drumLeg1); roast.add(drumLeg2);

  // bao bố đựng hạt
  var sackMat = new THREE.MeshStandardMaterial({ map: burlapTex, roughness: 0.95 });
  var sack = new THREE.Mesh(new THREE.SphereGeometry(1.05, 24, 18), sackMat);
  sack.scale.set(1, 0.82, 1);
  sack.position.set(-1.1, 0.82, 0.4);
  roast.add(sack);
  var tie = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.1, 10, 20), sackMat);
  tie.position.set(-1.1, 1.62, 0.4);
  tie.rotation.x = Math.PI / 2;
  roast.add(tie);
  var sackTop = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.5, 14), sackMat);
  sackTop.position.set(-1.1, 1.85, 0.4);
  roast.add(sackTop);

  // hạt rang: có rãnh giữa
  var beanGeo = new THREE.SphereGeometry(0.17, 14, 12);
  beanGeo.scale(1, 0.72, 0.62);
  var beanMat = new THREE.MeshStandardMaterial({ map: beanTex, roughness: 0.5 });
  function beanPile(cx, cz, n, rMax, yBase) {
    for (var i = 0; i < n; i++) {
      var bean = new THREE.Mesh(beanGeo, beanMat);
      var a = Math.random() * 6.29, r = Math.sqrt(Math.random()) * rMax;
      bean.position.set(cx + Math.cos(a) * r, yBase + (1 - r / (rMax + 0.2)) * 0.5 * Math.random() + Math.random() * 0.1, cz + Math.sin(a) * r);
      bean.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      roast.add(bean);
    }
  }
  beanPile(0.4, 0.9, 90, 1.35, 0.1);   // đống hạt trước bao
  beanPile(-1.1, 0.4, 25, 0.7, 1.35);  // vài hạt trên miệng bao
  // hạt bay lơ lửng trên mẻ rang
  var orbiters = [];
  for (var o = 0; o < 12; o++) {
    var ob = new THREE.Mesh(beanGeo, beanMat);
    ob.userData = { a: (o / 12) * 6.29, r: 1.0 + Math.random() * 0.5, y: 1.6 + Math.random() * 1.0, s: 0.5 + Math.random() * 0.5 };
    roast.add(ob);
    orbiters.push(ob);
  }
  // xẻng gỗ
  var scoopHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.1, 8),
    new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.7 }));
  scoopHandle.position.set(0.9, 0.5, 1.5); scoopHandle.rotation.z = 1.1; scoopHandle.rotation.y = 0.4;
  roast.add(scoopHandle);
  shadowify(roast);
  scene.add(roast);

  /* ================= Trạm 3: tách cà phê ================= */
  var cupG = new THREE.Group();
  cupG.position.x = 24;
  var ceramic = new THREE.MeshPhysicalMaterial({ color: 0xfdfbf6, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.08 });
  var saucer = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 0.8, 0.12, 40), ceramic);
  saucer.position.y = 0.06;
  cupG.add(saucer);
  var cupBody = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.42, 0.95, 40), ceramic);
  cupBody.position.y = 0.6;
  cupG.add(cupBody);
  var coffee = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 40),
    new THREE.MeshStandardMaterial({ map: cremaTex, roughness: 0.3 })
  );
  coffee.rotation.x = -Math.PI / 2;
  coffee.position.y = 1.0;
  cupG.add(coffee);
  var rim = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.045, 14, 44), ceramic);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.06;
  cupG.add(rim);
  var handle = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.065, 14, 28, Math.PI), ceramic);
  handle.position.set(0.62, 0.62, 0);
  handle.rotation.z = -Math.PI / 2;
  cupG.add(handle);
  // vài hạt rang rơi quanh tách
  for (var sb = 0; sb < 9; sb++) {
    var sbean = new THREE.Mesh(beanGeo, beanMat);
    var sa = Math.random() * 6.29, sr = 1.5 + Math.random() * 1.6;
    sbean.position.set(Math.cos(sa) * sr, 0.1, Math.sin(sa) * sr * 0.8);
    sbean.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    cupG.add(sbean);
  }
  // hơi nóng
  var steamTex = makeTex(64, 64, function (ctx, w, h) {
    var grd = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grd.addColorStop(0, 'rgba(255,255,255,0.85)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
  });
  var steams = [];
  for (var sti = 0; sti < 16; sti++) {
    var sm = new THREE.SpriteMaterial({ map: steamTex, transparent: true, opacity: 0.3, depthWrite: false });
    var spr = new THREE.Sprite(sm);
    spr.userData = { x: (Math.random() - 0.5) * 0.5, z: (Math.random() - 0.5) * 0.5, sp: 0.35 + Math.random() * 0.4, ph: Math.random() * 6.28 };
    spr.position.set(spr.userData.x, 1.2 + Math.random() * 2, spr.userData.z);
    spr.scale.set(0.5, 0.5, 1);
    cupG.add(spr);
    steams.push(spr);
  }
  shadowify(cupG);
  // hơi nước không cần đổ bóng
  steams.forEach(function (s) { s.castShadow = false; });
  scene.add(cupG);

  /* ================= Camera theo cuộn ================= */
  var camPos = [
    new THREE.Vector3(0, 3.3, 9.4), new THREE.Vector3(12, 3.0, 8.4), new THREE.Vector3(24, 3.1, 9.0)
  ];
  var camLook = [
    new THREE.Vector3(0, 2.1, 0), new THREE.Vector3(12, 1.25, 0), new THREE.Vector3(24, 1.25, 0)
  ];
  function smooth(t) { return t * t * (3 - 2 * t); }
  var fixedP = parseFloat(new URLSearchParams(location.search).get('p'));
  function progress() {
    if (!isNaN(fixedP)) return Math.min(1, Math.max(0, fixedP));
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

  /* ================= Vòng lặp ================= */
  var clock = new THREE.Clock();
  var running = true, firstFrame = true;
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
    tree.rotation.y = Math.sin(t * 0.25) * 0.02;
    orbiters.forEach(function (ob) {
      var u = ob.userData;
      u.a += dt * u.s;
      ob.position.set(Math.cos(u.a) * u.r, u.y + Math.sin(t * 2 + u.a) * 0.12, Math.sin(u.a) * u.r);
      ob.rotation.x += dt; ob.rotation.y += dt * 0.7;
    });
    roastGlow.intensity = 12 + Math.sin(t * 9) * 2.5 + Math.sin(t * 23) * 1.2;
    doorGlow.material.color.setHSL(0.07, 1, 0.55 + Math.sin(t * 9) * 0.06);
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
    if (firstFrame) { firstFrame = false; window.__j3d_ready = true; }
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
    renderer.render(scene, camera);
    window.__j3d_ready = true;
  } else {
    tick();
  }
})();
