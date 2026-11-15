import * as THREE from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ORBIT_PRESETS } from '../domain/mission';
import { elementsOf, R_MOON, toCartesian, trueAnomalyAt } from '../domain/orbit';
import { missionSeconds, sceneStore, type SceneProps } from './sceneStore';
import { loadPrefs } from '../domain/preferences';

/** Repère lunaire (z nord) → Three.js (y haut). Unité : 1 = rayon lunaire. */
const toV = (x: number, y: number, z: number) => new THREE.Vector3(x / R_MOON, z / R_MOON, -y / R_MOON);
const ORANGE = 0xf26b1d, INFO = 0x7cc4ff;

function cellTexture(): THREE.Texture {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d')!;
  g.fillStyle = '#0d1a3a'; g.fillRect(0, 0, 256, 128);
  for (let x = 0; x < 256; x += 16) for (let y = 0; y < 128; y += 16) { g.fillStyle = (x + y) % 32 ? '#1b3466' : '#16305e'; g.fillRect(x + 1, y + 1, 14, 14); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function startEngine(canvas: HTMLCanvasElement, reducedMotion: boolean) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x07060f);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.001, 400);
  // Environnement de reflets (feuilles d'or, métal de LRO) sans affecter le fond.
  const pmrem = new THREE.PMREMGenerator(renderer); const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; pmrem.dispose();

  // Étoiles
  const sg = new THREE.BufferGeometry(); const N = 2600; const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(120 + Math.random() * 60); pos.set([v.x, v.y, v.z], i * 3); }
  sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xc9cfff, size: 0.35, sizeAttenuation: true, transparent: true, opacity: 0.85 }));
  scene.add(stars);

  // Lumières : Soleil + remplissage violet (DA)
  const sun = new THREE.DirectionalLight(0xfff4e6, 3.2); sun.position.set(6, 2, 4); scene.add(sun);
  const fill = new THREE.HemisphereLight(0x6a5acd, 0x0b0a14, 0.35); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xff3b30, 0); rim.position.set(-5, -1, -3); scene.add(rim);

  // Lune (texture NASA reprojetée)
  const tex = new THREE.TextureLoader().load('nasa/moon-map.jpg'); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), new THREE.MeshStandardMaterial({ map: tex, bumpMap: tex, bumpScale: 0.6, roughness: 1, metalness: 0 }));
  moon.rotation.y = -Math.PI / 2; scene.add(moon);
  // Halo / mires (DA « KPX »)
  const rings = new THREE.Group();
  for (const [r, o] of [[1.35, 0.18], [1.7, 0.1], [2.2, 0.06]] as const) {
    const g = new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0, 0, r, r).getPoints(160).map((p) => new THREE.Vector3(p.x, p.y, 0)));
    rings.add(new THREE.LineLoop(g, new THREE.LineBasicMaterial({ color: 0xb8b2ff, transparent: true, opacity: o })));
  }
  scene.add(rings);

  // Terre (repère de communications)
  const earth = new THREE.Mesh(new THREE.SphereGeometry(0.55, 48, 32), new THREE.MeshStandardMaterial({ color: 0x3a6fd8, emissive: 0x0a1a40, roughness: 0.7 }));
  earth.position.set(-26, 5, -40); scene.add(earth);
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 24), new THREE.MeshBasicMaterial({ color: 0x7cc4ff, transparent: true, opacity: 0.18, side: THREE.BackSide }));
  earth.add(atmo);

  // Orbite + orbiteur
  const orbitLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: INFO, dashSize: 0.03, gapSize: 0.02, transparent: true, opacity: 0.9 }));
  scene.add(orbitLine);
  const marker = new THREE.Mesh(new THREE.SphereGeometry(0.012, 16, 12), new THREE.MeshBasicMaterial({ color: ORANGE }));
  scene.add(marker);
  const link = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: ORANGE, dashSize: 0.3, gapSize: 0.25, transparent: true, opacity: 0.55 }));
  scene.add(link);
  const transfer = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: INFO, dashSize: 0.4, gapSize: 0.3, transparent: true, opacity: 0.7 }));
  scene.add(transfer);

  const craft = new THREE.Group(); scene.add(craft);
  // Trajectoire de transfert continue (échantillonnée à la position exacte, plus par paliers).
  const transferCurve = new THREE.CubicBezierCurve3(new THREE.Vector3(-26, 5, -40), new THREE.Vector3(-18, 12, -8), new THREE.Vector3(-4, 4, 6), new THREE.Vector3(0, 1.1, 0));
  let shownProgress = 0;
  // Panache du moteur : particules additives qui suivent l'orbiteur pendant le transfert.
  const PLUME = 160; const plumePos = new Float32Array(PLUME * 3); const plumeAge = new Float32Array(PLUME).fill(1);
  const plumeGeo = new THREE.BufferGeometry(); plumeGeo.setAttribute('position', new THREE.BufferAttribute(plumePos, 3));
  const plume = new THREE.Points(plumeGeo, new THREE.PointsMaterial({ color: 0xffa060, size: 0.05, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(plume); let plumeIdx = 0;
  // Liaison Terre : géométrie réutilisée (plus d'allocation à chaque image).
  const linkPos = new Float32Array(6);
  const model = new THREE.Group(); craft.add(model);
  const addons = new THREE.Group(); model.add(addons);
  let lro: THREE.Object3D | null = null; let lroWrap: THREE.Object3D | null = null; let lroScale = 1;
  // ---- Vue éclatée (Atelier, scène 2.2) : une pièce par composant installé ----
  const SUB_COLOR: Record<string, number> = { structure: 0x9aa3b5, power: 0x7cc4ff, comms: 0xe8e8ee, control: 0xb8b2ff, payload: 0xf2b63c, propulsion: 0xc9a227 };
  const SUB_DIR: Record<string, [number, number, number]> = { structure: [0, 0.05, 0], power: [1.0, 0.2, 0], comms: [0, 1.0, 0], control: [-0.95, 0.1, 0.25], payload: [-0.35, -0.72, 0.45], propulsion: [0.45, -0.62, -0.45] };
  const exploded = new THREE.Group(); model.add(exploded);
  const linkMat = new THREE.LineBasicMaterial({ color: 0xb8b2ff, transparent: true, opacity: 0.35 });
  const explodedLinks = new THREE.LineSegments(new THREE.BufferGeometry(), linkMat); exploded.add(explodedLinks);
  let partKey = ''; let explode = 0; let lastPartHit = 0; const partMeshes: THREE.Mesh[] = [];
  function partGeometry(slot: string): THREE.BufferGeometry {
    switch (slot) {
      case 'solar': return new THREE.BoxGeometry(0.46, 0.012, 0.24);
      case 'battery': return new THREE.BoxGeometry(0.16, 0.12, 0.12);
      case 'radio': return new THREE.SphereGeometry(0.13, 28, 10, 0, Math.PI * 2, 0, Math.PI / 3);
      case 'adcs': return new THREE.TorusGeometry(0.07, 0.022, 10, 28);
      case 'obc': return new THREE.BoxGeometry(0.14, 0.05, 0.12);
      case 'engine': return new THREE.ConeGeometry(0.08, 0.18, 24);
      case 'instrument': return new THREE.CylinderGeometry(0.05, 0.065, 0.16, 20);
      default: return new THREE.BoxGeometry(0.3, 0.3, 0.3);
    }
  }
  function buildParts(p: SceneProps) {
    const key = p.parts.map((x) => x.id).join(','); if (key === partKey) return; partKey = key;
    for (const m of partMeshes.splice(0)) { exploded.remove(m); m.geometry.dispose(); (m.material as THREE.Material).dispose(); }
    const count: Record<string, number> = {};
    for (const part of p.parts) {
      const k = count[part.subsystem] = (count[part.subsystem] ?? 0) + 1; const dir = SUB_DIR[part.subsystem] ?? [0, 0, 0];
      const mesh = new THREE.Mesh(partGeometry(part.slot), new THREE.MeshStandardMaterial({ color: SUB_COLOR[part.subsystem] ?? 0xffffff, metalness: 0.55, roughness: 0.4, emissive: 0x000000, envMap: envTex, transparent: true }));
      if (part.slot === 'radio') mesh.rotation.x = Math.PI;
      // Plusieurs composants d'un même sous-système s'étalent en éventail autour de sa direction.
      const spread = (k - 1) * 0.34; const target = new THREE.Vector3(dir[0] + (dir[1] !== 0 ? spread : 0), dir[1] + (dir[0] !== 0 ? -spread * 0.6 : 0), dir[2] + spread * 0.25).multiplyScalar(part.subsystem === 'structure' ? 0 : 0.95);
      mesh.userData = { id: part.id, target }; mesh.visible = false; exploded.add(mesh); partMeshes.push(mesh);
    }
  }
  const draco = new DRACOLoader().setDecoderPath('draco/'); draco.setDecoderConfig({ type: 'wasm' });
  new GLTFLoader().setDRACOLoader(draco).load('nasa/lro.glb', (g) => {
    lro = g.scene; const box = new THREE.Box3().setFromObject(lro); const size = box.getSize(new THREE.Vector3()); const c = box.getCenter(new THREE.Vector3());
    lro.position.sub(c); const s = 1 / Math.max(size.x, size.y, size.z); const wrap = new THREE.Group(); wrap.add(lro); wrap.scale.setScalar(s); lroWrap = wrap; lroScale = s;
    wrap.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined; if (m && 'envMap' in m) { m.envMap = envTex; m.envMapIntensity = 0.9; m.needsUpdate = true; } });
    model.add(wrap);
  });
  const cells = cellTexture();
  const wingMat = new THREE.MeshStandardMaterial({ map: cells, color: 0x9fb4ff, metalness: 0.1, roughness: 0.5, emissive: 0x000000, envMap: envTex, envMapIntensity: 0.25 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x9aa3b5, metalness: 0.8, roughness: 0.4, emissive: 0x000000, envMap: envTex });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 1, roughness: 0.35, emissive: 0x000000, envMap: envTex });
  let addonKey = '';
  function buildAddons(p: SceneProps) {
    const key = JSON.stringify(p.addons); if (key === addonKey) return; addonKey = key;
    addons.clear();
    for (let i = 0; i < p.addons.wings; i++) {
      const w = new THREE.Group(); w.name = 'power';
      const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.16), frameMat); boom.rotation.z = Math.PI / 2; boom.position.x = 0.08; w.add(boom);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.004, 0.2), wingMat); panel.position.x = 0.37; panel.rotation.x = 0.35; w.add(panel);
      w.position.set(i ? -0.3 : 0.3, 0.12, 0.05); if (i) w.rotation.y = Math.PI; addons.add(w);
    }
    if (p.addons.radar) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.14), new THREE.MeshStandardMaterial({ color: 0x2a2d35, metalness: 0.4, roughness: 0.6 })); r.name = 'payload'; r.position.set(0, -0.42, 0.12); addons.add(r); }
    if (p.addons.dish !== 'none') {
      const R = p.addons.dish === 'large' ? 0.16 : 0.1;
      const d = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 12, 0, Math.PI * 2, 0, Math.PI / 3.2), new THREE.MeshStandardMaterial({ color: 0xe8e8ee, metalness: 0.3, roughness: 0.5, side: THREE.DoubleSide }));
      d.name = 'comms'; d.rotation.x = Math.PI; d.position.set(-0.1, 0.5, -0.1); addons.add(d);
    }
    if (p.addons.tanks) { const t = new THREE.Mesh(new THREE.SphereGeometry(0.07, 20, 14), goldMat); t.name = 'propulsion'; t.position.set(0.12, -0.32, -0.16); addons.add(t); }
  }

  // Interaction : parallaxe et suivi du pointeur, survol de l'orbiteur
  const pointer = new THREE.Vector2(0, 0); const target = new THREE.Vector2(0, 0); const ray = new THREE.Raycaster();
  const onMove = (e: PointerEvent) => { target.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1); };
  window.addEventListener('pointermove', onMove, { passive: true });

  let orbitKey = '';
  function buildOrbit(p: SceneProps) {
    const o = p.orbit ?? ORBIT_PRESETS.polar; const key = JSON.stringify(o); if (key === orbitKey) return; orbitKey = key;
    const k = elementsOf(o); const pts: THREE.Vector3[] = [];
    for (let ta = 0; ta <= 360; ta += 2) { const s = toCartesian({ ...k, ta }); pts.push(toV(s.x, s.y, s.z)); }
    orbitLine.geometry.dispose(); orbitLine.geometry = new THREE.BufferGeometry().setFromPoints(pts); orbitLine.computeLineDistances();
  }
  {
    const pts = transferCurve.getPoints(240);
    transfer.geometry = new THREE.BufferGeometry().setFromPoints(pts); transfer.computeLineDistances();
  }

  const resize = () => { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();

  const camPos = new THREE.Vector3(0, 0.4, 4.2); const camLook = new THREE.Vector3();
  const clock = new THREE.Clock(); let raf = 0; let running = true;
  const highlightMats = [wingMat, frameMat, goldMat];

  let frameNo = 0; let hit = false; let fpsFrames = 0; let fpsTime = 0;
  // Préférences (P04) : qualité 3D et limite d'images par seconde, relues chaque seconde.
  let prefs = loadPrefs(); const dprFor = () => (prefs.quality === 'low' ? 1 : prefs.quality === 'high' ? Math.min(window.devicePixelRatio, 2) : Math.min(window.devicePixelRatio, 1.75));
  let maxDpr = dprFor(); let dpr = maxDpr; renderer.setPixelRatio(dpr); let sinceRender = 0;
  function frame() {
    if (!running) return; raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    if (sceneStore.get().view === 'hidden') { canvas.style.visibility = 'hidden'; clock.getDelta(); return; } // une autre vue 3D occupe l'écran
    canvas.style.visibility = '';
    const rawDt = clock.getDelta(); sinceRender += rawDt;
    if (prefs.fpsCap === 30 && sinceRender < 1 / 31) return; // économie : une image sur deux
    const dt = Math.min(sinceRender, 0.05); sinceRender = 0; const t = clock.elapsedTime; const p = sceneStore.get();
    const motion = reducedMotion ? 0 : 1;
    const sm = (r: number) => 1 - Math.pow(1 - r, dt * 60); // lissage indépendant de la cadence
    pointer.lerp(target, sm(0.06) * motion);
    buildAddons(p); buildOrbit(p);

    const k = elementsOf(p.orbit ?? ORBIT_PRESETS.polar); const ta = trueAnomalyAt(k, missionSeconds());
    const sv = toCartesian({ ...k, ta }); const craftPos = toV(sv.x, sv.y, sv.z);
    const crisis = p.mood === 'crisis'; const dark = p.mood === 'silence';
    sun.intensity = THREE.MathUtils.lerp(sun.intensity, dark ? 0.35 : crisis ? 1.6 : p.mood === 'legacy' ? 3.8 : p.mood === 'fragment' ? 2.4 : 3.2, 0.05);
    rim.intensity = THREE.MathUtils.lerp(rim.intensity, crisis ? 2.2 + Math.sin(t * 3) * 0.6 : 0, 0.08);
    fill.intensity = dark ? 0.12 : 0.35;
    moon.rotation.y += dt * 0.01 * motion; rings.rotation.z += dt * 0.02 * motion;

    let desiredPos: THREE.Vector3; let look: THREE.Vector3;
    const showOrbit = p.view === 'orbit' || p.view === 'ending';
    orbitLine.visible = showOrbit || p.view === 'ambient'; marker.visible = showOrbit; link.visible = showOrbit && p.mood !== 'silence';
    transfer.visible = p.view === 'transfer'; rings.visible = p.view !== 'orbiter'; earth.visible = true;

    if (p.view === 'orbiter') {
      craft.position.set(0.15, 1.18, 0.6); craft.scale.setScalar(0.5);
      moon.position.set(0, -0.2, -0.6);
      desiredPos = new THREE.Vector3(0.15 + pointer.x * 0.3, 1.36 + pointer.y * 0.18, 2.35); look = new THREE.Vector3(0.15, 1.18, 0.6);
      model.rotation.y = THREE.MathUtils.lerp(model.rotation.y, t * 0.12 * motion + pointer.x * 0.9, 0.08);
      model.rotation.x = THREE.MathUtils.lerp(model.rotation.x, -pointer.y * 0.35, 0.08);
      // Vue éclatée : cadrage fixe (une pièce visée ne doit pas se dérober sous la souris).
      if (p.exploded) { desiredPos.set(0.15, 1.22, 3.25); look.set(0.15, 1.02, 0.6); model.rotation.y = THREE.MathUtils.lerp(model.rotation.y, 0.55, 0.06); model.rotation.x = THREE.MathUtils.lerp(model.rotation.x, -0.18, 0.06); }
    } else if (p.view === 'transfer') {
      moon.position.set(0, 0, 0);
      shownProgress += (p.progress - shownProgress) * (1 - Math.exp(-dt * 1.6)); // glissement continu entre les phases
      const u = THREE.MathUtils.clamp(shownProgress, 0, 1);
      craft.position.copy(transferCurve.getPointAt(u)); craft.scale.setScalar(0.35);
      const tangent = transferCurve.getTangentAt(u);
      const back = craft.position.clone().addScaledVector(tangent, -0.18);
      for (let k = 0; k < 3; k++) { const j = plumeIdx++ % PLUME; plumeAge[j] = 0; plumePos.set([back.x + (Math.random() - 0.5) * 0.04, back.y + (Math.random() - 0.5) * 0.04, back.z + (Math.random() - 0.5) * 0.04], j * 3); }
      desiredPos = craft.position.clone().add(new THREE.Vector3(1.6 + pointer.x * 0.4, 0.6 + pointer.y * 0.3, 2.2)); look = craft.position.clone();
      model.rotation.y += dt * 0.4 * motion;
    } else {
      moon.position.set(0, 0, 0);
      craft.position.copy(craftPos); craft.scale.setScalar(p.view === 'ending' ? 0.09 : 0.06); marker.position.copy(craftPos);
      model.rotation.y = THREE.MathUtils.lerp(model.rotation.y, pointer.x * 1.2 + t * 0.2 * motion, 0.05);
      if (dark) { model.rotation.x += dt * 0.35; model.rotation.z += dt * 0.21; } else model.rotation.x = THREE.MathUtils.lerp(model.rotation.x, 0, 0.05);
      const dist = p.view === 'ambient' ? 4.6 : p.view === 'ending' ? 3.0 : 3.6;
      desiredPos = new THREE.Vector3(pointer.x * 0.9 + (p.view === 'ambient' ? 1.1 : 0.4), 0.55 + pointer.y * 0.5, dist);
      look = new THREE.Vector3(p.view === 'ambient' ? 0.5 : 0.25, 0, 0);
      linkPos.set([craftPos.x, craftPos.y, craftPos.z, earth.position.x, earth.position.y, earth.position.z]);
      if (!link.geometry.getAttribute('position')) link.geometry.setAttribute('position', new THREE.BufferAttribute(linkPos, 3));
      link.geometry.getAttribute('position').needsUpdate = true; link.computeLineDistances();
      (link.material as THREE.LineDashedMaterial).opacity = p.mood === 'last_signal' ? 0.25 + 0.6 * Math.abs(Math.sin(t * 1.5)) : 0.5;
    }
    camPos.lerp(desiredPos, sm(0.05)); camLook.lerp(look, sm(0.08)); camera.position.copy(camPos); camera.lookAt(camLook);
    stars.rotation.y = pointer.x * 0.03; stars.rotation.x = -pointer.y * 0.02;

    // Survol + surbrillance de sous-système
    // Survol testé une image sur trois (le lancer de rayon sur le modèle LRO est coûteux).
    if ((frameNo++ % 3) === 0) { ray.setFromCamera(pointer, camera); hit = lro ? ray.intersectObject(craft, true).length > 0 : false; sceneStore.setHovered(hit); }
    canvas.style.cursor = hit ? 'pointer' : '';
    const pulse = 0.35 + 0.35 * Math.sin(t * 4);
    for (const m of highlightMats) m.emissive.setHex(0x000000);
    addons.children.forEach((c) => c.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (m?.emissive) m.emissive.setRGB(c.name === p.highlight ? pulse : hit ? 0.06 : 0, c.name === p.highlight ? pulse * 0.42 : hit ? 0.03 : 0, 0); }));
    // Vue éclatée : écartement progressif des pièces, liens vers le corps, survol et mise en avant.
    buildParts(p); const wantExplode = p.view === 'orbiter' && p.exploded ? 1 : 0;
    explode += (wantExplode - explode) * (1 - Math.exp(-dt * 5));
    addons.visible = explode < 0.5;
    if (lroWrap) lroWrap.scale.setScalar(lroScale * (1 - 0.45 * explode));
    const linkPts: number[] = []; let hoverId: string | null = null;
    for (const m of partMeshes) {
      m.visible = explode > 0.02; m.position.copy(m.userData.target as THREE.Vector3).multiplyScalar(explode);
      (m.material as THREE.MeshStandardMaterial).opacity = Math.min(1, explode * 1.4);
      linkPts.push(0, 0, 0, m.position.x, m.position.y, m.position.z);
    }
    explodedLinks.visible = explode > 0.05; explodedLinks.geometry.setAttribute('position', new THREE.Float32BufferAttribute(linkPts, 3));
    if (explode > 0.6 && frameNo % 3 === 1) {
      ray.setFromCamera(target, camera); const h = ray.intersectObjects(partMeshes, false)[0];
      if (h) { lastPartHit = t; hoverId = h.object.userData.id as string; const sp = h.object.getWorldPosition(new THREE.Vector3()).project(camera);
        sceneStore.setPartHover({ id: hoverId, x: ((sp.x + 1) / 2) * canvas.clientWidth, y: ((1 - sp.y) / 2) * canvas.clientHeight }); }
      else if (t - lastPartHit > 0.25) sceneStore.setPartHover(null); // tolérance : pièces fines vues par la tranche
    } else if (explode <= 0.6 && sceneStore.getPartHover()) sceneStore.setPartHover(null);
    const focus = sceneStore.getPartHover()?.id ?? p.partFocus; const glow = 0.35 + 0.3 * Math.sin(t * 5);
    for (const m of partMeshes) { const on = m.userData.id === focus; (m.material as THREE.MeshStandardMaterial).emissive.setRGB(on ? glow : 0, on ? glow * 0.45 : 0, 0); m.scale.setScalar(on ? 1.18 : 1); }
    canvas.style.cursor = explode > 0.6 && sceneStore.getPartHover() ? 'pointer' : canvas.style.cursor;
    // Panache : vieillissement des particules (visible seulement pendant le transfert).
    plume.visible = p.view === 'transfer';
    if (plume.visible) { for (let j = 0; j < PLUME; j++) { plumeAge[j] = Math.min(1, plumeAge[j] + dt * 1.4); if (plumeAge[j] >= 1) plumePos[j * 3 + 1] = 1e4; } plumeGeo.getAttribute('position').needsUpdate = true; }
    else if (p.view !== 'transfer') shownProgress = p.progress;
    renderer.render(scene, camera);
    // Résolution adaptative : vise 60 images/s ; baisse la densité de pixels si l'appareil peine.
    fpsFrames++; fpsTime += dt;
    if (fpsTime > 1) { const fps = fpsFrames / fpsTime; fpsFrames = 0; fpsTime = 0; prefs = loadPrefs(); const m = dprFor(); if (m !== maxDpr) { maxDpr = m; dpr = Math.min(dpr, m); if (prefs.quality !== 'auto') dpr = m; renderer.setPixelRatio(dpr); resize(); }
      if (prefs.quality !== 'auto') { /* qualité fixée par le joueur */ }
      else if (fps < 48 && dpr > 1) { dpr = Math.max(1, dpr - 0.25); renderer.setPixelRatio(dpr); resize(); }
      else if (fps > 58 && dpr < maxDpr) { dpr = Math.min(maxDpr, dpr + 0.25); renderer.setPixelRatio(dpr); resize(); } }
  }
  frame();
  return () => {
    running = false; cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('pointermove', onMove);
    scene.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); const mt = m.material as THREE.Material | THREE.Material[] | undefined; (Array.isArray(mt) ? mt : mt ? [mt] : []).forEach((x) => x.dispose()); });
    tex.dispose(); cells.dispose(); envTex.dispose(); draco.dispose(); renderer.dispose();
  };
}
