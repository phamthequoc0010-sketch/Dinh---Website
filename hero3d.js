/* ĐÌNH — Hero 3D: hạt cà phê particle xếp thành chữ ĐÌNH, tự morph thành hạt cà phê.
   Chạy nền trong .hero của index.html; ảnh hero-roastery.jpg giữ lại làm fallback phía sau.
   - Tự tạm dừng khi hero khuất khỏi màn hình; giới hạn DPR <= 2 cho mobile.
   - Tôn trọng prefers-reduced-motion: không khởi tạo WebGL, giữ ảnh tĩnh.
   - Lỗi WebGL: canvas trong suốt, ảnh nền cũ hiển thị như bình thường. */
import * as THREE from 'three';

(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var canvas = document.getElementById('hero3d');
  if (!canvas) return;

  /* ---------- 1. Vẽ 2 layout lên canvas ẩn, lấy điểm ảnh ---------- */
  function sampleLayout(drawFn) {
    var S = 300, STEP = 2;
    var c = document.createElement('canvas'); c.width = c.height = S;
    var x = c.getContext('2d', { willReadFrequently: true });
    x.fillStyle = '#000'; x.fillRect(0, 0, S, S);
    x.fillStyle = '#fff';
    drawFn(x, S);
    var img = x.getImageData(0, 0, S, S).data;
    var pts = [];
    for (var gy = 0; gy < S; gy += STEP)
      for (var gx = 0; gx < S; gx += STEP)
        if (img[(gy * S + gx) * 4] > 128) pts.push([gx, gy]);
    return pts;
  }
  function fitToBox(pts, maxW, maxH) {
    var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, i, p;
    for (i = 0; i < pts.length; i++) {
      p = pts[i];
      if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0];
      if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1];
    }
    var s = Math.min(maxW / ((maxX - minX) || 1), maxH / ((maxY - minY) || 1));
    var cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    return pts.map(function (pt) { return [(pt[0] - cx) * s, -((pt[1] - cy) * s)]; });
  }

  var rawA = sampleLayout(function (x, S) {          // Layout A: chữ ĐÌNH
    x.textAlign = 'center'; x.textBaseline = 'middle';
    var fs = 130;
    var setF = function () { x.font = '900 ' + fs + 'px Arial, "DejaVu Sans", sans-serif'; };
    setF();
    while (x.measureText('ĐÌNH').width > S * 0.82 && fs > 24) { fs -= 4; setF(); }
    x.fillText('ĐÌNH', S / 2, S / 2 + 6);
  });
  var rawB = sampleLayout(function (x, S) {          // Layout B: hạt cà phê
    x.beginPath(); x.ellipse(S / 2, S / 2, 82, 108, 0, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#000'; x.lineWidth = 15; x.lineCap = 'round';
    x.beginPath(); x.moveTo(S / 2, S / 2 - 96);
    x.bezierCurveTo(S / 2 + 58, S / 2 - 48, S / 2 - 58, S / 2 + 48, S / 2, S / 2 + 96);
    x.stroke();
  });

  // màn hình hẹp (mobile dọc): hero không còn khoảng trống cho chữ lớn,
  // nên dùng chế độ ambient — hạt trôi nhẹ khắp hero, không xếp chữ, không morph
  var aspect0 = (canvas.clientWidth || window.innerWidth) / ((canvas.clientHeight || window.innerHeight) || 1);
  var narrow = aspect0 < 0.8;
  var Y_OFF = 0.38;
  var fitK = Math.min(1, 1.13 * aspect0);
  var A = fitToBox(rawA, 2.9, 1.9).map(function (p) { return [p[0] * fitK, p[1] * fitK + Y_OFF]; });
  var B = fitToBox(rawB, 2.9, 1.9).map(function (p) { return [p[0] * fitK, p[1] * fitK + Y_OFF]; });
  var N = Math.min(A.length, B.length, 2600);
  if (N < 50) return;
  function pick(arr, n) {
    var idx = arr.map(function (_, i) { return i; }), i, j, t;
    for (i = idx.length - 1; i > 0; i--) {
      j = (Math.random() * (i + 1)) | 0;
      t = idx[i]; idx[i] = idx[j]; idx[j] = t;
    }
    return idx.slice(0, n).map(function (k) { return arr[k]; });
  }
  var pA = pick(A, N), pB = pick(B, N);
  if (narrow) {
    // ambient: rải hạt ngẫu nhiên khắp hero thay vì xếp chữ
    var k, field = [];
    for (k = 0; k < N; k++)
      field.push([(Math.random() * 2 - 1) * 1.7, (Math.random() * 2 - 1) * 1.9]);
    pA = field; pB = field;
  }

  /* ---------- 2. Dựng scene ---------- */
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  } catch (e) { return; }   // giữ ảnh nền tĩnh
  renderer.setClearColor(0x000000, 0);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
  camera.position.set(0, 0, 4.4);

  var PALETTE = [
    [0.72, 0.25, 0.05], [0.72, 0.25, 0.05],   // rust #b7410e
    [0.85, 0.63, 0.40],                        // caramel
    [0.95, 0.89, 0.78],                        // cream
    [0.23, 0.12, 0.05]                         // dark roast
  ];
  var pos = new Float32Array(N * 3), tgt = new Float32Array(N * 3),
      start = new Float32Array(N * 3),
      delay = new Float32Array(N), size = new Float32Array(N), col = new Float32Array(N * 3);
  var i, c, r, th, ph;
  for (i = 0; i < N; i++) {
    pos[i * 3] = pA[i][0]; pos[i * 3 + 1] = pA[i][1]; pos[i * 3 + 2] = 0;
    tgt[i * 3] = pB[i][0]; tgt[i * 3 + 1] = pB[i][1]; tgt[i * 3 + 2] = 0;
    r = 2.6 + Math.random() * 1.6; th = Math.random() * Math.PI * 2;
    ph = Math.acos(2 * Math.random() - 1);
    start[i * 3] = r * Math.sin(ph) * Math.cos(th);
    start[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
    start[i * 3 + 2] = r * Math.cos(ph) * 0.5;
    delay[i] = Math.random();
    size[i] = 5 + Math.random() * 7;
    c = PALETTE[(Math.random() * PALETTE.length) | 0];
    col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
  }
  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aTarget', new THREE.BufferAttribute(tgt, 3));
  geo.setAttribute('aStart', new THREE.BufferAttribute(start, 3));
  geo.setAttribute('aDelay', new THREE.BufferAttribute(delay, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));

  var uniforms = {
    uTime: { value: 0 },
    uMorph: { value: 0 },
    uMouse: { value: new THREE.Vector2(999, 999) },
    uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) }
  };
  var mat = new THREE.ShaderMaterial({
    uniforms: uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: [
      'attribute vec3 aTarget;',
      'attribute vec3 aStart;',
      'attribute float aDelay;',
      'attribute float aSize;',
      'attribute vec3 aColor;',
      'varying vec3 vColor;',
      'uniform float uTime;',
      'uniform float uMorph;',
      'uniform vec2 uMouse;',
      'uniform float uPixelRatio;',
      'void main() {',
      '  float lt = clamp((uTime * 0.9 - aDelay * 1.4) / 1.6, 0.0, 1.0);',
      '  float ease = 1.0 - pow(1.0 - lt, 3.0);',
      '  vec3 shaped = mix(position, aTarget, uMorph);',
      '  vec3 p = mix(aStart, shaped, ease);',
      '  float d1 = sin(uTime * 0.5 + aDelay * 6.2831 + p.y * 2.5);',
      '  float d2 = cos(uTime * 0.4 + aDelay * 6.2831 + p.x * 2.5);',
      '  p.x += d1 * 0.06 * ease;',
      '  p.y += d2 * 0.06 * ease;',
      '  vec2 diff = p.xy - uMouse;',
      '  float dist = length(diff);',
      '  float repel = (1.0 - smoothstep(0.0, 0.55, dist)) * 0.35;',
      '  p.xy += (diff / max(dist, 1e-3)) * repel;',
      '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
      '  gl_Position = projectionMatrix * mv;',
      '  vColor = aColor;',
      '  float tw = 0.85 + 0.15 * sin(uTime * 2.0 + aDelay * 40.0);',
      '  gl_PointSize = aSize * uPixelRatio * tw * (2.6 / -mv.z);',
      '}'
    ].join('\n'),
    fragmentShader: [
      'varying vec3 vColor;',
      'void main() {',
      '  vec2 uv = gl_PointCoord - 0.5;',
      '  float r = length(uv);',
      '  if (r > 0.5) discard;',
      '  float a = 1.0 - smoothstep(0.30, 0.5, r);',
      '  float shade = 0.85 + 0.30 * (1.0 - smoothstep(-0.2, 0.5, uv.y));',
      '  gl_FragColor = vec4(vColor * shade, a * 0.95);',
      '}'
    ].join('\n')
  });
  scene.add(new THREE.Points(geo, mat));

  /* ---------- 3. Tương tác ---------- */
  var morphTarget = 0;
  var autoTimer = null;
  if (!narrow) autoTimer = setInterval(function () { morphTarget = morphTarget ? 0 : 1; }, 10000);

  function worldHalf() {
    var halfH = Math.tan(camera.fov * Math.PI / 360) * camera.position.z;
    return { halfW: halfH * camera.aspect, halfH: halfH };
  }
  window.addEventListener('pointermove', function (e) {
    var wh = worldHalf();
    var nx = (e.clientX / window.innerWidth) * 2 - 1;
    var ny = -((e.clientY / window.innerHeight) * 2 - 1);
    uniforms.uMouse.value.set(nx * wh.halfW, ny * wh.halfH);
  }, { passive: true });

  function resize() {
    var w = canvas.clientWidth || window.innerWidth;
    var h = canvas.clientHeight || window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  /* ---------- 4. Vòng lặp (tạm dừng khi hero khuất) ---------- */
  var clock = new THREE.Clock();
  var running = true, firstFrame = true;
  function tick() {
    if (!running) return;
    requestAnimationFrame(tick);
    uniforms.uTime.value = clock.getElapsedTime();
    uniforms.uMorph.value += (morphTarget - uniforms.uMorph.value) * 0.055;
    renderer.render(scene, camera);
    if (firstFrame) { firstFrame = false; canvas.classList.add('on'); }
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      var vis = es[0].isIntersecting && !document.hidden;
      if (vis && !running) { running = true; clock.getDelta(); tick(); }
      else running = vis;
    }).observe(canvas);
  }
  document.addEventListener('visibilitychange', function () {
    var vis = !document.hidden;
    if (vis && !running) { running = true; clock.getDelta(); tick(); }
    else running = vis;
  });
  tick();
})();
