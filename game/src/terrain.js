// Skyline Courier — the valley. One deterministic height function, a river
// that cuts through it, pine woods, and the little town of Pinefield with its
// grass runway. Everything is placed from the fixed seed in random.js, so
// the terrain never changes between loads.

import { CONFIG } from './config.js';
import { makeRng, makeNoise1D } from './random.js';

const SEED = 20261126;

export class Terrain {
  constructor() {
    const rng = makeRng(SEED);
    this.phase1 = rng() * Math.PI * 2;
    this.phase2 = rng() * Math.PI * 2;
    this.phase3 = rng() * Math.PI * 2;
    this.rough = makeNoise1D(SEED + 7, 900, 26);

    const { runwayX, runwayLength, groundBase } = CONFIG;
    this.runway = { x0: runwayX, x1: runwayX + runwayLength, height: groundBase };
    // The river bends through the valley a couple of miles past the runway.
    this.river = { x0: 9200, x1: 13400 };
    this.riverDip = 46;

    // Pine woods: clumps of trees where the slope is gentle and the ground
    // is clear of the river, the town and the runway.
    this.trees = [];
    for (let x = 400; x < CONFIG.worldLength; x += 90) {
      const h = this.heightAt(x);
      const nearRunway = x > runwayX - 700 && x < runwayX + runwayLength + 700;
      const inRiver = x > this.river.x0 - 260 && x < this.river.x1 + 260;
      const inTown = x > 4200 && x < 5600;
      if (nearRunway || inRiver || inTown) continue;
      if (rng() < 0.42) {
        this.trees.push({ x, h, size: 26 + rng() * 34, kind: rng() < 0.7 ? 'pine' : 'round' });
      }
    }

    // Pinefield town: a row of houses with lit windows beside the runway.
    this.houses = [];
    for (let i = 0; i < 9; i++) {
      const x = 4300 + i * 150 + rng() * 60;
      this.houses.push({
        x,
        h: this.heightAt(x),
        w: 64 + rng() * 42,
        tall: 44 + rng() * 34,
        roof: rng() < 0.5 ? 'gable' : 'flat',
        lit: rng() < 0.8,
      });
    }

    // Clouds drift above the valley; the far ridge never moves.
    this.clouds = [];
    for (let i = 0; i < 14; i++) {
      this.clouds.push({
        x: rng() * CONFIG.worldLength,
        y: 620 + rng() * 420,
        scale: 0.7 + rng() * 1.1,
        speed: 6 + rng() * 10,
      });
    }
  }

  // Ground height in feet at world x. Hills are layered sines over a base,
  // flattened to the runway height across the strip, and dipped where the
  // river runs so the water sits in a little channel.
  heightAt(x) {
    const { groundBase, hillAmp1, hillAmp2, hillAmp3, runwayX, runwayLength } = CONFIG;
    let h = groundBase
      + hillAmp1 * Math.sin(x * 0.00042 + this.phase1)
      + hillAmp2 * Math.sin(x * 0.0011 + this.phase2)
      + hillAmp3 * Math.sin(x * 0.0027 + this.phase3)
      + this.rough(x);
    const flat = smoothBlend(x, runwayX - 500, runwayX + runwayLength + 1000);
    h = h * (1 - flat) + groundBase * flat;
    const river = gaussianDip(x, (this.river.x0 + this.river.x1) / 2, 1900) * this.riverDip;
    return h - river;
  }

  isOverRunway(x) {
    return x >= this.runway.x0 && x <= this.runway.x1;
  }

  isOverRiver(x) {
    return x >= this.river.x0 && x <= this.river.x1;
  }
}

function smoothBlend(x, a, b) {
  // 0 before a, 1 after b, eased across the join so the strip meets the hills.
  if (x <= a) return 0;
  if (x >= b) return 1;
  const t = (x - a) / (b - a);
  return t * t * (3 - 2 * t);
}

function gaussianDip(x, centre, spread) {
  const d = (x - centre) / spread;
  return Math.exp(-d * d);
}
