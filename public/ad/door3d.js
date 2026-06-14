/* AgentDoor 3D — a field of doors at twilight.
   Three.js r158. Hover a door: it opens. Click: step through. */
(function(){
"use strict";

const DOORS = [
  {name:"Dawn Patrol",   href:"/arcade/",        glow:0xFFC56F, x:-31.5},
  {name:"Alpenglow",     href:"/alpenglow/",     glow:0xF0876A, x:-22.5},
  {name:"Murmur",        href:"/murmur/",        glow:0xB58BD9, x:-13.5},
  {name:"Hyperlap",      href:"/hyperlap/",      glow:0x6AD0FF, x:-4.5},
  {name:"Particle Life", href:"/particle-life/", glow:0x86E08A, x:4.5},
  {name:"Gravity",       href:"/gravity/",       glow:0x9FA8FF, x:13.5},
  {name:"Aurora",        href:"/aurora/",        glow:0xC98BE0, x:22.5},
  {name:"Fluid",         href:"/fluid/",         glow:0x5BD0E0, x:31.5}
];
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- renderer / scene ---------- */
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(2, devicePixelRatio||1));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x2A2148, 26, 110);

const camera = new THREE.PerspectiveCamera(58, innerWidth/innerHeight, .1, 800);
camera.position.set(0, 3.1, 13.5);

addEventListener("resize", ()=>{
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* ---------- sky dome + moon + stars ---------- */
(function(){
  const g = new THREE.SphereGeometry(400, 24, 12);
  const cols=[]; const pos=g.attributes.position;
  const top=new THREE.Color(0x151233), mid=new THREE.Color(0x4A2E55), low=new THREE.Color(0xC2655F);
  for (let i=0;i<pos.count;i++){
    const y=pos.getY(i)/400;
    const c = y>.22 ? top.clone().lerp(mid, Math.max(0,1-y*1.4)) : mid.clone().lerp(low, Math.min(1,(.22-y)*2.4));
    cols.push(c.r,c.g,c.b);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(cols,3));
  scene.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({vertexColors:true, side:THREE.BackSide, fog:false})));
  const moon = new THREE.Mesh(new THREE.CircleGeometry(9,32),
    new THREE.MeshBasicMaterial({color:0xF0E9F8, fog:false, transparent:true, opacity:.95}));
  moon.position.set(120, 90, -320); moon.lookAt(0,0,0); scene.add(moon);
  const halo = new THREE.Mesh(new THREE.CircleGeometry(30,32),
    new THREE.MeshBasicMaterial({color:0xCBB8E8, fog:false, transparent:true, opacity:.16}));
  halo.position.set(120, 90, -319); halo.lookAt(0,0,0); scene.add(halo);
  // stars
  const n=320, sp=new Float32Array(n*3);
  for (let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2, e=Math.random()*.5+.08, r=380;
    sp[i*3]=Math.cos(a)*Math.cos(e)*r; sp[i*3+1]=Math.sin(e)*r; sp[i*3+2]=Math.sin(a)*Math.cos(e)*r;
  }
  const sg=new THREE.BufferGeometry();
  sg.setAttribute("position", new THREE.BufferAttribute(sp,3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({color:0xffffff,size:1.4,sizeAttenuation:false,transparent:true,opacity:.7,fog:false})));
})();

/* ---------- ground ---------- */
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(600, 600),
  new THREE.MeshStandardMaterial({color:0x241E42, roughness:.95}));
ground.rotation.x = -Math.PI/2;
ground.receiveShadow = true;
scene.add(ground);

/* ---------- light ---------- */
scene.add(new THREE.HemisphereLight(0x6a5a96, 0x1c1736, .5));
const moonLight = new THREE.DirectionalLight(0xBFB2E0, .8);
moonLight.position.set(40, 50, -60);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(2048,2048);
moonLight.shadow.camera.left=-40; moonLight.shadow.camera.right=40;
moonLight.shadow.camera.top=40; moonLight.shadow.camera.bottom=-40;
scene.add(moonLight);

/* ---------- the doors ---------- */
const frameMat = new THREE.MeshStandardMaterial({color:0x12343E, roughness:.6});
const leafMat  = new THREE.MeshStandardMaterial({color:0x0E222B, roughness:.55, metalness:.15});
const doorObjs = [];
DOORS.forEach((D,i)=>{
  const grp = new THREE.Group();
  grp.position.set(D.x, 0, 0);
  // frame: posts + lintel
  const postG = new THREE.BoxGeometry(.32,5,.5);
  const pL = new THREE.Mesh(postG, frameMat); pL.position.set(-1.55,2.5,0);
  const pR = new THREE.Mesh(postG, frameMat); pR.position.set(1.55,2.5,0);
  const lin = new THREE.Mesh(new THREE.BoxGeometry(3.42,.34,.5), frameMat); lin.position.set(0,5.05,0);
  [pL,pR,lin].forEach(m=>{m.castShadow=true; grp.add(m);});
  // the glow inside the opening
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.78,4.84),
    new THREE.MeshBasicMaterial({color:D.glow, transparent:true, opacity:.9, fog:false}));
  glow.position.set(0,2.46,-.12);
  grp.add(glow);
  // light spilling from the doorway
  const pt = new THREE.PointLight(D.glow, 14, 26, 1.6);
  pt.position.set(0,2.6,1.6);
  grp.add(pt);
  // spill pool on the ground
  const pool = new THREE.Mesh(new THREE.CircleGeometry(3.4,30),
    new THREE.MeshBasicMaterial({color:D.glow, transparent:true, opacity:.13, blending:THREE.AdditiveBlending, fog:false}));
  pool.rotation.x = -Math.PI/2; pool.position.set(0,.012,2.2); pool.scale.y=1.7;
  grp.add(pool);
  // the leaf, hinged on the left post
  const hinge = new THREE.Group(); hinge.position.set(-1.39,0,0);
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(2.78,4.84,.14), leafMat);
  leaf.position.set(1.39,2.46,0); leaf.castShadow = true;
  hinge.add(leaf);
  // knob
  const knob = new THREE.Mesh(new THREE.SphereGeometry(.085,10,8),
    new THREE.MeshStandardMaterial({color:0xE0A43B, roughness:.3, metalness:.6}));
  knob.position.set(2.5,2.4,.12); hinge.add(knob);
  hinge.rotation.y = -.5;             // resting ajar
  grp.add(hinge);
  scene.add(grp);
  doorObjs.push({grp, hinge, glow, pt, pool, open:-.5, label:document.getElementById("lab"+i), pick:[leaf, glow], D});
});

/* ---------- ambient drift: motes + a tiny murmuration ---------- */
const motes = (function(){
  const n=240, p=new Float32Array(n*3), v=[];
  for (let i=0;i<n;i++){ p[i*3]=(Math.random()*2-1)*40; p[i*3+1]=Math.random()*10; p[i*3+2]=(Math.random()*2-1)*30+2; v.push(.1+Math.random()*.3); }
  const g=new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p,3));
  const pts=new THREE.Points(g, new THREE.PointsMaterial({color:0xCBB8E8,size:.07,transparent:true,opacity:.6}));
  scene.add(pts); return {pts,p,v,n};
})();
const flock = (function(){
  const n=130, p=new Float32Array(n*3), ph=[];
  for (let i=0;i<n;i++) ph.push(Math.random()*6.3);
  const g=new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p,3));
  const pts=new THREE.Points(g, new THREE.PointsMaterial({color:0x0E0A1A,size:.34,transparent:true,opacity:.85}));
  scene.add(pts); return {pts,p,ph,n};
})();

/* ---------- interaction ---------- */
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2(-2,-2);
let hot = -1, mxN=0, myN=0;
addEventListener("pointermove", e=>{
  ndc.x = (e.clientX/innerWidth)*2-1;
  ndc.y = -(e.clientY/innerHeight)*2+1;
  mxN = ndc.x; myN = ndc.y;
});
renderer.domElement.addEventListener("click", ()=>{
  if (hot>=0) window.location.href = encodeURI(DOORS[hot].href);
});

/* ---------- loop ---------- */
const clock = new THREE.Clock();
const v3 = new THREE.Vector3();
let lastRender = 0;
function frame(){
  requestAnimationFrame(frame);
  render();
}
function render(){
  lastRender = performance.now();
  const dt = Math.min(.05, clock.getDelta());
  const t = clock.elapsedTime;

  // hover pick
  ray.setFromCamera(ndc, camera);
  hot = -1;
  for (let i=0;i<doorObjs.length;i++){
    if (ray.intersectObjects(doorObjs[i].pick, false).length){ hot=i; break; }
  }
  document.body.style.cursor = hot>=0 ? "pointer" : "default";

  // doors breathe; the hot one swings wide
  doorObjs.forEach((d,i)=>{
    const target = (i===hot) ? -1.45 : -.5 - Math.sin(t*.7+i*2)*.06;
    d.open += (target-d.open)*Math.min(1,6*dt);
    d.hinge.rotation.y = d.open;
    const k = (i===hot)?1:0;
    d.pt.intensity += ((k?26:14) - d.pt.intensity)*Math.min(1,5*dt);
    d.pool.material.opacity += ((k?.24:.13) - d.pool.material.opacity)*Math.min(1,5*dt);
    d.label.classList.toggle("hot", i===hot);
    // project label anchor
    v3.set(d.grp.position.x, 5.85, 0).project(camera);
    const sx=(v3.x*.5+.5)*innerWidth, sy=(-v3.y*.5+.5)*innerHeight;
    d.label.style.left = sx+"px"; d.label.style.top = sy+"px";
    const near = 1 - Math.min(1, Math.abs(d.grp.position.x - camera.position.x)/24);
    d.label.style.opacity = (v3.z<1 ? 1 : 0) * Math.max(0, near);
  });

  // camera drifts slowly along the field; mouse adds parallax
  {
    const span = 31.5;                 // half-width of the field
    if (!RM){
      const panX = Math.sin(t*0.045) * (span*0.84);
      camera.position.x += ((panX + mxN*3.0) - camera.position.x)*Math.min(1,2*dt);
      camera.position.y += ((3.1 + myN*.7 + Math.sin(t*.4)*.12) - camera.position.y)*Math.min(1,2*dt);
      camera.lookAt(panX, 2.6, 0);
    } else {
      camera.position.x += ((mxN*span*0.9) - camera.position.x)*Math.min(1,2*dt);
      camera.lookAt(camera.position.x, 2.6, 0);
    }
  }

  // motes drift
  {
    const p=motes.p;
    for (let i=0;i<motes.n;i++){
      p[i*3+1]-=motes.v[i]*dt; p[i*3]+=Math.sin(t*.3+i)*.002;
      if (p[i*3+1]<0) p[i*3+1]=10;
    }
    motes.pts.geometry.attributes.position.needsUpdate=true;
  }
  // distant murmuration loops
  {
    const p=flock.p;
    const cxx=Math.sin(t*.13)*30, cyy=16+Math.sin(t*.21)*4, czz=-46+Math.cos(t*.09)*12;
    for (let i=0;i<flock.n;i++){
      const a=t*.9+flock.ph[i], b=t*.5+flock.ph[i]*2.1;
      p[i*3]=cxx+Math.sin(a)*6+Math.sin(b*1.7)*2.4;
      p[i*3+1]=cyy+Math.sin(b)*2.6+Math.cos(a*1.3)*1.2;
      p[i*3+2]=czz+Math.cos(a)*4;
    }
    flock.pts.geometry.attributes.position.needsUpdate=true;
  }

  renderer.render(scene, camera);
}
frame();
setInterval(()=>{ if (performance.now()-lastRender>120) render(); }, 66);

window.__doors = { get:()=>({hot, open:doorObjs.map(d=>+d.open.toFixed(2))}) };
})();
