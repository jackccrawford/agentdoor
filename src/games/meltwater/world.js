// Meltwater — the world in three.js. Snowfield sections recycled ahead of the drop, rocks as
// instances, the drop and its wet wake, a low warm sun, far ridges, drifting snow. Everything is
// generated from course.js, so what you see is what you hit. (5 Sep 2026, Droplet)
import * as T from 'three';
import { SECTION, heightAt, channel, channelHalfWidth, obstaclesFor, fbm, hash } from './course.js';
import { radiusOf } from './physics.js';

const WIDTH = 130, SEG_X = 52, SEG_D = 100, ALIVE = 5, ROCKS_PER = 40;
const SKY_TOP = new T.Color('#6f8ea0'), SKY_HORIZON = new T.Color('#e6dcc8'), FOG = '#b9cad2';
const SNOW = new T.Color('#f2f6fa'), SNOW_SHADE = new T.Color('#c4d4de'), BED = new T.Color('#8fb7cf'), BED_DEEP = new T.Color('#6f9bb6'), ICE = new T.Color('#d6f0fb');

export function createWorld(container) {
  const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', 'The snowfield. Arrow keys steer, down brakes, P pauses.');
  container.appendChild(renderer.domElement);

  const scene = new T.Scene();
  scene.fog = new T.FogExp2(FOG, 0.0021);
  const camera = new T.PerspectiveCamera(62, 1, 0.1, 3000);

  // Sky: a gradient dome that follows the camera.
  const domeGeo = new T.SphereGeometry(1400, 24, 12);
  const domeCol = [];
  const pos = domeGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const t = Math.max(0, Math.min(1, (pos.getY(i) / 1400 + 0.15) / 0.9));
    const c = SKY_HORIZON.clone().lerp(SKY_TOP, Math.pow(t, 0.7));
    domeCol.push(c.r, c.g, c.b);
  }
  domeGeo.setAttribute('color', new T.Float32BufferAttribute(domeCol, 3));
  const dome = new T.Mesh(domeGeo, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false }));
  scene.add(dome);

  scene.add(new T.HemisphereLight(0xcfe0ee, 0x6e8291, 1.0));
  const sun = new T.DirectionalLight(0xfff0dc, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  // A short shadow reach and a generous bias: the depth range a shadow map has to resolve is what
  // turns into self-shadowing on GPUs with fewer depth bits.
  Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 20, far: 260 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.12;
  scene.add(sun, sun.target);

  // Far ridges: a ring of mountains generated from the same noise as the site's hero, following the drop.
  const farGeo = new T.PlaneGeometry(2600, 2600, 90, 90);
  farGeo.rotateX(-Math.PI / 2);
  {
    const p = farGeo.attributes.position, cols = [];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z);
      const ring = Math.pow(Math.max(0, Math.min(1, (r - 380) / 800)), 1.3);
      const ridges = Math.pow(1 - Math.abs(2 * fbm(x * 0.0021, z * 0.0021, 41, 5) - 1), 1.8);
      const y = ring * (60 + ridges * 260) - 30;
      p.setY(i, y);
      const c = y > 150 ? SNOW.clone() : new T.Color('#5f7683').lerp(new T.Color('#a7b9c2'), Math.min(1, Math.max(0, y) / 150));
      cols.push(c.r, c.g, c.b);
    }
    farGeo.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
    farGeo.computeVertexNormals();
  }
  const far = new T.Mesh(farGeo, new T.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
  scene.add(far);

  // Snowfield sections.
  const groundMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 });
  const rockGeo = new T.DodecahedronGeometry(1, 1);
  const rockMat = new T.MeshStandardMaterial({ color: '#6b6f6a', roughness: 0.95, flatShading: true });
  const sections = [];
  const tmp = new T.Object3D();
  function buildSection(entry, n) {
    entry.n = n;
    const g = entry.mesh.geometry, p = g.attributes.position, c = g.attributes.color;
    const items = obstaclesFor(n);
    entry.items = items;
    let k = 0;
    for (let j = 0; j <= SEG_D; j++) {
      const d = n * SECTION + (j / SEG_D) * SECTION;
      const cx = channel(d), w = channelHalfWidth(d);
      for (let i = 0; i <= SEG_X; i++) {
        const x = -WIDTH / 2 + (i / SEG_X) * WIDTH;
        const y = heightAt(x, d);
        p.setXYZ(k, x, y, -d);
        const r = Math.abs(x - cx) / w;
        let col;
        if (r < 1) col = BED.clone().lerp(BED_DEEP, 1 - r);
        else col = SNOW.clone().lerp(SNOW_SHADE, 0.25 * fbm(x * 0.05, d * 0.05, 9, 3) + Math.max(0, Math.min(0.5, (Math.abs(x) - 44) / 30)));
        for (const o of items) if (o.type === 'ice' && ((x - o.x) / o.rx) ** 2 + ((d - o.d) / o.rz) ** 2 < 1) col = ICE.clone();
        c.setXYZ(k, col.r, col.g, col.b);
        k++;
      }
    }
    p.needsUpdate = true; c.needsUpdate = true;
    g.computeVertexNormals();
    g.computeBoundingSphere();
    let ri = 0;
    for (const o of items) {
      if (o.type !== 'rock' || ri >= ROCKS_PER) continue;
      tmp.position.set(o.x, heightAt(o.x, o.d) + o.radius * 0.35, -o.d);
      tmp.rotation.set(o.tilt, o.rotation, o.tilt * 0.5);
      tmp.scale.set(o.radius * 1.15, o.radius * 0.9, o.radius * 1.05);
      tmp.updateMatrix();
      entry.rocks.setMatrixAt(ri++, tmp.matrix);
    }
    entry.rocks.count = ri;
    entry.rocks.instanceMatrix.needsUpdate = true;
    entry.rocks.computeBoundingSphere();
  }
  for (let s = 0; s < ALIVE; s++) {
    const geo = new T.BufferGeometry();
    const verts = (SEG_X + 1) * (SEG_D + 1);
    geo.setAttribute('position', new T.BufferAttribute(new Float32Array(verts * 3), 3));
    geo.setAttribute('color', new T.BufferAttribute(new Float32Array(verts * 3), 3));
    const idx = [];
    for (let j = 0; j < SEG_D; j++) for (let i = 0; i < SEG_X; i++) {
      // Counter-clockwise seen from above (+y): x grows with i, z shrinks with j (z = -d).
      const a = j * (SEG_X + 1) + i, b = a + 1, c2 = a + SEG_X + 1, d2 = c2 + 1;
      idx.push(a, b, c2, b, d2, c2);
    }
    geo.setIndex(idx);
    const mesh = new T.Mesh(geo, groundMat);
    mesh.receiveShadow = true;
    const rocks = new T.InstancedMesh(rockGeo, rockMat, ROCKS_PER);
    rocks.castShadow = true; rocks.receiveShadow = true;
    scene.add(mesh, rocks);
    const entry = { n: -1, mesh, rocks, items: [] };
    sections.push(entry);
    buildSection(entry, s);
  }
  function recycle(d) {
    const first = Math.max(0, Math.floor(d / SECTION) - 1);
    for (let s = 0; s < ALIVE; s++) {
      const want = first + s;
      if (!sections.some((e) => e.n === want)) {
        const stale = sections.find((e) => e.n < first || e.n >= first + ALIVE);
        if (stale) buildSection(stale, want);
      }
    }
  }

  // The drop and its wake.
  const drop = new T.Mesh(new T.SphereGeometry(1, 32, 24), new T.MeshStandardMaterial({ color: '#cfe8fb', roughness: 0.08, metalness: 0.05, emissive: '#3b6f8f', emissiveIntensity: 0.18 }));
  drop.castShadow = true;
  scene.add(drop);
  const WAKE = 48;
  const wakeGeo = new T.BufferGeometry();
  wakeGeo.setAttribute('position', new T.BufferAttribute(new Float32Array(WAKE * 2 * 3), 3));
  const wakeIdx = [];
  for (let i = 0; i < WAKE - 1; i++) { const a = i * 2; wakeIdx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  wakeGeo.setIndex(wakeIdx);
  const wake = new T.Mesh(wakeGeo, new T.MeshBasicMaterial({ color: '#7fa9c4', transparent: true, opacity: 0.55, depthWrite: false, side: T.DoubleSide }));
  scene.add(wake);
  const wakePts = [];

  // Drifting snow around the camera.
  const N_FLAKES = 500;
  const flakeGeo = new T.BufferGeometry();
  const flakePos = new Float32Array(N_FLAKES * 3);
  for (let i = 0; i < N_FLAKES; i++) { flakePos[i * 3] = (hash(i, 1) - 0.5) * 60; flakePos[i * 3 + 1] = hash(i, 2) * 20; flakePos[i * 3 + 2] = (hash(i, 3) - 0.5) * 60; }
  flakeGeo.setAttribute('position', new T.BufferAttribute(flakePos, 3));
  const flakes = new T.Points(flakeGeo, new T.PointsMaterial({ color: '#ffffff', size: 0.12, transparent: true, opacity: 0.8, depthWrite: false }));
  scene.add(flakes);

  let quality = 'auto', width = 1, height = 1;
  function applyQuality(q) {
    quality = q;
    const dpr = Math.min(devicePixelRatio || 1, q === 'high' ? 2 : q === 'low' ? 1 : 1.5);
    renderer.setPixelRatio(dpr);
    renderer.shadowMap.enabled = q !== 'low';
    sun.castShadow = q !== 'low';
    sun.shadow.mapSize.set(q === 'high' ? 2048 : 1024, q === 'high' ? 2048 : 1024);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    groundMat.needsUpdate = true;
  }
  function resize() {
    width = container.clientWidth || innerWidth; height = container.clientHeight || innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height; camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();
  applyQuality('auto');

  const camPos = new T.Vector3(), camLook = new T.Vector3(), dropPos = new T.Vector3();
  let camX = channel(0), sway = 0;
  function draw(run, mode, dt, motion = true, time = 0) {
    recycle(run.d);
    const r = radiusOf(run);
    const y = heightAt(run.x, run.d) + r * 0.85;
    dropPos.set(run.x, y, -run.d);
    drop.position.copy(dropPos);
    drop.scale.setScalar(r);
    const speed = Math.hypot(run.vx, run.vd);
    drop.scale.z *= 1 + Math.min(0.5, speed * 0.02);
    drop.scale.y *= 1 - Math.min(0.25, speed * 0.01);

    if (mode === 'running') {
      if (!wakePts.length || wakePts[wakePts.length - 1].distanceTo(dropPos) > 0.6) {
        wakePts.push(dropPos.clone());
        if (wakePts.length > WAKE) wakePts.shift();
      }
    }
    if (mode === 'intro' && wakePts.length) wakePts.length = 0;
    {
      const wp = wakeGeo.attributes.position;
      for (let i = 0; i < WAKE; i++) {
        const p = wakePts[Math.min(i, wakePts.length - 1)] ?? dropPos;
        const half = wakePts.length ? 0.18 + 0.5 * r * (i / WAKE) : 0;
        wp.setXYZ(i * 2, p.x - half, p.y - r * 0.7 + 0.04, p.z);
        wp.setXYZ(i * 2 + 1, p.x + half, p.y - r * 0.7 + 0.04, p.z);
      }
      wp.needsUpdate = true;
      wakeGeo.computeBoundingSphere();
    }

    // Camera: a chase from behind and above, easing toward the drop, with a little sway at speed.
    const k = 1 - Math.exp(-4 * dt);
    if (mode === 'intro') {
      camX = channel(0);
      camPos.set(channel(0) - 7, heightAt(channel(0), 0) + 4.5, 9);
      camLook.set(channel(40), heightAt(channel(40), 40) - 2, -60);
    } else {
      camX += (run.x - camX) * k;
      sway += ((motion ? Math.sin(time * 1.7) * Math.min(1, speed / 20) * 0.25 : 0) - sway) * k;
      const back = 6.5 + Math.min(4, speed * 0.15), up = 2.6 + Math.min(1.5, speed * 0.05);
      const target = new T.Vector3(camX + sway, heightAt(camX, run.d - back) + up, -(run.d - back));
      camPos.lerp(target, k);
      camLook.lerp(new T.Vector3(run.x, y + 0.4, -(run.d + 9)), k);
    }
    camera.position.copy(camPos);
    camera.lookAt(camLook);

    sun.position.set(camPos.x - 120, camPos.y + 70, camPos.z + 40);
    sun.target.position.copy(dropPos);
    sun.target.updateMatrixWorld();
    dome.position.copy(camPos);
    far.position.set(dropPos.x, dropPos.y - 60, dropPos.z);
    flakes.position.set(camPos.x, camPos.y - 8, camPos.z - 20);
    flakes.rotation.y = time * 0.02;
    flakes.material.opacity = motion ? 0.8 : 0.4;

    renderer.render(scene, camera);
  }

  function obstacles() {
    const out = [];
    for (const e of sections) for (const o of e.items) out.push(o);
    return out;
  }
  function reset() { wakePts.length = 0; recycle(0); }

  return { canvas: renderer.domElement, draw, obstacles, reset, resize, quality: applyQuality, get qualityName() { return quality; } };
}
