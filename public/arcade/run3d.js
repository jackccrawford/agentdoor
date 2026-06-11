/* Dawn Patrol — a dawn carving game in WebGL.
   Three.js r158, zero other deps. Physics, light, and sound tuned by hand. */
(function(){
"use strict";

/* ================= renderer / scene ================= */
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8a7d9e);
scene.fog = new THREE.Fog(0xC9A98F, 60, 340);

const camera = new THREE.PerspectiveCamera(62, innerWidth/innerHeight, .1, 1200);
camera.position.set(0, 7.5, 12);

addEventListener("resize", () => {
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* ================= dawn light ================= */
const hemi = new THREE.HemisphereLight(0xbcd0ff, 0xe8eef8, .55);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffd9a0, 2.2);
sun.position.set(-60, 26, -40);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -90; sun.shadow.camera.right = 90;
sun.shadow.camera.top = 90;   sun.shadow.camera.bottom = -90;
sun.shadow.camera.far = 400;
sun.shadow.bias = -0.0006;
scene.add(sun);
scene.add(sun.target);

/* sky: big gradient dome (shader-free: vertex-colored sphere) */
(function sky(){
  const g = new THREE.SphereGeometry(900, 24, 12);
  const cols = []; const pos = g.attributes.position;
  const top = new THREE.Color(0x2A3357), mid = new THREE.Color(0x9a6f86), low = new THREE.Color(0xFFC56F);
  for (let i = 0; i < pos.count; i++){
    const y = pos.getY(i) / 900;
    const c = y > .25 ? top.clone().lerp(mid, (1-y)) : mid.clone().lerp(low, Math.min(1, (.25-y)*2.2));
    cols.push(c.r, c.g, c.b);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
  const m = new THREE.MeshBasicMaterial({vertexColors:true, side:THREE.BackSide, fog:false});
  scene.add(new THREE.Mesh(g, m));
  // the sun disc
  const disc = new THREE.Mesh(new THREE.CircleGeometry(26, 32),
    new THREE.MeshBasicMaterial({color:0xFFE9C4, fog:false, transparent:true, opacity:.95}));
  disc.position.set(-380, 60, -700); disc.lookAt(0,0,0);
  scene.add(disc);
  const halo = new THREE.Mesh(new THREE.CircleGeometry(95, 32),
    new THREE.MeshBasicMaterial({color:0xFFC56F, fog:false, transparent:true, opacity:.22}));
  halo.position.set(-380, 60, -699.5); halo.lookAt(0,0,0);
  scene.add(halo);
})();

/* distant peaks (unlit silhouettes in the fog) */
(function peaks(){
  const m1 = new THREE.MeshBasicMaterial({color:0x54618C});
  const m2 = new THREE.MeshBasicMaterial({color:0x6F7BA6});
  for (let i = 0; i < 9; i++){
    const h = 90 + Math.random()*140, r = 90 + Math.random()*120;
    const p = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5), i % 2 ? m1 : m2);
    p.position.set(-500 + i * 130 + Math.random()*60, h/2 - 14, -560 - (i%3)*90);
    scene.add(p);
  }
})();

/* ================= ground (recycled chunks, gentle noise) ================= */
const CHUNK_L = 260, CHUNK_W = 240, CHUNKS = 3;
const groundMat = new THREE.MeshStandardMaterial({color:0xf3f0f6, roughness:.93, metalness:0});
const chunks = [];
function makeChunk(zOff){
  const g = new THREE.PlaneGeometry(CHUNK_W, CHUNK_L, 48, 52);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++){
    const x = pos.getX(i), y = pos.getY(i);
    const lump = Math.sin(x*.07 + y*.05)*0.55 + Math.sin(x*.16 - y*.09)*0.3 + Math.sin(y*.21)*0.22;
    pos.setZ(i, lump * (Math.abs(x) > 18 ? 1 : .35)); // groomed corridor down the middle
  }
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, groundMat);
  mesh.rotation.x = -Math.PI/2;
  mesh.position.z = zOff;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}
for (let i = 0; i < CHUNKS; i++) chunks.push(makeChunk(-i * CHUNK_L + 60));

/* ================= instanced forest / rocks ================= */
const dummy = new THREE.Object3D();
const N_TREE = 260, N_ROCK = 46;
const trunkMat = new THREE.MeshStandardMaterial({color:0x6B4A33, roughness:.9});
const pineMat  = new THREE.MeshStandardMaterial({color:0x24584a, roughness:.85});
const pineMat2 = new THREE.MeshStandardMaterial({color:0x2E6B57, roughness:.85});
const rockMat  = new THREE.MeshStandardMaterial({color:0x8B93A8, roughness:.8});

const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(.28,.4,2.2,6), trunkMat, N_TREE);
const pinesA = new THREE.InstancedMesh(new THREE.ConeGeometry(2.0,3.6,7), pineMat, N_TREE);
const pinesB = new THREE.InstancedMesh(new THREE.ConeGeometry(1.45,3.0,7), pineMat2, N_TREE);
const rocks  = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1.15,0), rockMat, N_ROCK);
[trunks, pinesA, pinesB, rocks].forEach(im => {
  im.castShadow = true; im.receiveShadow = true;
  im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(im);
});

const trees = [], rockL = [];
function placeTree(i, z){
  const lane = Math.random();
  const x = lane < .80
    ? (Math.random() < .5 ? -1 : 1) * (16 + Math.random()*36)   // forest edges
    : (Math.random()*2-1) * 15;                                  // corridor intruders
  const s = .8 + Math.random()*1.1;
  trees[i] = {x, z, s};
}
function placeRock(i, z){
  rockL[i] = {x:(Math.random()*2-1)*14, z, s:.5+Math.random()*1.1, r:Math.random()*6.3};
}
for (let i = 0; i < N_TREE; i++) placeTree(i, -20 - Math.random()*CHUNK_L*CHUNKS);
for (let i = 0; i < N_ROCK; i++) placeRock(i, -40 - Math.random()*CHUNK_L*CHUNKS);

function writeInstances(){
  for (let i = 0; i < N_TREE; i++){
    const t = trees[i];
    dummy.position.set(t.x, 1.1*t.s, t.z); dummy.scale.setScalar(t.s); dummy.rotation.set(0,0,0);
    dummy.updateMatrix(); trunks.setMatrixAt(i, dummy.matrix);
    dummy.position.set(t.x, (2.2+1.4)*t.s, t.z); dummy.updateMatrix(); pinesA.setMatrixAt(i, dummy.matrix);
    dummy.position.set(t.x, (2.2+3.2)*t.s, t.z); dummy.updateMatrix(); pinesB.setMatrixAt(i, dummy.matrix);
  }
  for (let i = 0; i < N_ROCK; i++){
    const r = rockL[i];
    dummy.position.set(r.x, .55*r.s, r.z); dummy.scale.setScalar(r.s); dummy.rotation.set(0, r.r, 0);
    dummy.updateMatrix(); rocks.setMatrixAt(i, dummy.matrix);
  }
  trunks.instanceMatrix.needsUpdate = true;
  pinesA.instanceMatrix.needsUpdate = true;
  pinesB.instanceMatrix.needsUpdate = true;
  rocks.instanceMatrix.needsUpdate = true;
}
writeInstances();

/* ================= gates ================= */
const GATES = 7, GATE_GAP = 7.5;
const poleG = new THREE.CylinderGeometry(.07,.07,2.6,6);
const poleM = new THREE.MeshStandardMaterial({color:0xE8EDF5, roughness:.6});
const flagClay = new THREE.MeshStandardMaterial({color:0xE2603F, side:THREE.DoubleSide, roughness:.7});
const flagTeal = new THREE.MeshStandardMaterial({color:0x2A93A6, side:THREE.DoubleSide, roughness:.7});
const flagHit  = new THREE.MeshStandardMaterial({color:0x9DC79B, side:THREE.DoubleSide, roughness:.7});
const gateList = [];
function makeGate(z){
  const grp = new THREE.Group();
  const flags = [];
  for (let s = -1; s <= 1; s += 2){
    const pole = new THREE.Mesh(poleG, poleM);
    pole.position.set(s*GATE_GAP/2, 1.3, 0); pole.castShadow = true;
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(1.15,.7), s < 0 ? flagClay : flagTeal);
    fl.position.set(s*GATE_GAP/2 + s*.6, 2.25, 0); fl.castShadow = true;
    grp.add(pole, fl); flags.push(fl);
  }
  grp.position.set((Math.random()*2-1)*11, 0, z);
  grp.userData = {hit:false, flags};
  scene.add(grp); gateList.push(grp);
}
for (let i = 0; i < GATES; i++) makeGate(-90 - i * 110 - Math.random()*40);

/* ================= the skier ================= */
const skier = new THREE.Group();
const rig = new THREE.Group();           // lean rig
skier.add(rig);
const jacket = new THREE.MeshStandardMaterial({color:0x27314A, roughness:.65});
const skin = new THREE.MeshStandardMaterial({color:0xE8B68C, roughness:.8});
const skiMat = new THREE.MeshStandardMaterial({color:0xE2603F, roughness:.45, metalness:.15});
const body = new THREE.Mesh(new THREE.CapsuleGeometry(.34,.78,6,12), jacket);
body.position.y = 1.18; body.castShadow = true;
const head = new THREE.Mesh(new THREE.SphereGeometry(.26,14,12), skin);
head.position.y = 1.98; head.castShadow = true;
const helmet = new THREE.Mesh(new THREE.SphereGeometry(.285,14,10,0,Math.PI*2,0,1.45), jacket);
helmet.position.y = 2.03;
const armG = new THREE.CapsuleGeometry(.1,.55,4,8);
const armL = new THREE.Mesh(armG, jacket), armR = new THREE.Mesh(armG, jacket);
armL.position.set(-.42,1.28,.06); armL.rotation.z = .5;
armR.position.set(.42,1.28,.06);  armR.rotation.z = -.5;
const skiG = new THREE.BoxGeometry(.16,.06,2.3);
const skiL = new THREE.Mesh(skiG, skiMat), skiR = new THREE.Mesh(skiG, skiMat);
skiL.position.set(-.22,.06,-.18); skiR.position.set(.22,.06,-.18);
skiL.castShadow = skiR.castShadow = true;
// scarf: little golden ribbon
const scarf = new THREE.Mesh(new THREE.PlaneGeometry(.16,.9,1,6),
  new THREE.MeshBasicMaterial({color:0xFFC56F, side:THREE.DoubleSide}));
scarf.position.set(.12,1.75,.45); scarf.rotation.x = .9;
rig.add(body, head, helmet, armL, armR, skiL, skiR, scarf);
scene.add(skier);

/* ================= particles: spray + ambient snow ================= */
function makePoints(n, size, color, op){
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(n*3), 3));
  const m = new THREE.PointsMaterial({color, size, transparent:true, opacity:op, depthWrite:false, sizeAttenuation:true});
  const p = new THREE.Points(g, m); p.frustumCulled = false; scene.add(p);
  return p;
}
const SPRAY_N = 420;
const spray = makePoints(SPRAY_N, .32, 0xffffff, .85);
const sprayP = []; for (let i = 0; i < SPRAY_N; i++) sprayP.push({x:0,y:-99,z:0,vx:0,vy:0,vz:0,life:0});
let sprayIdx = 0;
function emitSpray(x, y, z, vx, vy, vz){
  const p = sprayP[sprayIdx = (sprayIdx+1) % SPRAY_N];
  p.x=x; p.y=y; p.z=z; p.vx=vx; p.vy=vy; p.vz=vz; p.life=.5+Math.random()*.4;
}
const SNOW_N = 300;
const snow = makePoints(SNOW_N, .22, 0xffffff, .5);
const snowP = []; for (let i = 0; i < SNOW_N; i++) snowP.push({
  x:(Math.random()*2-1)*70, y:Math.random()*30, z:-Math.random()*220, vy:-(1.2+Math.random()*1.6)});

/* ================= audio (synth, same instrument as 2D) ================= */
let AC=null, mute=false, windGain, windFilt, carveGain, carveFilt;
function audioInit(){
  if (AC) return;
  AC = new (window.AudioContext||window.webkitAudioContext)();
  const buf = AC.createBuffer(1, AC.sampleRate*2, AC.sampleRate);
  const d = buf.getChannelData(0); for (let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
  const src = () => { const n=AC.createBufferSource(); n.buffer=buf; n.loop=true; n.start(); return n; };
  windFilt=AC.createBiquadFilter(); windFilt.type="lowpass"; windFilt.frequency.value=300;
  windGain=AC.createGain(); windGain.gain.value=0;
  src().connect(windFilt); windFilt.connect(windGain); windGain.connect(AC.destination);
  carveFilt=AC.createBiquadFilter(); carveFilt.type="bandpass"; carveFilt.frequency.value=2400; carveFilt.Q.value=.8;
  carveGain=AC.createGain(); carveGain.gain.value=0;
  src().connect(carveFilt); carveFilt.connect(carveGain); carveGain.connect(AC.destination);
}
function chime(){
  if(!AC||mute) return;
  const o=AC.createOscillator(), g=AC.createGain();
  o.type="sine"; o.frequency.value=880;
  g.gain.setValueAtTime(.0001,AC.currentTime);
  g.gain.exponentialRampToValueAtTime(.22,AC.currentTime+.015);
  g.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+.5);
  o.frequency.exponentialRampToValueAtTime(1318,AC.currentTime+.09);
  o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime+.55);
}
function thud(){
  if(!AC||mute) return;
  const o=AC.createOscillator(), g=AC.createGain();
  o.type="sine"; o.frequency.setValueAtTime(120,AC.currentTime);
  o.frequency.exponentialRampToValueAtTime(38,AC.currentTime+.25);
  g.gain.setValueAtTime(.5,AC.currentTime);
  g.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+.3);
  o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime+.32);
}
document.getElementById("btnMute").addEventListener("click", function(){
  mute=!mute; this.textContent="sound: "+(mute?"off":"on");
});

/* ================= game state / physics ================= */
const ST={TITLE:0,RUN:1,CRASH:2};
let state=ST.TITLE;
let lean=0, speed=0, topSpeed=0, dist=0, gatesN=0, crashT=0, camShake=0;
const TUNE={
  leanRate:5.0, accel:8.0, drag:.05, carveShed:.16,
  vmax0:24, vmaxRamp:7, authority:16, xmax:15.4,
  treeR:1.05, rockR:1.25, skierR:.55
};
let best={d:0,g:0,t:0};
try{const b=JSON.parse(localStorage.getItem("fcrun3d_best_v1")); if(b&&b.d) best=b;}catch(e){}
const $=id=>document.getElementById(id);
if (best.d) $("titleBest").textContent="Best: "+best.d+" m · "+best.g+" gates · "+best.t+" km/h";

let keyL=false,keyR=false,ptrX=null,ptrOn=false;
addEventListener("keydown",e=>{
  if(e.key==="ArrowLeft"||e.key==="a"||e.key==="A")keyL=true;
  if(e.key==="ArrowRight"||e.key==="d"||e.key==="D")keyR=true;
  if(state===ST.TITLE&&(e.key===" "||e.key==="Enter"))start();
});
addEventListener("keyup",e=>{
  if(e.key==="ArrowLeft"||e.key==="a"||e.key==="A")keyL=false;
  if(e.key==="ArrowRight"||e.key==="d"||e.key==="D")keyR=false;
});
renderer.domElement.addEventListener("pointerdown",e=>{ptrOn=true;ptrX=e.clientX;});
addEventListener("pointermove",e=>{if(ptrOn)ptrX=e.clientX;});
addEventListener("pointerup",()=>{ptrOn=false;ptrX=null;});

function start(){
  audioInit(); if(AC&&AC.state==="suspended")AC.resume();
  state=ST.RUN; lean=0; speed=5; topSpeed=0; dist=0; gatesN=0;
  skier.position.set(0,0,0); skier.rotation.set(0,0,0); rig.rotation.set(0,0,0); rig.position.y=0;
  $("title").classList.add("hide"); $("crash").classList.add("hide");
  $("hud").style.display="flex";
  // re-seed field ahead
  for (let i=0;i<N_TREE;i++) placeTree(i, -20 - Math.random()*CHUNK_L*CHUNKS);
  for (let i=0;i<N_ROCK;i++) placeRock(i, -40 - Math.random()*CHUNK_L*CHUNKS);
  gateList.forEach((g,i)=>{ g.userData.hit=false;
    g.userData.flags.forEach((f,j)=>f.material = j===0?flagClay:flagTeal);
    g.position.set((Math.random()*2-1)*11, 0, -90 - i*110 - Math.random()*40); });
  writeInstances();
}
function crash(){
  state=ST.CRASH; crashT=0; camShake=1.2; thud();
  for (let i=0;i<70;i++){
    const a=Math.random()*6.3, v=3+Math.random()*9;
    emitSpray(skier.position.x, .4, skier.position.z,
      Math.cos(a)*v, 2+Math.random()*6, Math.sin(a)*v);
  }
  const isBest = dist > best.d;
  if (isBest){ best={d:Math.floor(dist),g:gatesN,t:Math.round(topSpeed*3.6)};
    try{localStorage.setItem("fcrun3d_best_v1",JSON.stringify(best));}catch(e){} }
  setTimeout(()=>{
    $("cDist").textContent=Math.floor(dist);
    $("cGates").textContent=gatesN;
    $("cTop").textContent=Math.round(topSpeed*3.6);
    $("cBest").style.display=isBest?"block":"none";
    $("crashTitle").textContent=["Into the pines.","Found a rock garden.","The mountain wins this one.","Tomahawked it."][Math.floor(Math.random()*4)];
    $("crash").classList.remove("hide");
  },900);
}
$("btnStart").addEventListener("click",start);
$("btnRetry").addEventListener("click",start);

/* ================= recycling the world ================= */
function recycle(dz){
  // ground chunks
  for (const c of chunks){
    c.position.z += dz;
    if (c.position.z > CHUNK_L*0.9) c.position.z -= CHUNK_L*CHUNKS;
  }
  // trees / rocks
  let dirty=false;
  for (let i=0;i<N_TREE;i++){
    trees[i].z += dz;
    if (trees[i].z > 14){ placeTree(i, trees[i].z - CHUNK_L*CHUNKS - Math.random()*30); dirty=true; }
    else dirty=true;
  }
  for (let i=0;i<N_ROCK;i++){
    rockL[i].z += dz;
    if (rockL[i].z > 14) placeRock(i, rockL[i].z - CHUNK_L*CHUNKS - Math.random()*40);
  }
  if (dirty) writeInstances();
  // gates
  for (const g of gateList){
    g.position.z += dz;
    if (g.position.z > 16){
      g.position.z -= GATES*110 + 60;
      g.position.x = (Math.random()*2-1)*11;
      g.userData.hit=false;
      g.userData.flags.forEach((f,j)=>f.material = j===0?flagClay:flagTeal);
    }
  }
}

/* ================= main loop ================= */
const clock = new THREE.Clock();
function frame(){
  requestAnimationFrame(frame);
  const dt = Math.min(.05, clock.getDelta());
  const t = clock.elapsedTime;

  if (state===ST.RUN){
    // input
    let dir=0;
    if(keyL)dir-=1; if(keyR)dir+=1;
    if(ptrX!==null){ dir=Math.max(-1,Math.min(1,(ptrX-innerWidth/2)/(innerWidth*.22))); }
    lean += (dir-lean)*Math.min(1,TUNE.leanRate*dt);

    // speed
    const vmax=TUNE.vmax0+TUNE.vmaxRamp*Math.min(3,dist/1000);
    const a=TUNE.accel*(1-.55*Math.abs(lean)) - speed*TUNE.drag - Math.abs(lean)*TUNE.carveShed*speed;
    speed=Math.max(4,Math.min(vmax,speed+a*dt));
    topSpeed=Math.max(topSpeed,speed);
    dist+=speed*dt;

    // lateral
    skier.position.x += lean*TUNE.authority*(0.45+.55*speed/30)*dt;
    if (skier.position.x < -TUNE.xmax){skier.position.x=-TUNE.xmax; lean*=.4;}
    if (skier.position.x >  TUNE.xmax){skier.position.x= TUNE.xmax; lean*=.4;}

    // pose
    rig.rotation.z = -lean*.55;
    rig.rotation.y = -lean*.38;
    rig.position.y = -Math.abs(lean)*.16;            // compress into the turn
    scarf.rotation.x = .9 + Math.sin(t*9)*.18;

    // world flows past
    recycle(speed*dt);

    // spray off the downhill ski in a carve
    if (Math.abs(lean)>.4 && speed>9){
      for(let i=0;i<3;i++){
        emitSpray(skier.position.x - lean*0.5, .15, skier.position.z + .6,
          -lean*(4+Math.random()*7), 1.6+Math.random()*2.4, 3+Math.random()*4);
      }
    }

    // collisions + gates
    for (let i=0;i<N_TREE;i++){
      const tr=trees[i];
      if (Math.abs(tr.z) < 1.4 && Math.abs(tr.x - skier.position.x) < TUNE.treeR*tr.s + TUNE.skierR){ crash(); break; }
    }
    if (state===ST.RUN) for (let i=0;i<N_ROCK;i++){
      const r=rockL[i];
      if (Math.abs(r.z) < 1.3 && Math.abs(r.x - skier.position.x) < TUNE.rockR*r.s + TUNE.skierR){ crash(); break; }
    }
    if (state===ST.RUN) for (const g of gateList){
      if (!g.userData.hit && g.position.z > -.6 && g.position.z < speed*dt + .8){
        if (Math.abs(skier.position.x - g.position.x) < GATE_GAP/2){
          g.userData.hit=true; gatesN++; chime();
          g.userData.flags.forEach(f=>f.material=flagHit);
        }
      }
    }

    // HUD
    $("hDist").textContent=Math.floor(dist);
    $("hSpeed").textContent=Math.round(speed*3.6);
    $("hGates").textContent=gatesN;
  }

  if (state===ST.CRASH){
    crashT+=dt;
    rig.rotation.x += 9*dt;                    // tumble
    rig.rotation.z += 5*dt;
    skier.position.z += Math.max(0, (speed*=0.965))*dt*.4;
    speed*=.97;
  }

  if (state===ST.TITLE){
    // gentle idle drift for the title backdrop
    recycle(2.2*dt);
    rig.rotation.z = Math.sin(t*.8)*.05;
  }

  /* particles */
  {
    const pos = spray.geometry.attributes.position.array;
    for (let i=0;i<SPRAY_N;i++){
      const p=sprayP[i];
      if (p.life>0){
        p.life-=dt;
        p.vy-=12*dt;
        p.x+=p.vx*dt; p.y+=p.vy*dt; p.z+=(p.vz+ (state===ST.RUN?speed:0))*dt;
        if (p.y<0) p.life=0;
      }
      pos[i*3]=p.x; pos[i*3+1]=p.life>0?p.y:-99; pos[i*3+2]=p.z;
    }
    spray.geometry.attributes.position.needsUpdate=true;
    const sp = snow.geometry.attributes.position.array;
    for (let i=0;i<SNOW_N;i++){
      const p=snowP[i];
      p.y+=p.vy*dt; p.z+=(state===ST.RUN?speed:2)*dt*.5;
      if (p.y<0||p.z>14){ p.y=24+Math.random()*8; p.z=-Math.random()*220; p.x=(Math.random()*2-1)*70; }
      sp[i*3]=p.x; sp[i*3+1]=p.y; sp[i*3+2]=p.z;
    }
    snow.geometry.attributes.position.needsUpdate=true;
  }

  /* camera: third-person carve cam */
  camShake=Math.max(0,camShake-dt*2);
  const speedN=speed/34;
  const cx2 = skier.position.x*.86 + lean*1.6;
  const tx = skier.position.x, tz = skier.position.z;
  camera.position.x += (cx2 - camera.position.x)*Math.min(1,4.5*dt);
  camera.position.y += ((6.4 - speedN*1.1) - camera.position.y)*Math.min(1,3*dt);
  camera.position.z += ((10.5 - speedN*2.2) - camera.position.z)*Math.min(1,3*dt);
  if (camShake>0){
    camera.position.x += (Math.random()-.5)*camShake*.5;
    camera.position.y += (Math.random()-.5)*camShake*.3;
  }
  camera.fov += ((60 + speedN*14) - camera.fov)*Math.min(1,3*dt);
  camera.updateProjectionMatrix();
  camera.lookAt(tx*.6, 1.4, tz-9);

  /* sun follows so shadows stay crisp around the player */
  sun.position.set(skier.position.x-60, 26, skier.position.z-40);
  sun.target.position.set(skier.position.x, 0, skier.position.z);

  /* audio */
  if (AC){
    const sN=speed/30;
    windGain.gain.value = mute?0:.10*sN*sN;
    windFilt.frequency.value = 200+700*sN;
    const c=Math.abs(lean)*sN;
    carveGain.gain.value = mute?0:(state===ST.RUN ? .12*c*c : 0);
    carveFilt.frequency.value = 1700+1600*sN;
  }

  renderer.render(scene, camera);
}
frame();

/* test hook */
window.__fcrun3d = { start, get:()=>({state,dist,speed,gates:gatesN,x:skier.position.x}) };
})();
