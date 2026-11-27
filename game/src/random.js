// Skyline Courier — a tiny seeded random source. The valley, the trees, the
// town and the ring line are all drawn from one fixed seed, so the same
// valley greets every pilot and every screenshot shows the same world.

export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth 1-D value noise: a few random control points, cosine-blended.
export function makeNoise1D(seed, spacing, amp) {
  const rng = makeRng(seed);
  const points = [];
  for (let i = 0; i < 64; i++) points.push(rng() * 2 - 1);
  return function noise(x) {
    const u = x / spacing;
    const i = Math.floor(u);
    const f = u - i;
    const a = points[((i % 64) + 64) % 64];
    const b = points[(((i + 1) % 64) + 64) % 64];
    const s = (1 - Math.cos(f * Math.PI)) / 2;
    return (a + (b - a) * s) * amp;
  };
}
