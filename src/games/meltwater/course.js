// Meltwater — the snowfield. Deterministic, shared by rendering and collision (5 Sep 2026, Droplet).
//
// Coordinates: d runs downhill in metres, x across. The field is a snowfield below the col with one
// channel of meltwater wandering down it; the channel is a shallow trough in the height function,
// so gravity itself pulls the drop back toward the water. Everything here is arithmetic on a hash:
// no assets, no randomness at runtime, the same mountain for every player.
export const SECTION = 200;      // metres per recycled section
export const FIELD_HALF = 60;    // beyond this the snow ends
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function hash(a, b, seed = 0) {
  let n = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(seed | 0, 69069);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
const smooth = (t) => t * t * (3 - 2 * t);
export function noise(x, z, seed = 0) {
  const a = Math.floor(x), b = Math.floor(z), u = smooth(x - a), v = smooth(z - b);
  const lo = hash(a, b, seed) * (1 - u) + hash(a + 1, b, seed) * u;
  const hi = hash(a, b + 1, seed) * (1 - u) + hash(a + 1, b + 1, seed) * u;
  return lo * (1 - v) + hi * v;
}
export function fbm(x, z, seed = 0, octaves = 4) {
  let n = 0, w = 0.5;
  for (let i = 0; i < octaves; i++) { n += w * noise(x, z, seed + i * 13); x = x * 2.02 + 11; z = z * 2.02 + 7; w *= 0.5; }
  return n;
}

/** Where the water runs, across the field, at distance d. */
export const channel = (d) => 14 * Math.sin(d / 150) + 9 * Math.sin(d / 57 + 1.3) + 4 * Math.sin(d / 23);
/** 0 at the col, → 1 far down: the run narrows and fills with rock as it goes. */
export const progression = (d) => 1 - Math.exp(-Math.max(0, d) / 800);
/** Half-width of the channel's trough: 4.6 m at the top, 3 m far down. */
export const channelHalfWidth = (d) => 4.6 - 1.6 * progression(d);

/** Slope, as drop per metre of d: a base grade, gentle chutes on a long wave, steepening with distance. */
export const pitch = (d) => 0.26 + 0.04 * Math.sin(d / 210 + 0.6) + 0.05 * progression(d);
/** The integral of pitch — how far below the col the surface is at d. Closed-form, so the mesh and the
 *  physics agree to the bit. */
export const drop = (d) => 0.26 * d - 8.4 * (Math.cos(d / 210 + 0.6) - Math.cos(0.6)) + 0.05 * (d - 800 * (1 - Math.exp(-d / 800)));

/** Surface height at (x, d), metres, relative to the col. */
export function heightAt(x, d) {
  const r = x - channel(d), w = channelHalfWidth(d);
  const trough = -1.4 * Math.exp(-(r * r) / (w * w));
  const banks = 0.35 * (fbm(x * 0.09, d * 0.09, 3) - 0.5) + 0.06 * (fbm(x * 0.5, d * 0.5, 5, 2) - 0.5);
  const a = Math.abs(x), wall = a > 48 ? ((a - 48) / 12) ** 2 * 6 : 0;
  return -drop(d) + trough + banks + wall;
}
export function gradientAt(x, d) {
  return { x: (heightAt(x + 0.5, d) - heightAt(x - 0.5, d)), d: (heightAt(x, d + 0.5) - heightAt(x, d - 0.5)) };
}

/** Rocks and ice for one section, reproducible. Rocks sit in and beside the channel so the line
 *  matters; ice lies in the channel where the water runs fast and the steering goes light. */
export function obstaclesFor(section) {
  const items = [];
  for (let i = 0; i < 28; i++) {
    const d = section * SECTION + 8 + hash(section, i, 1) * (SECTION - 16);
    if (d < 60) continue;                       // the opening is clear
    const p = progression(d), w = channelHalfWidth(d), c = channel(d);
    const inside = i < 4 + Math.floor(7 * p);
    const side = hash(section, i, 2) < 0.5 ? -1 : 1;
    const isIce = inside && hash(section, i, 5) < 0.22;
    if (isIce) {
      if (d < 100) continue;
      items.push({ id: `${section}:${i}`, type: 'ice', x: c + (hash(section, i, 3) - 0.5) * w, d, rx: 3.2 + hash(section, i, 6) * 2.2, rz: 7 + hash(section, i, 7) * 8 });
      continue;
    }
    if (inside && d < 140) continue;            // the first rock in the water waits 140 m
    const x = inside ? c + (hash(section, i, 3) * 2 - 1) * (w + 2.5) : c + side * (w + 4 + hash(section, i, 4) * 30);
    const radius = inside ? 0.5 + hash(section, i, 6) * 1.3 : 0.8 + hash(section, i, 6) * 2.2;
    items.push({ id: `${section}:${i}`, type: 'rock', x, d, radius, rotation: hash(section, i, 8) * Math.PI * 2, tilt: (hash(section, i, 9) - 0.5) * 0.8 });
  }
  return items;
}

/** What the drop is running on. */
export function surfaceAt(x, d, obstacles) {
  for (const o of obstacles) {
    if (o.type !== 'ice' || Math.abs(o.d - d) > o.rz + 1) continue;
    const u = (x - o.x) / o.rx, v = (d - o.d) / o.rz;
    if (u * u + v * v < 1) return 'ice';
  }
  return Math.abs(x - channel(d)) <= channelHalfWidth(d) ? 'channel' : 'snow';
}
