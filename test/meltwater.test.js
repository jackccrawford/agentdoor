// Meltwater — the course and the physics, pinned. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { heightAt, gradientAt, drop, pitch, channel, channelHalfWidth, obstaclesFor, surfaceAt, SECTION, FIELD_HALF } from '../src/games/meltwater/course.js';
import { newRun, advance, STEP } from '../src/games/meltwater/physics.js';

const travel = (run, seconds, input = {}, obstacles = []) => { for (let i = 0; i < seconds / STEP; i++) advance(run, input, STEP, obstacles); return run; };

test('the surface is deterministic, continuous, and always falls downhill along the channel', () => {
  assert.deepEqual(obstaclesFor(7), obstaclesFor(7));
  for (let d = 0; d < 6000; d += 37) {
    const x = channel(d), g = gradientAt(x, d);
    assert.ok(g.d < 0, `downhill at ${d}`);
    assert.ok(Math.abs(heightAt(x, d + 0.001) - heightAt(x, d - 0.001)) < 0.01, `continuous at ${d}`);
    assert.ok(heightAt(x, d) < heightAt(x + channelHalfWidth(d) + 2, d), 'the channel is a trough');
  }
  // drop() is the integral of pitch(): the mesh and the physics agree.
  for (const d of [10, 400, 1234, 5000]) assert.ok(Math.abs((drop(d + 0.5) - drop(d - 0.5)) - pitch(d)) < 1e-6, `pitch at ${d}`);
  assert.ok(obstaclesFor(0).every((o) => o.d >= 60), 'the opening is clear');
});

test('the channel fills a drop and the snow drinks it', () => {
  const inWater = newRun(); inWater.mass = 0.5;
  travel(inWater, 4);
  assert.ok(inWater.mass > 0.5, 'running in the channel gains mass');
  assert.equal(inWater.surface, 'channel');
  const onSnow = newRun(); onSnow.mass = 0.3; onSnow.x = channel(0) + 30; onSnow.d = 30;
  travel(onSnow, 1, { steer: 1 });
  assert.ok(onSnow.mass < 0.3, 'snow drains mass');
  travel(onSnow, 6, { steer: 1 });
  assert.equal(onSnow.state, 'fallen');
  assert.equal(onSnow.reason, 'The snow drank you.');
});

test('the water runs faster than the snow, braking slows it, ice takes the steering away', () => {
  const water = newRun(); travel(water, 8);
  const snow = newRun(); snow.x = channel(0) + 25; snow.mass = 1; travel(snow, 4, { steer: 1 });
  assert.ok(water.vd > 6, `water ${water.vd}`);
  assert.ok(snow.vd < water.vd, 'snow is slower');
  const braked = newRun(); travel(braked, 8, { brake: true });
  assert.ok(braked.d < water.d - 10, 'the brake shortens the same eight seconds');
  const ice = [{ type: 'ice', x: 0, d: 30, rx: 40, rz: 40 }];
  const onIce = newRun(); onIce.d = 30; onIce.vd = 10; travel(onIce, 1, { steer: 1 }, ice);
  const onWater = newRun(); onWater.d = 30; onWater.vd = 10; travel(onWater, 1, { steer: 1 });
  assert.ok(Math.abs(onIce.vx) < Math.abs(onWater.vx), 'less authority on ice');
  assert.equal(onIce.surface, 'ice');
});

test('a rock between two frames still breaks the drop, and a fallen run stays fallen', () => {
  const r = newRun(); r.vd = 26;
  advance(r, {}, 0.1, [{ type: 'rock', x: channel(0), d: 1.2, radius: 0.5 }]);
  assert.equal(r.state, 'fallen'); assert.equal(r.reason, 'Broken on the rock.');
  const before = { ...r };
  advance(r, { steer: 1 }, 1, []);
  assert.deepEqual(r, before);
});

test('30, 60 and 120 fps schedules produce the same run', () => {
  const results = [];
  for (const fps of [30, 60, 120]) {
    const r = newRun(); let acc = 0;
    for (let f = 0; f < fps * 8; f++) {
      acc += 1 / fps;
      while (acc >= STEP - 1e-10) { advance(r, { steer: f < fps * 3 ? 0.5 : 0 }, STEP); acc -= STEP; }
    }
    results.push(r);
  }
  assert.ok(Math.abs(results[0].d - results[2].d) < 1e-8);
  assert.ok(Math.abs(results[1].vx - results[2].vx) < 1e-8);
});

test('surfaceAt names ice inside a patch and the field ends at its edge', () => {
  const ice = [{ type: 'ice', x: 5, d: 100, rx: 3, rz: 6 }];
  assert.equal(surfaceAt(5, 100, ice), 'ice');
  assert.equal(surfaceAt(5, 120, ice), Math.abs(5 - channel(120)) <= channelHalfWidth(120) ? 'channel' : 'snow');
  const r = newRun(); r.x = FIELD_HALF + 1; r.d = 50;
  advance(r, {}, STEP);
  assert.equal(r.state, 'fallen');
  assert.ok(SECTION > 0);
});
