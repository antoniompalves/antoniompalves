/* Carro 3D (Three.js) para as animações do portal: lavagem com sujidade, cerâmico, brilho/satin e noite.
   Uso: const ctl = await Car3D.create(host, url); ctl.set({...}); — desenha só quando o estado muda. */
import * as THREE from 'three';
import { GLTFLoader } from './vendor/three/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from './vendor/three/jsm/libs/meshopt_decoder.module.js';

const LEN = 4.9; // comprimento do carro em unidades da cena

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
        float dm = uDirt * clamp(smoothstep(.52, .78, nz * .7 + low * .5) + step(.83, sp) * .7 * (.4 + low), 0., 1.) * step(vWP.z, uWash);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.33,.27,.19) * (.5 + nz * .7), dm * .92);
        roughnessFactor = mix(roughnessFactor, .95, dm);`)
      .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n#ifdef USE_CLEARCOAT\nmaterial.clearcoat *= (1.0 - dm);\n#endif');
  };
  mat.customProgramCacheKey = () => 'dirt1';
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

  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(url);
  const car = gltf.scene;
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

  const S = { cam: [6.5, 1.4, 0], target: [0, .6, 0], fov: 30, dirt: 0, wash: 99, rough: .32, cc: 1, ccr: .04, env: 'studio', envI: 1.25, split: null, satin: null, yaw: 0, tail: 0, exposure: 1.05 };
  let W = 1, H = 1;
  function resize() { const r = host.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height); renderer.setSize(W, H, false); cv.style.width = W + 'px'; cv.style.height = H + 'px'; cam.aspect = W / H; cam.updateProjectionMatrix(); }
  function applyPaint(p) { paint.roughness = p.rough; paint.clearcoat = p.cc; paint.clearcoatRoughness = p.ccr; paint.envMapIntensity = p.envI; }
  function render() {
    cam.position.set(...S.cam); cam.fov = S.fov; cam.updateProjectionMatrix(); cam.lookAt(...S.target);
    pivot.rotation.y = S.yaw; U.uDirt.value = S.dirt; U.uWash.value = S.wash;
    scene.environment = ENV[S.env] || ENV.studio; renderer.toneMappingExposure = S.exposure;
    tailLight.intensity = S.tail * 6; lights.forEach(m => { m.emissive?.setRGB(S.tail * .9, S.tail * .05, S.tail * .05); });
    if (S.split === null || !S.satin) { applyPaint(S); renderer.setScissorTest(false); renderer.render(scene, cam); return; }
    // brilho à esquerda, satin à direita da divisória
    const x = Math.round(W * S.split);
    renderer.setScissorTest(true); renderer.autoClear = false; renderer.clear();
    applyPaint(S); renderer.setScissor(0, 0, x, H); renderer.setViewport(0, 0, W, H); renderer.render(scene, cam);
    applyPaint({ ...S, ...S.satin }); renderer.setScissor(x, 0, W - x, H); renderer.render(scene, cam);
    renderer.autoClear = true; renderer.setScissorTest(false);
  }
  let raf = 0; const req = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; render(); }); };
  const ro = new ResizeObserver(() => { resize(); req(); }); ro.observe(host); resize();
  return {
    LEN, canvas: cv,
    set(p) { Object.assign(S, p); req(); },
    /** posição no ecrã (px, relativo ao host) de um ponto da cena */
    project(v) { cam.position.set(...S.cam); cam.lookAt(...S.target); cam.updateMatrixWorld(); const p = new THREE.Vector3(...v).project(cam); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; },
    dispose() { ro.disconnect(); renderer.dispose(); cv.remove(); },
  };
}
