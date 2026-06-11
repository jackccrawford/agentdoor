/* Alpenglow — draw a mountain, hear it sing.
   The skyline is the score. WebAudio synthesis, zero samples, zero libs. */
(function(){
"use strict";

/* ---------- canvas ---------- */
const cv = document.getElementById("cv");
const cx = cv.getContext("2d");
let W=0, H=0, DPR=1;
function resize(){
  DPR = Math.min(2, devicePixelRatio||1);
  W = innerWidth; H = innerHeight;
  cv.width = W*DPR; cv.height = H*DPR;
  cv.style.width = W+"px"; cv.style.height = H+"px";
  cx.setTransform(DPR,0,0,DPR,0,0);
}
addEventListener("resize", resize); resize();

/* ---------- state ---------- */
const COLS = 64;                       // score resolution
let ridge = new Array(COLS).fill(null); // 0..1 height per column (null = silent)
let sun = {x:.22, y:.30};              // normalized; y: 0 top, 1 horizon
let playing = true, step = 0, stepT = 0;
const TEMPI = [{n:"drift",bpm:56},{n:"walk",bpm:92},{n:"run",bpm:128}];
let tempoI = 0;
const SCALES = [
  {n:"alpine", semis:[0,2,4,7,9]},     // major pentatonic
  {n:"dusk",   semis:[0,3,5,7,10]}     // minor pentatonic
];
let scaleI = 0;
let pulses = [];                       // {x,y,r,life,hue}
let flakes = [];                       // ambient drift
for (let i=0;i<70;i++) flakes.push({x:Math.random(),y:Math.random(),s:.4+Math.random()*1.2,v:.006+Math.random()*.02});

/* default range: gentle, melodic */
function seedRange(){
  const base = .42 + Math.random()*.1;
  let h = base;
  for (let i=0;i<COLS;i++){
    h += (Math.random()-.5)*.12;
    const peak = Math.exp(-Math.pow((i-COLS*(.3+Math.random()*0.02))/6,2))*.25
               + Math.exp(-Math.pow((i-COLS*.68)/9,2))*.2;
    ridge[i] = Math.max(.12, Math.min(.85, h + peak));
  }
  // smooth
  for (let k=0;k<2;k++)
    for (let i=1;i<COLS-1;i++) ridge[i]=(ridge[i-1]+ridge[i]*2+ridge[i+1])/4;
}
try{
  const s = JSON.parse(localStorage.getItem("alpenglow_v1"));
  if (s && s.ridge && s.ridge.length===COLS){ ridge=s.ridge; sun=s.sun||sun; }
  else seedRange();
}catch(e){ seedRange(); }
function save(){
  try{ localStorage.setItem("alpenglow_v1", JSON.stringify({ridge, sun})); }catch(e){}
}

/* ---------- audio ---------- */
let AC=null, master, filt, delayL, delayR, verb;
function audioInit(){
  if (AC) return;
  AC = new (window.AudioContext||window.webkitAudioContext)();
  master = AC.createGain(); master.gain.value = .85;
  filt = AC.createBiquadFilter(); filt.type="lowpass"; filt.frequency.value=2200; filt.Q.value=.4;
  // ping-pong delay
  delayL = AC.createDelay(2); delayL.delayTime.value=.36;
  delayR = AC.createDelay(2); delayR.delayTime.value=.54;
  const fbL = AC.createGain(); fbL.gain.value=.34;
  const fbR = AC.createGain(); fbR.gain.value=.3;
  const panL = AC.createStereoPanner(); panL.pan.value=-.6;
  const panR = AC.createStereoPanner(); panR.pan.value=.6;
  delayL.connect(fbL); fbL.connect(delayR);
  delayR.connect(fbR); fbR.connect(delayL);
  delayL.connect(panL); delayR.connect(panR);
  // cheap lush reverb: generated impulse
  verb = AC.createConvolver();
  const len = AC.sampleRate*2.6, ib = AC.createBuffer(2,len,AC.sampleRate);
  for (let ch=0;ch<2;ch++){ const d=ib.getChannelData(ch);
    for (let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.4); }
  verb.buffer = ib;
  const verbG = AC.createGain(); verbG.gain.value=.5;
  filt.connect(master);
  filt.connect(delayL);
  panL.connect(master); panR.connect(master);
  filt.connect(verb); verb.connect(verbG); verbG.connect(master);
  master.connect(AC.destination);
}
function note(freq, vel, pan, bright){
  if (!AC) return;
  const t0 = AC.currentTime;
  const o1 = AC.createOscillator(); o1.type="triangle"; o1.frequency.value=freq;
  const o2 = AC.createOscillator(); o2.type="sine"; o2.frequency.value=freq*2.001;
  const g = AC.createGain();
  const o2g = AC.createGain(); o2g.gain.value = .25*bright;
  const p = AC.createStereoPanner(); p.pan.value = pan;
  g.gain.setValueAtTime(.0001, t0);
  g.gain.exponentialRampToValueAtTime(vel, t0+.012);
  g.gain.exponentialRampToValueAtTime(.0001, t0+1.9);
  o1.connect(g); o2.connect(o2g); o2g.connect(g);
  g.connect(p); p.connect(filt);
  o1.start(t0); o2.start(t0);
  o1.stop(t0+2); o2.stop(t0+2);
}
/* height -> frequency through the scale */
function pitchFor(h){
  const sc = SCALES[scaleI].semis;
  const span = 3;                                   // octaves
  const degree = Math.round(h * (sc.length*span - 1));
  const oct = Math.floor(degree / sc.length), idx = degree % sc.length;
  const semi = sc[idx] + 12*oct;
  return 174.61 * Math.pow(2, semi/12);             // F3 root
}

/* ---------- sequencing ---------- */
function stepDur(){ return 60 / TEMPI[tempoI].bpm / 2; } // 8th notes
function tick(dt){
  if (!playing) return;
  stepT += dt;
  const d = stepDur();
  while (stepT >= d){
    stepT -= d;
    step = (step+1) % COLS;
    const h = ridge[step];
    if (h !== null){
      const prev = ridge[(step-1+COLS)%COLS];
      const isPeak = prev !== null && h > prev + .004;
      const bright = 1 - sun.y;                      // sun high = brighter
      if (AC){
        filt.frequency.value = 700 + Math.pow(bright,1.4)*4200;
        const vel = .12 + h*.26 + (isPeak?.07:0);
        const pan = (step/COLS)*1.6 - .8;
        note(pitchFor(h), vel, pan, bright);
        if (h > .72 && Math.random()<.5)             // high peaks get a sparkle octave
          note(pitchFor(h)*2, .06, pan*.5, bright);
      }
      const px = (step+.5)/COLS*W, py = ridgeY(step);
      pulses.push({x:px, y:py, r:3, life:1, big:h});
    }
  }
}

/* ---------- interaction ---------- */
let drawing=false, dragSun=false;
function sunPx(){ return {x:sun.x*W, y:sun.y*(H*.55)+H*.06, r:Math.max(18, W*.022)}; }
function ridgeY(i){ return H - (ridge[i]===null ? 0 : ridge[i]) * H * .72; }
function applyDraw(e){
  const mx = e.clientX, my = e.clientY;
  const i = Math.max(0, Math.min(COLS-1, Math.floor(mx/W*COLS)));
  const h = Math.max(.05, Math.min(.9, (H-my)/(H*.72)));
  ridge[i] = h;
  // feather neighbors for smooth strokes
  if (i>0 && ridge[i-1]!==null) ridge[i-1]=(ridge[i-1]*2+h)/3;
  if (i<COLS-1 && ridge[i+1]!==null) ridge[i+1]=(ridge[i+1]*2+h)/3;
}
cv.addEventListener("pointerdown", e=>{
  audioInit(); if (AC && AC.state==="suspended") AC.resume();
  const s = sunPx();
  if (Math.hypot(e.clientX-s.x, e.clientY-s.y) < s.r*1.7){ dragSun=true; }
  else { drawing=true; applyDraw(e); }
  document.getElementById("hint").classList.add("hide");
});
addEventListener("pointermove", e=>{
  if (dragSun){
    sun.x = Math.max(.04, Math.min(.96, e.clientX/W));
    sun.y = Math.max(0, Math.min(1, (e.clientY - H*.06)/(H*.55)));
  } else if (drawing) applyDraw(e);
});
addEventListener("pointerup", ()=>{ if (drawing||dragSun) save(); drawing=false; dragSun=false; });

const $=id=>document.getElementById(id);
$("bPlay").addEventListener("click", function(){
  audioInit(); if (AC && AC.state==="suspended") AC.resume();
  playing=!playing;
  this.textContent = playing ? "listening…" : "paused";
  this.classList.toggle("on", playing);
});
$("bClear").addEventListener("click", ()=>{ seedRange(); save(); });
$("bTempo").addEventListener("click", function(){
  tempoI=(tempoI+1)%TEMPI.length; this.textContent="tempo: "+TEMPI[tempoI].n;
});
$("bScale").addEventListener("click", function(){
  scaleI=(scaleI+1)%SCALES.length; this.textContent="scale: "+SCALES[scaleI].n;
});

/* ---------- painting ---------- */
function lerp(a,b,t){ return a+(b-a)*t; }
function mix(c1,c2,t){
  return [Math.round(lerp(c1[0],c2[0],t)), Math.round(lerp(c1[1],c2[1],t)), Math.round(lerp(c1[2],c2[2],t))];
}
function rgb(c){ return `rgb(${c[0]},${c[1]},${c[2]})`; }

function draw(t, dt){
  const dusk = sun.y;                        // 0 = high noon-ish, 1 = on horizon
  // sky bands
  const top  = mix([46,58,110], [27,30,62], dusk);
  const mid  = mix([122,108,150], [120,72,108], dusk);
  const low  = mix([255,197,111], [240,120,90], dusk);
  const g = cx.createLinearGradient(0,0,0,H);
  g.addColorStop(0, rgb(top));
  g.addColorStop(.45, rgb(mid));
  g.addColorStop(.78, rgb(low));
  cx.fillStyle = g; cx.fillRect(0,0,W,H);

  // stars when the sun is low
  if (dusk > .5){
    cx.fillStyle = "#fff";
    for (let i=0;i<60;i++){
      const sx=((i*397)%983)/983*W, sy=((i*211)%701)/701*H*.45;
      cx.globalAlpha = (dusk-.5)*2 * (.25 + ((i*7)%5)*.13) * (.6+.4*Math.sin(t*.001*(2+i%5)+i));
      cx.fillRect(sx, sy, 1.6, 1.6);
    }
    cx.globalAlpha = 1;
  }

  // sun + halo
  const s = sunPx();
  const halo = cx.createRadialGradient(s.x,s.y,0,s.x,s.y,s.r*5);
  halo.addColorStop(0,"rgba(255,233,196,.8)"); halo.addColorStop(.4,"rgba(255,197,111,.25)"); halo.addColorStop(1,"rgba(255,197,111,0)");
  cx.fillStyle=halo; cx.beginPath(); cx.arc(s.x,s.y,s.r*5,0,6.3); cx.fill();
  cx.fillStyle="#FFE9C4"; cx.beginPath(); cx.arc(s.x,s.y,s.r,0,6.3); cx.fill();
  cx.strokeStyle="rgba(255,255,255,.6)"; cx.lineWidth=1.5;
  cx.beginPath(); cx.arc(s.x,s.y,s.r+5+Math.sin(t*.003)*2,0,6.3); cx.stroke();

  // far ridge (auto, parallax of the drawn one)
  cx.fillStyle = rgb(mix([84,97,140],[58,62,104],dusk));
  cx.beginPath(); cx.moveTo(0,H);
  for (let i=0;i<COLS;i++){
    const h = (ridge[i]??.3)*.55 + .18 + Math.sin(i*.6)*.02;
    cx.lineTo((i+.5)/COLS*W, H - h*H*.72*.8);
  }
  cx.lineTo(W,H); cx.closePath(); cx.fill();

  // main ridge: alpenglow fill, lit rim toward the sun
  const snowHi = mix([255,236,214],[255,170,140],dusk);
  const snowLo = mix([214,222,242],[120,110,160],dusk);
  const rg = cx.createLinearGradient(0,H*.2,0,H);
  rg.addColorStop(0, rgb(snowHi)); rg.addColorStop(1, rgb(snowLo));
  cx.fillStyle = rg;
  cx.beginPath(); cx.moveTo(0,H);
  cx.lineTo(0, ridgeY(0));
  for (let i=0;i<COLS;i++) cx.lineTo((i+.5)/COLS*W, ridgeY(i));
  cx.lineTo(W, ridgeY(COLS-1));
  cx.lineTo(W,H); cx.closePath(); cx.fill();
  // rim light
  cx.strokeStyle = `rgba(255,210,150,${.55+.3*dusk})`; cx.lineWidth = 2.5;
  cx.lineJoin="round";
  cx.beginPath();
  for (let i=0;i<COLS;i++){
    const x=(i+.5)/COLS*W, y=ridgeY(i);
    if (i===0) cx.moveTo(x,y); else cx.lineTo(x,y);
  }
  cx.stroke();

  // playhead shimmer
  if (playing){
    const px = (step + stepT/stepDur()) / COLS * W;
    const ph = cx.createLinearGradient(px-14,0,px+14,0);
    ph.addColorStop(0,"rgba(255,255,255,0)"); ph.addColorStop(.5,"rgba(255,255,255,.16)"); ph.addColorStop(1,"rgba(255,255,255,0)");
    cx.fillStyle=ph; cx.fillRect(px-14, 0, 28, H);
  }

  // note pulses: light rising off the peaks
  for (let i=pulses.length-1;i>=0;i--){
    const p=pulses[i];
    p.life-=dt*.8; if (p.life<=0){ pulses.splice(i,1); continue; }
    p.y -= dt*46; p.r += dt*26;
    cx.globalAlpha = p.life*.8;
    const pg = cx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r);
    pg.addColorStop(0,"rgba(255,233,196,.9)"); pg.addColorStop(1,"rgba(255,197,111,0)");
    cx.fillStyle=pg; cx.beginPath(); cx.arc(p.x,p.y,p.r,0,6.3); cx.fill();
  }
  cx.globalAlpha=1;

  // drifting flakes
  cx.fillStyle="rgba(255,255,255,.7)";
  for (const f of flakes){
    f.y += f.v*dt*8; f.x += Math.sin(t*.0005+f.s*7)*.0004;
    if (f.y>1){ f.y=-.02; f.x=Math.random(); }
    cx.globalAlpha = .2+f.s*.3;
    cx.fillRect(f.x*W, f.y*H, f.s+.6, f.s+.6);
  }
  cx.globalAlpha=1;
}

/* ---------- loop (rAF + watchdog for throttled iframes) ---------- */
let last=performance.now(), lastRender=0;
function render(t){
  lastRender=performance.now();
  const dt=Math.min(.05,(t-last)/1000); last=t;
  tick(dt);
  draw(t, dt);
}
(function pump(t){ render(t===undefined?performance.now():t); requestAnimationFrame(pump); })();
setInterval(()=>{ if (performance.now()-lastRender>120) render(performance.now()); }, 66);

/* test hook */
window.__glow = { get:()=>({playing, step, cols:COLS, drawn:ridge.filter(x=>x!==null).length, sun}), tickSteps:(n)=>{for(let i=0;i<n;i++)tick(stepDur());} };
})();
