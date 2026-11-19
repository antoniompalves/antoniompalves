/* Carro 3D (Three.js) para as animações do portal: lavagem com sujidade, cerâmico, brilho/satin e noite.
   Uso: const ctl = await Car3D.create(host, url); ctl.set({...}); — desenha só quando o estado muda. */
import * as THREE from 'three';
import { GLTFLoader } from './vendor/three/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from './vendor/three/jsm/libs/meshopt_decoder.module.js';

const LEN = 4.9; // comprimento do carro em unidades da cena
const GLB = {};

/* Ambiente de oficina com painéis hexagonais (refletem na pintura) */
function hexStudio(warm = 0, night = 0) {
  const s = new THREE.Scene();
  const base = new THREE.Color().setRGB(.05 + warm * .25, .05 + warm * .12, .055).multiplyScalar(1 - night * .8);
  s.background = base;
  const room = new THREE.Mesh(new THREE.BoxGeometry(40, 14, 40), new THREE.MeshBasicMaterial({ color: base, side: THREE.BackSide }));
  room.position.y = 6; s.add(room);
  const hexMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(night ? .35 : 6) });
  const geo = new THREE.RingGeometry(.78, .92, 6); geo.rotateX(Math.PI / 2);
  const R = .92, W = R * Math.sqrt(3);
  for (let r = -6; r <= 6; r++) for (let c = -6; c <= 6; c++) {
    const m = new THREE.Mesh(geo, hexMat); m.position.set(c * W + (r % 2 ? W / 2 : 0), 7.9, r * R * 1.5); m.rotation.y = Math.PI / 6; s.add(m);
  }
  // janela/porta (luz quente ao pôr do sol)
  if (warm) { const p = new THREE.Mesh(new THREE.PlaneGeometry(22, 7), new THREE.MeshBasicMaterial({ color: new THREE.Color(8, 3.6, 1.2).multiplyScalar(warm) })); p.position.set(0, 3.5, -19.5); s.add(p); }
  // faixas laterais suaves (dão o “contorno” da carroçaria)
  const strip = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(night ? .05 : 1.4) });
  for (const x of [-19.5, 19.5]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(30, 1.2), strip); p.position.set(x, 4, 0); p.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2; s.add(p); }
  if (night) { const red = new THREE.Mesh(new THREE.PlaneGeometry(30, 3), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, .1, .1).multiplyScalar(night) })); red.position.set(0, .5, 19.5); red.rotation.y = Math.PI; s.add(red); }
  return s;
}

/* Oficina visível (banner): teto de LED hexagonal, chão polido, parede de ripas com janela */
function woodTex() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const g = c.getContext('2d');
  for (let x = 0; x < 1024; x += 16) { const v = 30 + Math.random() * 18; g.fillStyle = `rgb(${v + 22},${v + 8},${v - 6})`; g.fillRect(x, 0, 14, 256); g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(x + 14, 0, 2, 256);
    for (let k = 0; k < 6; k++) { g.fillStyle = `rgba(255,220,180,${Math.random() * .05})`; g.fillRect(x + Math.random() * 12, 0, 1, 256); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(3, 1); return t;
}
function buildRoom() {
  const grp = new THREE.Group();
  const R = .62, H = 3.35, cols = 30, rows = 24;
  const ring = new THREE.RingGeometry(R * .9, R * .985, 6, 1); ring.rotateX(Math.PI / 2);
  const glow = new THREE.RingGeometry(R * .78, R * 1.08, 6, 1); glow.rotateX(Math.PI / 2);
  const tube = new THREE.InstancedMesh(ring, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.4, 2.5), side: THREE.DoubleSide }), cols * rows);
  const halo = new THREE.InstancedMesh(glow, new THREE.MeshBasicMaterial({ color: new THREE.Color(.55, .6, .7), transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), cols * rows);
  const m = new THREE.Matrix4(); let i = 0;
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    const x = -16 + c * 1.5 * R, z = -11 + r * Math.sqrt(3) * R + (c % 2 ? Math.sqrt(3) * R / 2 : 0);
    m.makeTranslation(x, H, z); tube.setMatrixAt(i, m); m.makeTranslation(x, H - .01, z); halo.setMatrixAt(i, m); i++;
  }
  grp.add(tube, halo);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshStandardMaterial({ color: 0x0a0a0b, roughness: .9 })); ceil.rotation.x = Math.PI / 2; ceil.position.y = H + .02; grp.add(ceil);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshPhysicalMaterial({ color: 0x2a2a2c, roughness: .22, metalness: 0, clearcoat: .6, clearcoatRoughness: .15 }));
  floor.rotation.x = -Math.PI / 2; grp.add(floor);
  const wood = new THREE.Mesh(new THREE.PlaneGeometry(40, H), new THREE.MeshStandardMaterial({ map: woodTex(), roughness: .7 })); wood.rotation.y = Math.PI / 2; wood.position.set(-9, H / 2, 0); grp.add(wood);
  // janela / portão envidraçado (acende ao pôr do sol)
  const win = new THREE.MeshBasicMaterial({ color: new THREE.Color(.05, .06, .07) });
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.5), win); pane.rotation.y = Math.PI / 2; pane.position.set(-8.98, 1.35, -1.5); grp.add(pane);
  const bar = new THREE.MeshBasicMaterial({ color: 0x050505 });
  for (let k = 0; k < 6; k++) { const b = new THREE.Mesh(new THREE.PlaneGeometry(9, .05), bar); b.rotation.y = Math.PI / 2; b.position.set(-8.97, .2 + k * .46, -1.5); grp.add(b); }
  for (const z of [-11, 11]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(30, H), new THREE.MeshStandardMaterial({ color: 0x141416, roughness: .8 })); w.position.set(0, H / 2, z); w.rotation.y = z > 0 ? Math.PI : 0; grp.add(w); }
  return { grp, win };
}

/* Sujidade + lavagem injetadas no material da pintura */
const NOISE = `
float h3(vec3 p){ p = fract(p*.3183099+.1); p *= 17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float n3(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
  return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm(vec3 p){ float a=.5, s=0.; for(int i=0;i<4;i++){ s+=a*n3(p); p*=2.03; a*=.5; } return s; }`;
function patchDirt(mat, U) {
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;\nuniform float uDirt; uniform float uWash;\n' + NOISE)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        float nz = fbm(vWP * 2.4), sp = n3(vWP * 38.);
        float low = smoothstep(1.15, .2, vWP.y);                          // mais sujidade em baixo
        float edge = uWash + (fbm(vWP * vec3(1.6, 2.6, 1.6) + 7.) - .5) * 1.1 + (vWP.y - .7) * .28;   // frente de lavagem irregular
        float dm = uDirt * clamp(smoothstep(.52, .78, nz * .7 + low * .5) + step(.83, sp) * .7 * (.4 + low), 0., 1.) * (1. - smoothstep(edge - .05, edge + .05, vWP.z));
        float wet = uDirt * (1. - smoothstep(0., .55, abs(vWP.z - edge))) * step(edge - .05, vWP.z) * step(uWash, 50.);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.33,.27,.19) * (.5 + nz * .7), dm * .92);
        diffuseColor.rgb *= 1. - wet * .35;                                                        // escorrido / molhado
        roughnessFactor = mix(roughnessFactor, .08, wet * .7);
        roughnessFactor = mix(roughnessFactor, .95, dm);`)
      .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n#ifdef USE_CLEARCOAT\nmaterial.clearcoat *= (1.0 - dm);\n#endif');
  };
  mat.customProgramCacheKey = () => 'dirt2';
}

export async function create(host, url, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, opts.maxDpr || 1.6));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const cv = renderer.domElement; cv.className = 'car3d'; host.appendChild(cv);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, 1, .05, 200);
  const pm = new THREE.PMREMGenerator(renderer);
  const ENV = { studio: pm.fromScene(hexStudio(0, 0), .03).texture, sunset: pm.fromScene(hexStudio(1, 0), .03).texture, night: pm.fromScene(hexStudio(0, 1), .03).texture };
  scene.environment = ENV.studio;

  const gltf = await (GLB[url] ||= (() => { const l = new GLTFLoader(); l.setMeshoptDecoder(MeshoptDecoder); return l.loadAsync(url); })());
  const car = gltf.scene.clone(true);
  car.traverse(o => { if (o.isMesh) o.material = Array.isArray(o.material) ? o.material.map(x => x.clone()) : o.material.clone(); });
  // normalizar: comprimento LEN ao longo de Z, rodas em y = 0, centro na origem
  const box = new THREE.Box3().setFromObject(car), size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
  const k = LEN / Math.max(size.x, size.z); car.scale.setScalar(k);
  if (size.x > size.z) car.rotation.y = Math.PI / 2;
  car.position.set(-ctr.x * k, -box.min.y * k, -ctr.z * k);
  if (size.x > size.z) car.position.set(-ctr.z * k, -box.min.y * k, ctr.x * k);
  if (opts.flip) { car.rotation.y += Math.PI; car.position.x *= -1; car.position.z *= -1; }
  const pivot = new THREE.Group(); pivot.add(car); scene.add(pivot);

  // materiais: pintura, rodas, luzes
  const U = { uDirt: { value: 0 }, uWash: { value: 99 } };
  let paint = null; const dirtables = [], lights = [];
  car.traverse(o => {
    if (!o.isMesh) return;
    o.frustumCulled = false;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m, i) => {
      const n = m.name || '';
      if (/Paint_Material/i.test(n)) {
        if (!paint) { paint = new THREE.MeshPhysicalMaterial({ name: n, color: new THREE.Color(opts.color || '#0c0d10'), metalness: .55, roughness: .32, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: 1.25 }); patchDirt(paint, U); dirtables.push(paint); }
        if (Array.isArray(o.material)) o.material[i] = paint; else o.material = paint;
      } else if (/Wheel|Base_Material|Callip/i.test(n)) { patchDirt(m, U); dirtables.push(m); }
      else if (/LightA/i.test(n)) lights.push(m);
    });
  });
  // sombra de contacto
  const sh = document.createElement('canvas'); sh.width = sh.height = 128; const g = sh.getContext('2d'); const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  gr.addColorStop(0, 'rgba(0,0,0,.75)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(LEN * 1.25, LEN * .55), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sh), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = .005; scene.add(shadow);
  const tailLight = new THREE.PointLight(0xff1a1a, 0, 6); tailLight.position.set(0, .9, -LEN / 2 - .3); scene.add(tailLight);
  const room = opts.room ? buildRoom() : null;
  if (room) { scene.add(room.grp); renderer.setClearColor(0x0b0b0c, 1); scene.background = new THREE.Color(0x0b0b0c); shadow.material.opacity = .9; }

  const S = { cam: [6.5, 1.4, 0], target: [0, .6, 0], fov: 30, dirt: 0, wash: 99, rough: .32, cc: 1, ccr: .04, env: 'studio', envI: 1.25, split: null, satin: null, yaw: 0, tail: 0, exposure: 1.05 };
  let W = 1, H = 1;
  function resize() { const r = host.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height); renderer.setSize(W, H, false); cv.style.width = W + 'px'; cv.style.height = H + 'px'; cam.aspect = W / H; cam.updateProjectionMatrix(); }
  function applyPaint(p) { paint.roughness = p.rough; paint.clearcoat = p.cc; paint.clearcoatRoughness = p.ccr; paint.envMapIntensity = p.envI; U.uDirt.value = p.dirt; U.uWash.value = p.wash; }
  function render() {
    const kd = cam.aspect < 1.15 ? Math.min(2.3, 1.2 / cam.aspect) : 1;                       // telemóvel: afastar a câmara
    cam.position.set(...S.cam.map((v, i) => S.target[i] + (v - S.target[i]) * kd)); cam.fov = S.fov; cam.updateProjectionMatrix(); cam.lookAt(...S.target);
    if (room) { const sun = S.env === 'sunset'; room.win.color.setRGB(sun ? 6 : .05, sun ? 2.6 : .06, sun ? .8 : .07); scene.background.setRGB(sun ? .09 : .043, sun ? .05 : .043, sun ? .03 : .047); }
    pivot.rotation.y = S.yaw;
    scene.environment = ENV[S.env] || ENV.studio; renderer.toneMappingExposure = S.exposure;
    tailLight.intensity = S.tail * 6; lights.forEach(m => { m.emissive?.setRGB(S.tail * .9, S.tail * .05, S.tail * .05); });
    if (S.split === null || !(S.satin || S.right || S.left)) { applyPaint(S); renderer.setScissorTest(false); renderer.render(scene, cam); return; }
    // estados diferentes de cada lado da divisória (brilho/satin, antes/depois)
    const x = Math.round(W * S.split);
    renderer.setScissorTest(true); renderer.autoClear = false; renderer.clear();
    applyPaint({ ...S, ...(S.left || {}) }); renderer.setScissor(0, 0, x, H); renderer.setViewport(0, 0, W, H); renderer.render(scene, cam);
    applyPaint({ ...S, ...(S.right || S.satin || {}) }); renderer.setScissor(x, 0, W - x, H); renderer.render(scene, cam);
    renderer.autoClear = true; renderer.setScissorTest(false);
  }
  let raf = 0; const req = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; render(); }); };
  const ro = new ResizeObserver(() => { resize(); req(); }); ro.observe(host); resize();
  return {
    LEN, canvas: cv,
    set(p) { Object.assign(S, p); req(); },
    /** posição no ecrã (px, relativo ao host) de um ponto da cena */
    project(v) { const kd = cam.aspect < 1.15 ? Math.min(2.3, 1.2 / cam.aspect) : 1; cam.position.set(...S.cam.map((q, i) => S.target[i] + (q - S.target[i]) * kd)); cam.lookAt(...S.target); cam.updateMatrixWorld(); const p = new THREE.Vector3(...v).project(cam); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; },
    dispose() { ro.disconnect(); renderer.dispose(); cv.remove(); },
  };
}
