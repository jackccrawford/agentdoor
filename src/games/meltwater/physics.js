// Meltwater — how a drop runs. Fixed step, gravity from the local gradient, drag by surface, mass as
// life: the channel fills you, the snow drinks you, a rock breaks you. (5 Sep 2026, Droplet)
import { gradientAt, surfaceAt, channel, clamp, FIELD_HALF } from './course.js';

export const STEP = 1 / 120;
const G = 9.81 * 0.7;              // water on wet snow is not a sled: a fraction of g along the slope
const MAX_SPEED = 28;              // ~100 km/h, the sea can wait
const DRAG = { channel: 0.006, ice: 0.003, snow: 0.03 };   // v² coefficients
const LINEAR = { channel: 0.15, ice: 0.05, snow: 0.9 };     // constant resistance
const GAIN = { channel: 0.10, ice: 0, snow: -0.14 };        // mass per second

export function newRun() {
  // The run starts IN the water: the channel wanders, so x follows it rather than sitting at 0.
  return { d: 0, x: channel(0), vx: 0, vd: 1.5, mass: 0.6, elapsed: 0, topSpeed: 0, state: 'running', reason: '', surface: 'channel', steer: 0 };
}

export const radiusOf = (run) => 0.15 + 0.3 * run.mass;

export function advance(run, input, dt, obstacles = []) {
  if (run.state !== 'running' || dt <= 0) return;
  const steer = clamp(input.steer || 0, -1, 1), brake = !!input.brake;
  const prevX = run.x, prevD = run.d;
  run.steer += (steer - run.steer) * (1 - Math.exp(-6 * dt));
  const surface = surfaceAt(run.x, run.d, obstacles);
  run.surface = surface;

  // Gravity along the surface, then the player's push across it (light on ice).
  const g = gradientAt(run.x, run.d);
  const authority = surface === 'ice' ? 0.25 : 1;
  run.vx += (-G * g.x + run.steer * 7.5 * authority) * dt;
  run.vd += (-G * g.d) * dt;
  if (run.vd < 0) run.vd = 0;                     // water does not run uphill

  // Resistance opposite to motion: quadratic drag, a floor, and the brake (digging in).
  let speed = Math.hypot(run.vx, run.vd);
  if (speed > 1e-6) {
    const dec = DRAG[surface] * speed * speed + LINEAR[surface] + (brake ? 3.5 + 0.35 * speed : 0);
    const next = Math.max(0, Math.min(MAX_SPEED, speed - dec * dt));
    const f = next / speed;
    run.vx *= f; run.vd *= f; speed = next;
  }
  run.x += run.vx * dt;
  run.d += run.vd * dt;
  run.elapsed += dt;
  run.topSpeed = Math.max(run.topSpeed, speed);
  run.mass = clamp(run.mass + GAIN[surface] * dt, 0, 1);

  // Swept collision with rocks: the segment from the last position to this one against a circle.
  const r = radiusOf(run);
  for (const o of obstacles) {
    if (o.type !== 'rock' || o.d < prevD - 6 || o.d > run.d + 6) continue;
    const dx = run.x - prevX, dd = run.d - prevD, l = dx * dx + dd * dd;
    const t = l ? clamp(((o.x - prevX) * dx + (o.d - prevD) * dd) / l, 0, 1) : 0;
    if (Math.hypot(o.x - prevX - t * dx, o.d - prevD - t * dd) < o.radius + r) {
      run.state = 'fallen'; run.reason = 'Broken on the rock.'; return;
    }
  }
  if (run.mass <= 0) { run.state = 'fallen'; run.reason = 'The snow drank you.'; return; }
  if (Math.abs(run.x) > FIELD_HALF) { run.state = 'fallen'; run.reason = 'Over the edge of the field.'; }
}
