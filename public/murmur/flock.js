/* Murmur — a murmuration you can touch.
   Boids over a marsh at dusk. Canvas 2D, typed arrays, zero libs. */
(function(){
"use strict";

/* ---------- canvas ---------- */
const cv = document.getElementById("cv");
const cx = cv.getContext("2d");
let W=0,H=0,DPR=1,waterY=0;
function resize(){
  DPR=Math.min(2,devicePixelRatio||1);
  W=innerWidth;H=innerHeight;
  cv.width=W*DPR;cv.height=H*DPR;
  cv.style.width=W+"px";cv.style.height=H+"px";
  cx.setTransform(DPR,0,0,DPR,0,0);
  waterY=H*.74;
}
addEventListener("resize",resize);resize();

/* ---------- flock data ---------- */
const NMAX=1500;
let N=NMAX;
const px=new Float32Array(NMAX), py=new Float32Array(NMAX),
      vx=new Float32Array(NMAX), vy=new Float32Array(NMAX),
      grp=new Uint8Array(NMAX);
for (let i=0;i<NMAX;i++){
  px[i]=Math.random()*W; py[i]=Math.random()*waterY*.8;
  const a=Math.random()*6.3, s=80+Math.random()*60;
  vx[i]=Math.cos(a)*s; vy[i]=Math.sin(a)*s;
  grp[i]=i%3; // depth bands
}

/* spatial grid (head/next linked buckets) */
const CELL=40;
let gw=0,gh=0,head=null;
const nxt=new Int32Array(NMAX);
function gridInit(){
  gw=Math.ceil(W/CELL); gh=Math.ceil(H/CELL);
  head=new Int32Array(gw*gh);
}
gridInit(); addEventListener("resize",gridInit);

/* ---------- tuning ---------- */
const TU={
  R:38, sepR:13,
  wSep:120, wAli:3.2, wCoh:1.4,
  vmin:55, vmax:165, vpanic:265,
  predR:140, wPred:900,
  bound:70, wBound:140,
  wWander:.35
};

/* wandering attractor: keeps the flock loosely together, drifting */
let wandT=Math.random()*100;
function wander(t){
  return {
    x: W*.5 + Math.sin(t*.071+wandT)*W*.3 + Math.sin(t*.029)*W*.12,
    y: waterY*.42 + Math.sin(t*.053+wandT*2)*waterY*.22
  };
}

/* ---------- pointer = falcon / breeze ---------- */
let mx=-9999,my=-9999,pmx=-9999,pmy=-9999,mvx=0,mvy=0,mActive=false,stillT=0;
let mode=0; // 0 falcon, 1 breeze
addEventListener("pointermove",e=>{
  mx=e.clientX;my=e.clientY;mActive=true;
  document.getElementById("hint").classList.add("hide");
});
addEventListener("pointerleave",()=>{mActive=false;mx=my=-9999;});
addEventListener("pointerdown",()=>{audioInit(); if(AC&&AC.state==="suspended")AC.resume();});

/* ---------- audio: wing-rush from the flock itself ---------- */
let AC=null,rushGain,rushFilt,mute=false;
function audioInit(){
  if(AC)return;
  AC=new (window.AudioContext||window.webkitAudioContext)();
  const buf=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate);
  const d=buf.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  const n=AC.createBufferSource();n.buffer=buf;n.loop=true;n.start();
  rushFilt=AC.createBiquadFilter();rushFilt.type="bandpass";rushFilt.frequency.value=900;rushFilt.Q.value=.5;
  rushGain=AC.createGain();rushGain.gain.value=0;
  n.connect(rushFilt);rushFilt.connect(rushGain);rushGain.connect(AC.destination);
}
let turnAvg=0;

/* ---------- simulation ---------- */
function sim(dt,t){
  const wp=wander(t);
  // build grid
  head.fill(-1);
  for(let i=0;i<N;i++){
    let cxg=(px[i]/CELL)|0, cyg=(py[i]/CELL)|0;
    if(cxg<0)cxg=0; if(cxg>=gw)cxg=gw-1; if(cyg<0)cyg=0; if(cyg>=gh)cyg=gh-1;
    const c=cyg*gw+cxg;
    nxt[i]=head[c]; head[c]=i;
  }
  // pointer velocity
  if(mActive){
    mvx=(mx-pmx)/Math.max(dt,.001); mvy=(my-pmy)/Math.max(dt,.001);
    const mspd=Math.hypot(mvx,mvy);
    stillT = mspd<30 ? stillT+dt : 0;
  }
  pmx=mx;pmy=my;
  const predOn = mActive && (mode===0) && stillT<1.6;  // hold still and they forget
  let turnSum=0, sampled=0;
  const R2=TU.R*TU.R, sep2=TU.sepR*TU.sepR;

  for(let i=0;i<N;i++){
    let ax=0,ay=0;
    // neighbors via grid
    let cnt=0,alx=0,aly=0,cox=0,coy=0;
    const cxg=(px[i]/CELL)|0, cyg=(py[i]/CELL)|0;
    for(let gy=cyg-1;gy<=cyg+1;gy++){
      if(gy<0||gy>=gh)continue;
      for(let gx=cxg-1;gx<=cxg+1;gx++){
        if(gx<0||gx>=gw)continue;
        for(let j=head[gy*gw+gx];j!==-1;j=nxt[j]){
          if(j===i)continue;
          const dx=px[j]-px[i],dy=py[j]-py[i];
          const d2=dx*dx+dy*dy;
          if(d2>R2)continue;
          cnt++;
          alx+=vx[j];aly+=vy[j];
          cox+=dx;coy+=dy;
          if(d2<sep2&&d2>0.01){
            const inv=1/Math.sqrt(d2);
            ax-=dx*inv*TU.wSep; ay-=dy*inv*TU.wSep;
          }
          if(cnt>22)break;            // cap work per bird
        }
      }
    }
    if(cnt>0){
      const ic=1/cnt;
      ax+=(alx*ic-vx[i])*TU.wAli*.15;
      ay+=(aly*ic-vy[i])*TU.wAli*.15;
      ax+=cox*ic*TU.wCoh;
      ay+=coy*ic*TU.wCoh;
    }
    // wander pull (keeps the cloud coherent and traveling)
    ax+=(wp.x-px[i])*.006*TU.wWander*60;
    ay+=(wp.y-py[i])*.009*TU.wWander*60;
    // predator / breeze
    if(mActive){
      const dx=px[i]-mx, dy=py[i]-my;
      const d2=dx*dx+dy*dy, pr2=TU.predR*TU.predR;
      if(d2<pr2&&d2>1){
        const d=Math.sqrt(d2), k=1-d/TU.predR;
        if(predOn){
          ax+=dx/d*k*TU.wPred; ay+=dy/d*k*TU.wPred;
        } else if(mode===1){
          ax+=mvx*k*.5; ay+=mvy*k*.5;   // the wind carries them
        }
      }
    }
    // soft bounds (sky box)
    if(px[i]<TU.bound)ax+=TU.wBound;
    if(px[i]>W-TU.bound)ax-=TU.wBound;
    if(py[i]<TU.bound*.7)ay+=TU.wBound;
    if(py[i]>waterY-26)ay-=TU.wBound*1.6;

    // integrate
    const ovx=vx[i],ovy=vy[i];
    vx[i]+=ax*dt; vy[i]+=ay*dt;
    let s=Math.hypot(vx[i],vy[i]);
    const smax= predOn&&Math.hypot(px[i]-mx,py[i]-my)<TU.predR*1.4 ? TU.vpanic : TU.vmax;
    if(s>smax){vx[i]*=smax/s;vy[i]*=smax/s;s=smax;}
    if(s<TU.vmin&&s>0){vx[i]*=TU.vmin/s;vy[i]*=TU.vmin/s;}
    px[i]+=vx[i]*dt; py[i]+=vy[i]*dt;
    if((i&15)===0){ // sample turn rate for audio
      const dot=(ovx*vx[i]+ovy*vy[i])/((Math.hypot(ovx,ovy)*Math.hypot(vx[i],vy[i]))||1);
      turnSum+=1-Math.min(1,Math.max(-1,dot)); sampled++;
    }
  }
  turnAvg+=((sampled?turnSum/sampled:0)-turnAvg)*Math.min(1,dt*5);
  if(AC&&rushGain){
    rushGain.gain.value=mute?0:Math.min(.4, turnAvg*22*(N/NMAX));
    rushFilt.frequency.value=600+turnAvg*9000;
  }
}

/* ---------- painting ---------- */
function lerp(a,b,t){return a+(b-a)*t;}
function draw(t){
  // dusk sky
  const g=cx.createLinearGradient(0,0,0,waterY);
  g.addColorStop(0,"#241B3F");
  g.addColorStop(.45,"#4A2E55");
  g.addColorStop(.8,"#9A5468");
  g.addColorStop(1,"#D98A77");
  cx.fillStyle=g;cx.fillRect(0,0,W,waterY);
  // stars
  cx.fillStyle="#fff";
  for(let i=0;i<48;i++){
    const sx=((i*409)%977)/977*W, sy=((i*223)%613)/613*waterY*.5;
    cx.globalAlpha=.12+((i*7)%5)*.07*(.6+.4*Math.sin(t*.0012*(2+i%4)+i));
    cx.fillRect(sx,sy,1.5,1.5);
  }
  cx.globalAlpha=1;
  // moon
  const mxx=W*.82,myy=H*.16;
  const halo=cx.createRadialGradient(mxx,myy,0,mxx,myy,90);
  halo.addColorStop(0,"rgba(244,233,255,.5)");halo.addColorStop(1,"rgba(244,233,255,0)");
  cx.fillStyle=halo;cx.beginPath();cx.arc(mxx,myy,90,0,6.3);cx.fill();
  cx.fillStyle="#F0E9F8";cx.beginPath();cx.arc(mxx,myy,17,0,6.3);cx.fill();
  cx.fillStyle="rgba(210,200,225,.55)";cx.beginPath();cx.arc(mxx-5,myy+3,4,0,6.3);cx.fill();
  // water
  const wg=cx.createLinearGradient(0,waterY,0,H);
  wg.addColorStop(0,"#7E4A60");
  wg.addColorStop(.25,"#4A2E50");
  wg.addColorStop(1,"#221A3A");
  cx.fillStyle=wg;cx.fillRect(0,waterY,W,H-waterY);
  // moon glint
  cx.globalAlpha=.18;
  cx.fillStyle="#F0E9F8";
  for(let i=0;i<10;i++){
    const yy=waterY+8+i*((H-waterY)/11);
    const ww=30-i*2+Math.sin(t*.002+i)*6;
    cx.fillRect(mxx-ww/2, yy, ww, 1.6);
  }
  cx.globalAlpha=1;

  /* birds: three depth bands, one path each */
  const bands=[
    {a:.42,w:1.1,k:.8,c:"#241530"},
    {a:.7,w:1.5,k:1,c:"#1D1028"},
    {a:.95,w:1.9,k:1.25,c:"#160B20"}
  ];
  for(let b=0;b<3;b++){
    const B=bands[b];
    cx.strokeStyle=B.c;cx.globalAlpha=B.a;cx.lineWidth=B.w;cx.lineCap="round";
    cx.beginPath();
    for(let i=b;i<N;i+=3){
      const s=Math.hypot(vx[i],vy[i])||1;
      const ux=vx[i]/s,uy=vy[i]/s,L=3.4*B.k;
      cx.moveTo(px[i]-ux*L,py[i]-uy*L);
      cx.lineTo(px[i]+ux*L,py[i]+uy*L);
    }
    cx.stroke();
  }
  cx.globalAlpha=1;
  /* reflection */
  cx.save();
  cx.globalAlpha=.13;
  cx.strokeStyle="#1D1028";cx.lineWidth=1.4;
  cx.beginPath();
  for(let i=0;i<N;i+=2){
    const ry=waterY+(waterY-py[i])*.32;
    if(ry>H)continue;
    const s=Math.hypot(vx[i],vy[i])||1;
    const ux=vx[i]/s,uy=-vy[i]/s,L=2.6;
    cx.moveTo(px[i]-ux*L,ry-uy*L);
    cx.lineTo(px[i]+ux*L,ry+uy*L);
  }
  cx.stroke();
  cx.restore();

  /* the falcon (cursor) */
  if(mActive){
    const ang=Math.atan2(mvy,mvx)||0;
    cx.save();
    cx.translate(mx,my);cx.rotate(ang);
    cx.fillStyle= mode===0 ? "#0E0716" : "rgba(244,233,255,.85)";
    cx.beginPath();                       // swept-wing silhouette
    cx.moveTo(9,0);cx.quadraticCurveTo(-2,-2,-7,-8);cx.quadraticCurveTo(-3,-1.5,-9,0);
    cx.quadraticCurveTo(-3,1.5,-7,8);cx.quadraticCurveTo(-2,2,9,0);cx.closePath();cx.fill();
    cx.restore();
  }
}

/* ---------- UI ---------- */
const $=id=>document.getElementById(id);
$("bMode").addEventListener("click",function(){
  mode=(mode+1)%2;
  this.textContent="you are: "+(mode===0?"the falcon":"the wind");
});
const SIZES=[{n:"full",v:NMAX},{n:"half",v:750},{n:"few",v:280}];
let sizeI=0;
$("bFlock").addEventListener("click",function(){
  sizeI=(sizeI+1)%SIZES.length;N=SIZES[sizeI].v;
  this.textContent="flock: "+SIZES[sizeI].n;
});
$("bSound").addEventListener("click",function(){
  audioInit(); if(AC&&AC.state==="suspended")AC.resume();
  mute=!mute;this.textContent="sound: "+(mute?"off":"on");
});

/* ---------- loop (rAF + watchdog) ---------- */
let last=performance.now(),lastRender=0;
function render(t){
  lastRender=performance.now();
  const dt=Math.min(.045,(t-last)/1000);last=t;
  sim(dt,t*.001);
  draw(t);
}
(function pump(t){render(t===undefined?performance.now():t);requestAnimationFrame(pump);})();
setInterval(()=>{if(performance.now()-lastRender>120)render(performance.now());},66);

window.__murmur={get:()=>({n:N,mode,turn:+turnAvg.toFixed(4),x:px[0]|0,y:py[0]|0})};
})();
