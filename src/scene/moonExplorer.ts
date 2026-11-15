import * as THREE from 'three';

/**
 * Globe lunaire scientifique (Acte I, objectifs) : rotatif à 360°, couches de données superposées.
 * Texture : face visible = photo NASA reprojetée ; pôles et face cachée = relief reconstitué (tools/gen_moon.py).
 * Les couches sont ILLUSTRATIVES, inspirées des produits LEND (hydrogène), Diviner (température), LOLA (relief).
 */
export type LayerId = 'ice' | 'hydrogen' | 'temperature' | 'topo' | 'tracks' | 'grid' | 'names';
export interface Probe { lat: number; lon: number; tempK: number; hydrogen: number; ice: boolean; name?: string }
export interface Explorer { setLayers(l: Record<LayerId, boolean>): void; view(v: 'near' | 'far' | 'south' | 'north'): void; setAutoRotate(on: boolean): void; dispose(): void }

const D2R = Math.PI / 180;
/** Cratères et mers réels (coordonnées approximatives, diamètre en km). `psr` = ombre permanente. */
export const FEATURES: { n: string; lat: number; lon: number; d: number; psr?: boolean }[] = [
  { n: 'Shackleton', lat: -89.67, lon: 129.2, d: 21, psr: true }, { n: 'Haworth', lat: -87.45, lon: -5, d: 51, psr: true },
  { n: 'Shoemaker', lat: -88.1, lon: 44.9, d: 51, psr: true }, { n: 'Faustini', lat: -87.3, lon: 77, d: 39, psr: true },
  { n: 'de Gerlache', lat: -88.5, lon: -87.1, d: 32, psr: true }, { n: 'Sverdrup', lat: -88.3, lon: -152, d: 33, psr: true },
  { n: 'Cabeus', lat: -85.3, lon: -42.1, d: 98, psr: true }, { n: 'Amundsen', lat: -84.5, lon: 82.8, d: 103, psr: true },
  { n: 'Nobile', lat: -85.2, lon: 53.5, d: 73, psr: true }, { n: 'Malapert', lat: -84.9, lon: 12.9, d: 69 },
  { n: 'Peary', lat: 88.6, lon: 33, d: 73, psr: true }, { n: 'Hermite', lat: 86, lon: -89.9, d: 104, psr: true },
  { n: 'Rozhdestvenskiy', lat: 85.2, lon: -155.4, d: 177, psr: true }, { n: 'Byrd', lat: 85.3, lon: 9.8, d: 94 },
  { n: 'Tycho', lat: -43.3, lon: -11.2, d: 86 }, { n: 'Copernicus', lat: 9.6, lon: -20.1, d: 93 },
  { n: 'Mare Imbrium', lat: 32.8, lon: -15.6, d: 1145 }, { n: 'Mare Tranquillitatis', lat: 8.5, lon: 31.4, d: 873 },
  { n: 'Mare Serenitatis', lat: 28, lon: 17.5, d: 707 }, { n: 'Mare Crisium', lat: 17, lon: 59.1, d: 556 }, { n: 'Oceanus Procellarum', lat: 18.4, lon: -57.4, d: 2568 },
];
/** lat/lon (°) → vecteur dans le repère de la sphère Three.js (lon 0 sur +X, comme les UV de SphereGeometry). */
export const llToVec = (lat: number, lon: number, r = 1) => new THREE.Vector3(r * Math.cos(lat * D2R) * Math.cos(lon * D2R), r * Math.sin(lat * D2R), -r * Math.cos(lat * D2R) * Math.sin(lon * D2R));
/** Point d'une orbite polaire (rayon 1,08) passant par le méridien `lon`, à l'angle `deg` depuis l'équateur. */
const polarPoint = (lon: number, deg: number) => llToVec(0, lon, 1.08).multiplyScalar(Math.cos(deg * D2R)).add(new THREE.Vector3(0, 1.08 * Math.sin(deg * D2R), 0));
const angDist = (la1: number, lo1: number, la2: number, lo2: number) => {
  const a = Math.sin(la1 * D2R) * Math.sin(la2 * D2R) + Math.cos(la1 * D2R) * Math.cos(la2 * D2R) * Math.cos((lo1 - lo2) * D2R);
  return Math.acos(Math.min(1, Math.max(-1, a))) / D2R;
};
// Bruit de valeur déterministe (aucun aléa : mêmes cartes à chaque visite).
const hash = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
function vnoise(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return (hash(xi, yi) * (1 - u) + hash(xi + 1, yi) * u) * (1 - v) + (hash(xi, yi + 1) * (1 - u) + hash(xi + 1, yi + 1) * u) * v;
}
const fbm = (x: number, y: number) => vnoise(x, y) * 0.5 + vnoise(x * 2.1, y * 2.1) * 0.25 + vnoise(x * 4.3, y * 4.3) * 0.125;
/** Température de surface simplifiée (K) : soleil au méridien 0, nuit ≈ 100 K, ombre permanente ≈ 40 K (ordre de grandeur Diviner). */
export function surfaceTemp(lat: number, lon: number, psr: number) {
  const mu = Math.max(0, Math.cos(lat * D2R) * Math.cos(lon * D2R));
  return psr > 0.5 ? 40 + 15 * (1 - psr) : 95 + 295 * Math.pow(mu, 0.25);
}
const psrAt = (lat: number, lon: number) => {
  let v = 0; for (const f of FEATURES) if (f.psr) { const r = (f.d / 2) / 30.3; const d = angDist(lat, lon, f.lat, f.lon); v = Math.max(v, Math.exp(-((d / r) ** 2) * 1.4)); }
  return v;
};
export const hydrogenAt = (lat: number, lon: number) => {
  const polar = Math.max(0, (Math.abs(lat) - 55) / 35); const base = polar ** 1.6 * (0.55 + 0.45 * fbm(lon / 18, lat / 18));
  return Math.min(1, base + 0.6 * psrAt(lat, lon));
};

function paint(w: number, h: number, fn: (lat: number, lon: number) => [number, number, number, number]): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d')!; const img = g.createImageData(w, h);
  for (let j = 0; j < h; j++) { const lat = 90 - ((j + 0.5) / h) * 180; for (let i = 0; i < w; i++) { const lon = ((i + 0.5) / w) * 360 - 180; const [r, gg, b, a] = fn(lat, lon); const k = (j * w + i) * 4; img.data[k] = r; img.data[k + 1] = gg; img.data[k + 2] = b; img.data[k + 3] = a; } }
  g.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
/** Rampes de couleur (stops 0..1). */
function ramp(stops: [number, number, number, number][], x: number): [number, number, number] {
  x = Math.min(1, Math.max(0, x)); for (let i = 1; i < stops.length; i++) if (x <= stops[i][0]) { const [a, ...ca] = stops[i - 1]; const [b, ...cb] = stops[i]; const t = (x - a) / (b - a || 1); return [0, 1, 2].map((k) => ca[k] + (cb[k] - ca[k]) * t) as [number, number, number]; }
  const l = stops[stops.length - 1]; return [l[1], l[2], l[3]];
}
export const TEMP_RAMP: [number, number, number, number][] = [[0, 40, 60, 200], [0.3, 60, 180, 255], [0.55, 250, 230, 120], [0.8, 255, 140, 40], [1, 230, 50, 40]];
export const H_RAMP: [number, number, number, number][] = [[0, 90, 60, 200], [0.5, 120, 110, 255], [1, 120, 240, 255]];

export function startExplorer(canvas: HTMLCanvasElement, labels: HTMLElement, onProbe: (p: Probe | null) => void, reducedMotion: boolean): Explorer {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x05050c);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 100); let dist = 3.2; camera.position.set(0, 0, dist);

  const sg = new THREE.BufferGeometry(); const sp = new Float32Array(1800 * 3);
  for (let i = 0; i < 1800; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(40); sp.set([v.x, v.y, v.z], i * 3); }
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xc9cfff, size: 0.08, transparent: true, opacity: 0.8 })));

  // Soleil rasant (relief des cratères lisible) + lumière d'appoint pour la face de nuit.
  const sun = new THREE.DirectionalLight(0xfff3e2, 2.6); sun.position.set(-3, 1.2, 2.2); scene.add(sun);
  scene.add(new THREE.HemisphereLight(0x8c86ff, 0x101018, 0.55));

  const globe = new THREE.Group(); scene.add(globe);
  const loader = new THREE.TextureLoader();
  const map = loader.load('nasa/moon-explorer.jpg'); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  const relief = loader.load('nasa/moon-explorer-relief.jpg');
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1, 256, 192), new THREE.MeshStandardMaterial({ map, bumpMap: relief, bumpScale: 3.2, roughness: 1, metalness: 0 }));
  globe.add(moon);

  // ---- Couches de données (textures équirectangulaires 1024×512, calculées une fois) ----
  const W = 1024, H = 512; const layers = {} as Record<LayerId, THREE.Object3D>;
  const shell = (tex: THREE.Texture, r: number, opacity = 1) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 128, 96), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, depthWrite: false })); globe.add(m); return m; };
  layers.temperature = shell(paint(W, H, (la, lo) => { const t = surfaceTemp(la, lo, psrAt(la, lo)); const [r, g, b] = ramp(TEMP_RAMP, (t - 40) / 350); return [r, g, b, 150]; }), 1.0025);
  layers.hydrogen = shell(paint(W, H, (la, lo) => { const v = hydrogenAt(la, lo); const [r, g, b] = ramp(H_RAMP, v); return [r, g, b, Math.round(Math.min(1, v * 1.2) * 135)]; }), 1.003);
  layers.ice = shell(paint(W, H, (la, lo) => { const p = psrAt(la, lo); const speck = Math.abs(la) > 80 && fbm(lo / 3, la / 3) > 0.62 ? 0.55 : 0; const v = Math.max(p, speck * Math.min(1, (Math.abs(la) - 80) / 6));
    return [40, 170, 255, Math.round(Math.min(1, v * 1.3) * 230)]; }), 1.0035);
  // Relief (altitude relative) : teinte hypsométrique calculée depuis la carte de relief une fois chargée.
  const topoCanvas = document.createElement('canvas'); topoCanvas.width = W; topoCanvas.height = H; const topoTex = new THREE.CanvasTexture(topoCanvas); topoTex.colorSpace = THREE.SRGBColorSpace;
  layers.topo = shell(topoTex, 1.004);
  const reliefImg = new Image(); reliefImg.src = 'nasa/moon-explorer-relief.jpg';
  reliefImg.onload = () => { const g = topoCanvas.getContext('2d')!; g.drawImage(reliefImg, 0, 0, W, H); const d = g.getImageData(0, 0, W, H);
    for (let k = 0; k < d.data.length; k += 4) { const v = d.data[k] / 255; const [r, gg, b] = ramp([[0, 70, 40, 160], [0.45, 60, 150, 170], [0.6, 230, 210, 120], [1, 240, 110, 60]], (v - 0.3) / 0.5); d.data[k] = r; d.data[k + 1] = gg; d.data[k + 2] = b; d.data[k + 3] = 140; }
    g.putImageData(d, 0, 0); topoTex.needsUpdate = true; };
  // Grille sélénographique (15°).
  const grid = new THREE.Group(); const gm = new THREE.LineBasicMaterial({ color: 0xb8b2ff, transparent: true, opacity: 0.22 });
  for (let la = -75; la <= 75; la += 15) grid.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 121 }, (_, i) => llToVec(la, i * 3 - 180, 1.005))), gm));
  for (let lo = -180; lo < 180; lo += 15) grid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 61 }, (_, i) => llToVec(i * 3 - 90, lo, 1.005))), gm));
  globe.add(grid); layers.grid = grid;
  // Traces d'observation : orbites polaires futures (100 km ≈ 1,058 R ; exagéré à 1,08 pour la lisibilité) + empreintes au sol.
  const tracks = new THREE.Group(); const passes = 8;
  for (let k = 0; k < passes; k++) {
    const lo = -60 + k * 15; const pts = Array.from({ length: 181 }, (_, i) => polarPoint(lo, i * 2));
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: k === 0 ? 0xf26b1d : 0x7cc4ff, dashSize: 0.04, gapSize: 0.03, transparent: true, opacity: k === 0 ? 0.95 : 0.45 }));
    line.computeLineDistances(); tracks.add(line);
  }
  tracks.add(shell(paint(W, H, (la, lo) => { if (la > -60) return [0, 0, 0, 0]; const inSwath = (((lo + 60) % 15) + 15) % 15 < 2.2 && lo >= -62 && lo <= 47; return inSwath ? [242, 107, 29, Math.round(150 * Math.min(1, (-la - 60) / 10))] : [0, 0, 0, 0]; }), 1.0045));
  const probe = new THREE.Mesh(new THREE.SphereGeometry(0.012, 16, 12), new THREE.MeshBasicMaterial({ color: 0xf26b1d })); tracks.add(probe);
  globe.add(tracks); layers.tracks = tracks;
  layers.names = new THREE.Group();

  // ---- Étiquettes HTML (cratères réels) ----
  labels.innerHTML = '';
  // Les plus grands en premier : ils gardent leur étiquette quand deux noms se chevauchent.
  const tags = [...FEATURES].sort((a, b) => b.d - a.d).map((f) => { const el = document.createElement('div'); el.className = `mx-tag${f.psr ? ' mx-tag--psr' : ''}${f.d > 500 ? ' mx-tag--mare' : ''}`; el.textContent = f.n; labels.appendChild(el); return { f, el, local: llToVec(f.lat, f.lon, 1.01) }; });

  // ---- Interaction : rotation par glisser (inertie), zoom molette / pincement, clavier ----
  let yaw = -Math.PI / 2, pitch = 0.25, vy = 0, vp = 0, targetDist = dist, auto = !reducedMotion, dragging = false;
  const ptrs = new Map<number, { x: number; y: number }>(); let pinch0 = 0; let lastX = 0, lastY = 0;
  canvas.style.touchAction = 'none';
  const onDown = (e: PointerEvent) => { canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); dragging = true; lastX = e.clientX; lastY = e.clientY; auto = false;
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); } };
  const onMove = (e: PointerEvent) => {
    if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) targetDist = THREE.MathUtils.clamp(targetDist * (pinch0 / d), 1.45, 4.5); pinch0 = d; return; }
    if (dragging) { const dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY; vy = dx * 0.0055 * (dist / 3); vp = dy * 0.0055 * (dist / 3); yaw += vy; pitch = THREE.MathUtils.clamp(pitch + vp, -1.5, 1.5); }
    hover.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1); hoverDirty = true;
  };
  const onUp = (e: PointerEvent) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0; if (ptrs.size === 0) dragging = false; };
  const onLeave = () => { hoverDirty = false; onProbe(null); };
  const onWheel = (e: WheelEvent) => { e.preventDefault(); targetDist = THREE.MathUtils.clamp(targetDist * (1 + Math.sign(e.deltaY) * 0.1), 1.45, 4.5); };
  const onKey = (e: KeyboardEvent) => { const k: Record<string, () => void> = { ArrowLeft: () => (yaw -= 0.15), ArrowRight: () => (yaw += 0.15), ArrowUp: () => (pitch = Math.max(-1.5, pitch - 0.15)), ArrowDown: () => (pitch = Math.min(1.5, pitch + 0.15)), '+': () => (targetDist = Math.max(1.45, targetDist * 0.9)), '-': () => (targetDist = Math.min(4.5, targetDist * 1.1)) };
    if (k[e.key]) { e.preventDefault(); auto = false; k[e.key](); } };
  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove); canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('pointerleave', onLeave); canvas.addEventListener('wheel', onWheel, { passive: false }); canvas.addEventListener('keydown', onKey);

  const hover = new THREE.Vector2(); let hoverDirty = false; const ray = new THREE.Raycaster(); let rect = canvas.getBoundingClientRect();
  const resize = () => { rect = canvas.getBoundingClientRect(); const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix(); };
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();

  const clock = new THREE.Clock(); let raf = 0; let alive = true; const qx = new THREE.Quaternion(), qy = new THREE.Quaternion(); const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0);
  const tmp = new THREE.Vector3(); const camDir = new THREE.Vector3(); let frameNo = 0; let pass = 0;
  function frame() {
    if (!alive) return; raf = requestAnimationFrame(frame); if (document.hidden) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!dragging) { yaw += vy; pitch = THREE.MathUtils.clamp(pitch + vp, -1.5, 1.5); vy *= Math.exp(-dt * 3); vp *= Math.exp(-dt * 3); if (auto) yaw += dt * 0.07; }
    qx.setFromAxisAngle(X, pitch); qy.setFromAxisAngle(Y, yaw); globe.quaternion.copy(qx).multiply(qy);
    dist += (targetDist - dist) * (1 - Math.exp(-dt * 8)); camera.position.set(0, 0, dist); camera.lookAt(0, 0, 0);
    // Orbiteur sur la trace active.
    pass += dt * 0.12; probe.position.copy(polarPoint(-60, (pass * 360) % 360));
    // Étiquettes : projection écran, masquées sur la face cachée.
    if (layers.names.visible && (frameNo++ % 2 === 0)) {
      camDir.copy(camera.position).normalize(); const placed: [number, number, number][] = [];
      for (const t of tags) { tmp.copy(t.local).applyQuaternion(globe.quaternion); const facing = tmp.clone().normalize().dot(camDir);
        if (facing < 0.25) { t.el.style.opacity = '0'; continue; }
        const s = tmp.project(camera); const x = ((s.x + 1) / 2) * rect.width, y = ((1 - s.y) / 2) * rect.height; const w = t.f.n.length * 6.2 + 8;
        if (placed.some(([px, py, pw]) => Math.abs(px - x) < (pw + w) / 2 && Math.abs(py - y) < 15)) { t.el.style.opacity = '0'; continue; }
        placed.push([x, y, w]); t.el.style.opacity = String(Math.min(1, (facing - 0.25) * 4));
        t.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -140%)`; }
    }
    if (hoverDirty && frameNo % 3 === 0) {
      ray.setFromCamera(hover, camera); const hit = ray.intersectObject(moon, false)[0];
      if (hit) { const p = globe.worldToLocal(hit.point.clone()).normalize(); const plat = Math.asin(p.y) / D2R; const plon = Math.atan2(-p.z, p.x) / D2R; const psr = psrAt(plat, plon);
        const near = FEATURES.find((f) => angDist(plat, plon, f.lat, f.lon) < Math.max(0.6, f.d / 2 / 30.3));
        onProbe({ lat: plat, lon: plon, tempK: surfaceTemp(plat, plon, psr), hydrogen: hydrogenAt(plat, plon), ice: psr > 0.35, name: near?.n }); }
      else onProbe(null);
    }
    renderer.render(scene, camera);
  }
  frame();
  return {
    setLayers(l) { (Object.keys(layers) as LayerId[]).forEach((k) => { layers[k].visible = !!l[k]; }); labels.style.display = l.names ? '' : 'none'; },
    view(v) { auto = false; vy = vp = 0; ({ near: () => { yaw = -Math.PI / 2; pitch = 0.2; }, far: () => { yaw = Math.PI / 2; pitch = 0.2; }, south: () => { yaw = -Math.PI / 2; pitch = -1.42; targetDist = 1.95; }, north: () => { yaw = -Math.PI / 2; pitch = 1.42; targetDist = 1.95; } })[v](); },
    setAutoRotate(on) { auto = on && !reducedMotion; },
    dispose() {
      alive = false; cancelAnimationFrame(raf); ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('pointerleave', onLeave); canvas.removeEventListener('wheel', onWheel); canvas.removeEventListener('keydown', onKey);
      scene.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); const mt = m.material as THREE.Material | THREE.Material[] | undefined; (Array.isArray(mt) ? mt : mt ? [mt] : []).forEach((x) => { (x as THREE.MeshBasicMaterial).map?.dispose(); x.dispose(); }); });
      relief.dispose(); renderer.dispose(); labels.innerHTML = '';
    },
  };
}
