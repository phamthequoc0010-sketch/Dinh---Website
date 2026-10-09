/* Đình — Ảnh 3D parallax: biến ảnh 2D thành ảnh "nhìn được vào trong".
   Mỗi ảnh là một mặt phẳng 3D; shader ước lượng độ sâu (dưới gần, trên xa +
   chi tiết sáng-tối) rồi đẩy đỉnh lưới theo độ sâu. Chuột/chạm điều khiển
   camera tạo parallax; khi rảnh, ảnh tự "thở" nhẹ. */
import * as THREE from 'three';

const VERT = `
uniform sampler2D map;
uniform float uStrength;
uniform float uTime;
varying vec2 vUv;
varying float vDepth;
void main(){
  vUv = uv;
  vec3 c = texture2D(map, uv).rgb;
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  float d = pow(1.0 - uv.y, 1.6);      /* dưới gần, trên xa */
  d += (lum - 0.5) * 0.10;              /* nổi khối theo sáng-tối */
  d = clamp(d, 0.0, 1.0);
  vDepth = d;
  vec3 p = position;
  p.z += d * uStrength;
  p.z += sin(uTime * 0.8 + uv.x * 4.0 + uv.y * 3.0) * 0.010 * d;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const FRAG = `
uniform sampler2D map;
varying vec2 vUv;
varying float vDepth;
void main(){
  vec3 c = texture2D(map, vUv).rgb;
  c *= 0.94 + vDepth * 0.10;            /* lớp gần sáng hơn chút */
  gl_FragColor = vec4(c, 1.0);
}`;

function initCard(stage) {
  const canvas = stage.querySelector('canvas');
  const fallback = stage.querySelector('img.p3d-fallback');
  const src = stage.dataset.img;
  const aspect = parseFloat(stage.dataset.aspect || '0.75');

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (e) { return; /* giữ ảnh tĩnh */ }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, aspect, 0.1, 20);
  const dist = 1 / Math.tan(THREE.MathUtils.degToRad(14));
  camera.position.set(0, 0, dist + 0.05);
  camera.lookAt(0, 0, 0);

  const geo = new THREE.PlaneGeometry(2 * aspect, 2, 56, 56);
  const tex = new THREE.TextureLoader().load(src, t => { t.colorSpace = THREE.SRGBColorSpace; });
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: tex },
      uStrength: { value: 0.24 },
      uTime: { value: 0 }
    },
    vertexShader: VERT,
    fragmentShader: FRAG
  });
  scene.add(new THREE.Mesh(geo, mat));
  if (fallback) fallback.style.display = 'none';

  // điều khiển: chuột / chạm
  const target = new THREE.Vector2(0, 0);
  const cur = new THREE.Vector2(0, 0);
  let lastTouch = 0;
  function onMove(x, y) {
    const r = stage.getBoundingClientRect();
    target.set(((x - r.left) / r.width - 0.5) * 2, -((y - r.top) / r.height - 0.5) * 2);
    lastTouch = performance.now();
  }
  stage.addEventListener('pointermove', e => onMove(e.clientX, e.clientY));
  stage.addEventListener('pointerdown', e => onMove(e.clientX, e.clientY));

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  let visible = false;
  new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; }), { threshold: 0.05 }).observe(stage);

  const clock = new THREE.Clock();
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  (function tick() {
    requestAnimationFrame(tick);
    if (!visible || document.hidden) return;
    const t = clock.getElapsedTime();
    // tự "thở" khi người xem không tương tác quá 3.5s
    if (performance.now() - lastTouch > 3500 && !reduced) {
      target.set(Math.sin(t * 0.35) * 0.55, Math.cos(t * 0.27) * 0.4);
    }
    cur.lerp(target, 0.06);
    camera.position.x = cur.x * 0.45;
    camera.position.y = cur.y * 0.32;
    camera.lookAt(0, 0, 0);
    // nghiêng cả khung theo chuột cho đã mắt
    const fx = cur.x * 5, fy = -cur.y * 4;
    stage.style.setProperty('--rx', fy.toFixed(2) + 'deg');
    stage.style.setProperty('--ry', fx.toFixed(2) + 'deg');
    mat.uniforms.uTime.value = reduced ? 0 : t;
    renderer.render(scene, camera);
    if (!stage.dataset.ready) { stage.dataset.ready = '1'; window.__p3d_ready = true; }
  })();
}

document.querySelectorAll('.p3d-stage').forEach(initCard);
