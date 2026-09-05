// Meltwater — input, states, the fixed-step loop, the HUD, and the longest run kept on this device.
// (5 Sep 2026, Droplet)
import { createWorld } from './world.js';
import { newRun, advance, STEP } from './physics.js';

const BEST_KEY = 'agentdoor.meltwater.v1';

export function boot() {
  const $ = (id) => document.getElementById(id);
  // Phones start without shadows: mobile GPUs keep shadow depth in fewer bits, and a scene that
  // shadows itself everywhere reads as nearly black (Firnline on Jack's phone, 5 Sep 2026). A
  // player can still choose Sharper.
  const coarse = matchMedia('(pointer: coarse)').matches;
  const settings = { quality: coarse ? 'low' : 'auto', motion: !matchMedia('(prefers-reduced-motion: reduce)').matches };
  let best = { distance: 0, topSpeed: 0 };
  try {
    const data = JSON.parse(localStorage.getItem(BEST_KEY));
    if (Number.isFinite(data?.distance) && data.distance >= 0 && data.distance < 1e8 && Number.isFinite(data.topSpeed)) best = data;
  } catch {}
  const showBest = () => { $('intro-best').textContent = best.distance ? `Your longest run: ${best.distance.toLocaleString('en-US')} m` : ''; };
  showBest();

  let mode = 'intro', run = newRun(), keys = new Set(), pointer = null, touchSteer = 0, touchBrake = false;
  let accumulator = 0, last = performance.now(), fps = 60, fpsAge = 0, frames = 0, autoAge = 0, world;

  const clearInput = () => { keys.clear(); pointer = null; touchSteer = 0; touchBrake = false; };
  const setHidden = (id, v) => { const el = $(id); el.hidden = v; el.inert = v; };
  const playingUI = (v) => { document.body.classList.toggle('playing', v); for (const id of ['hud', 'pause-button', 'touch-controls', 'hint']) setHidden(id, !v); };

  function start() {
    clearInput(); run = newRun(); mode = 'running'; accumulator = 0;
    world.reset(); world.draw(run, mode, 1 / 60, settings.motion);
    setHidden('intro', true); setHidden('results', true); setHidden('paused', true);
    playingUI(true); $('hint').style.opacity = '1';
    world.canvas.focus({ preventScroll: true }); last = performance.now();
  }
  function pause() {
    if (mode !== 'running') return;
    mode = 'paused'; clearInput(); accumulator = 0; setHidden('paused', false); $('resume').focus();
  }
  function resume() {
    if (mode !== 'paused') return;
    mode = 'running'; clearInput(); setHidden('paused', true); world.canvas.focus({ preventScroll: true }); last = performance.now();
  }
  function home() {
    mode = 'intro'; clearInput(); run = newRun(); world.reset(); playingUI(false);
    setHidden('results', true); setHidden('paused', true); setHidden('intro', false); showBest(); $('start').focus();
  }
  function fall() {
    mode = 'fallen'; clearInput(); playingUI(false); setHidden('results', false);
    $('result-reason').textContent = run.reason;
    const distance = Math.floor(run.d);
    $('final-distance').textContent = distance.toLocaleString('en-US');
    $('final-detail').textContent = `${Math.round(run.topSpeed * 3.6)} km/h at the fastest`;
    const record = distance > best.distance;
    $('new-best').textContent = record ? 'Your longest run yet.' : best.distance ? `Longest run: ${best.distance.toLocaleString('en-US')} m` : '';
    if (record) {
      best = { distance, topSpeed: Math.round(run.topSpeed * 3.6) };
      try { localStorage.setItem(BEST_KEY, JSON.stringify(best)); } catch {}
    }
    $('retry').focus();
  }

  $('start').addEventListener('click', start);
  $('retry').addEventListener('click', start);
  $('restart').addEventListener('click', start);
  $('resume').addEventListener('click', resume);
  $('back').addEventListener('click', home);
  $('pause-button').addEventListener('click', pause);
  $('controls-button').addEventListener('click', () => {
    $('panel-content').innerHTML = '<h2>Follow the water.</h2><dl class="keys"><dt>← → or A D</dt><dd>Push the drop across the slope</dd><dt>↓ or Space</dt><dd>Dig in and brake</dd><dt>P or Escape</dt><dd>Pause the run</dd></dl><p>Gravity does the rest. Stay in the channel to stay whole: the water fills you, the snow drinks you, and a rock ends the run. Ice is fast and takes the steering away. Your distance is your score.</p><p class="small">On a touchscreen, hold the steering and brake buttons. With a mouse, hold on the slope and move across it.</p>';
    $('panel').showModal();
  });
  $('settings-button').addEventListener('click', () => {
    $('panel-content').innerHTML = `<h2>Make it yours.</h2><label>Graphics<select id="quality"><option value="auto">Balanced</option><option value="high">Sharper</option><option value="low">Smoother</option></select></label><label>Camera movement<input id="motion" type="checkbox"></label><p id="performance" class="small">${fps} frames per second</p><p class="small">Original terrain, water and code by Droplet, an agent of mVara. Nothing here is loaded: the mountain, the snow and the drop are all drawn from arithmetic. Barlow typefaces by Jeremy Tribby (OFL).</p>`;
    $('quality').value = settings.quality;
    $('motion').checked = settings.motion;
    $('quality').addEventListener('change', (e) => { settings.quality = e.target.value; world.quality(settings.quality); autoAge = 0; });
    $('motion').addEventListener('change', (e) => { settings.motion = e.target.checked; });
    $('panel').showModal();
  });

  addEventListener('keydown', (e) => {
    if ($('panel').open) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault();
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      e.preventDefault();
      if (!e.repeat) { if (mode === 'running') pause(); else if (mode === 'paused') resume(); }
      return;
    }
    if (e.key === 'Enter' && (mode === 'intro' || mode === 'fallen') && e.target === world?.canvas) { start(); return; }
    if (mode === 'running') keys.add(e.key.toLowerCase());
  });
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => { clearInput(); pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { clearInput(); pause(); } });
  for (const [id, steer] of [['left', -1], ['right', 1], ['brake', 0]]) {
    $(id).addEventListener('pointerdown', (e) => {
      if (mode !== 'running') return;
      e.preventDefault(); $(id).setPointerCapture(e.pointerId);
      if (id === 'brake') touchBrake = true; else touchSteer = steer;
    });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) $(id).addEventListener(ev, () => { if (id === 'brake') touchBrake = false; else if (touchSteer === steer) touchSteer = 0; });
  }

  const SURFACE_WORDS = { channel: 'In the channel', snow: 'On the snow', ice: 'On ice' };
  function readInput() {
    let steer = (keys.has('arrowright') || keys.has('d') ? 1 : 0) - (keys.has('arrowleft') || keys.has('a') ? 1 : 0);
    if (pointer !== null) steer = Math.max(-1, Math.min(1, (pointer - innerWidth / 2) / (innerWidth * 0.32)));
    if (touchSteer) steer = touchSteer;
    return { steer, brake: touchBrake || keys.has('arrowdown') || keys.has('s') || keys.has(' ') };
  }
  function hud(input) {
    $('distance').textContent = Math.floor(run.d).toLocaleString('en-US');
    $('speed').textContent = Math.round(Math.hypot(run.vx, run.vd) * 3.6);
    $('mass').style.transform = `scaleX(${run.mass.toFixed(3)})`;
    $('mass').classList.toggle('low', run.mass < 0.3);
    $('surface').textContent = input.brake ? 'Digging in' : SURFACE_WORDS[run.surface] || '';
    if (run.elapsed > 9) $('hint').style.opacity = '0';
  }
  function simulate(seconds, input) {
    const obstacles = world.obstacles();
    accumulator += seconds;
    while (accumulator >= STEP && run.state === 'running') { advance(run, input, STEP, obstacles); accumulator -= STEP; }
  }
  function frame(now) {
    requestAnimationFrame(frame);
    const wall = (now - last) / 1000, elapsed = Math.min(0.1, wall);
    last = now;
    if (mode === 'running') {
      const input = readInput();
      simulate(elapsed, input);
      hud(input);
      if (run.state === 'fallen') fall();
    }
    world.draw(run, mode, elapsed, settings.motion, now / 1000);
    frames++; fpsAge += wall;
    if (fpsAge >= 1) {
      fps = Math.round(frames / fpsAge); frames = fpsAge = 0;
      if ($('performance')) $('performance').textContent = `${fps} frames per second`;
      if (settings.quality === 'auto') { autoAge = fps < 32 ? autoAge + 1 : Math.max(0, autoAge - 1); if (autoAge === 4) world.quality('low'); }
    }
  }

  try {
    world = createWorld($('world'));
    world.quality(settings.quality);
    world.canvas.addEventListener('pointerdown', (e) => { if (mode !== 'running') return; world.canvas.setPointerCapture(e.pointerId); pointer = e.clientX; });
    world.canvas.addEventListener('pointermove', (e) => { if (pointer !== null) pointer = e.clientX; });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) world.canvas.addEventListener(ev, () => (pointer = null));
    $('start').disabled = false;
    $('start').innerHTML = 'Begin the melt<span class="arrow" aria-hidden="true">↘</span>';
    $('load-status').textContent = 'Arrow keys to steer. Down to dig in.';
    world.draw(run, mode, 1 / 60, settings.motion, 0);
    last = performance.now();
    requestAnimationFrame(frame);
    // A read-only hook for automated checks: advance the simulation without the clock, then draw.
    window.__meltwater = {
      start, state: () => ({ mode, d: run.d, x: run.x, speed: Math.hypot(run.vx, run.vd), mass: run.mass, surface: run.surface, state: run.state, reason: run.reason, best }),
      step: (seconds, input = {}) => { if (mode === 'running') { simulate(seconds, input); hud(input); if (run.state === 'fallen') fall(); } },
      render: () => world.draw(run, mode, 1 / 60, settings.motion, performance.now() / 1000),
    };
  } catch (error) {
    console.error(error);
    $('load-status').textContent = 'The snowfield could not load. Reload to try again, or use a browser with WebGL 2.';
    $('start').textContent = 'Reload'; $('start').disabled = false;
    $('start').addEventListener('click', () => location.reload());
  }
}
