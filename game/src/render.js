// Skyline Courier — everything the pilot sees, drawn on one canvas. The sky,
// the valley, the town, the runway, the golden rings, the Skyhopper itself
// and every instrument on the HUD are all drawn here from the game state.

import { CONFIG } from './config.js';

const SX = 0.9;   // px per foot, along the route
const SY = 0.55;  // px per foot, up into the sky

// Where the plane sits on screen; the world scrolls past it.
const PLANE_SCREEN_X = 0.36;
const PLANE_SCREEN_Y = 0.72;

export function cameraFor(plane, viewWidth, viewHeight) {
  return {
    x: plane.x - (viewWidth * PLANE_SCREEN_X) / SX,
    planeScreenX: viewWidth * PLANE_SCREEN_X,
    planeScreenY: viewHeight * PLANE_SCREEN_Y,
    planeAlt: plane.y,
  };
}

export function worldToScreen(cam, viewHeight, x, alt) {
  return {
    x: (x - cam.x) * SX,
    y: cam.planeScreenY - (alt - cam.planeAlt) * SY,
  };
}

export function drawSky(ctx, w, h, t, plane, terrain) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, CONFIG.colours.skyTop);
  g.addColorStop(0.45, CONFIG.colours.skyMid);
  g.addColorStop(0.8, CONFIG.colours.skyLow);
  g.addColorStop(1, '#e8b877');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Late-afternoon sun, low over the valley to the east.
  const sunX = w * 0.78;
  const sunY = h * 0.2;
  const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 150);
  glow.addColorStop(0, 'rgba(255, 224, 130, 0.95)');
  glow.addColorStop(0.25, 'rgba(255, 205, 100, 0.45)');
  glow.addColorStop(1, 'rgba(255, 205, 100, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - 160, sunY - 160, 320, 320);
  ctx.fillStyle = CONFIG.colours.sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
  ctx.fill();

  // The far ridge: a hazy blue silhouette that never moves with the plane.
  ctx.fillStyle = 'rgba(96, 128, 168, 0.55)';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.62);
  for (let x = 0; x <= w; x += 40) {
    const y = h * 0.62 - Math.sin(x * 0.004 + 1.3) * 46 - Math.sin(x * 0.011 + 4.1) * 22;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h * 0.62);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  // Drifting clouds, parallaxed against the plane's own progress.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  for (const c of terrain.clouds) {
    const cx = (((c.x - plane.x * 0.25 + t * c.speed) % CONFIG.worldLength) + CONFIG.worldLength) % CONFIG.worldLength;
    const sx = (cx / CONFIG.worldLength) * (w + 400) - 200;
    const sy = h * 0.12 + (c.y - 620) * 0.12;
    drawCloud(ctx, sx, sy, c.scale);
  }
}

function drawCloud(ctx, x, y, s) {
  ctx.beginPath();
  ctx.ellipse(x, y, 52 * s, 17 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 34 * s, y + 5 * s, 32 * s, 13 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 36 * s, y + 5 * s, 34 * s, 14 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawTerrain(ctx, w, h, cam, plane, terrain, t) {
  const groundAt = (sx) => {
    const wx = cam.x + sx / SX;
    const alt = terrain.heightAt(wx);
    return cam.planeScreenY - (alt - plane.y) * SY;
  };

  // The hills themselves: a green ribbon sampled across the screen.
  ctx.beginPath();
  ctx.moveTo(-4, h + 4);
  for (let sx = -4; sx <= w + 4; sx += 8) ctx.lineTo(sx, groundAt(sx));
  ctx.lineTo(w + 4, h + 4);
  ctx.closePath();
  const gg = ctx.createLinearGradient(0, h * 0.4, 0, h);
  gg.addColorStop(0, '#7fae56');
  gg.addColorStop(0.5, '#5d8f43');
  gg.addColorStop(1, '#476f33');
  ctx.fillStyle = gg;
  ctx.fill();

  // A darker second ridge just behind, for depth.
  ctx.fillStyle = 'rgba(58, 102, 52, 0.5)';
  ctx.beginPath();
  ctx.moveTo(-4, h + 4);
  for (let sx = -4; sx <= w + 4; sx += 12) {
    const wx = cam.x + sx / SX;
    const alt = terrain.heightAt(wx + 2600) * 0.55 + 120;
    ctx.lineTo(sx, cam.planeScreenY - (alt - plane.y) * SY - 26);
  }
  ctx.lineTo(w + 4, h + 4);
  ctx.closePath();
  ctx.fill();

  // The river: a blue band where the valley dips, shimmering a little.
  const r0 = (terrain.river.x0 - cam.x) * SX;
  const r1 = (terrain.river.x1 - cam.x) * SX;
  if (r1 > 0 && r0 < w) {
    ctx.beginPath();
    for (let sx = Math.max(0, r0); sx <= Math.min(w, r1); sx += 8) {
      ctx.lineTo(sx, groundAt(sx) - 2);
    }
    for (let sx = Math.min(w, r1); sx >= Math.max(0, r0); sx -= 8) {
      ctx.lineTo(sx, groundAt(sx) + 14 + Math.sin(sx * 0.05 + t * 2) * 1.5);
    }
    ctx.closePath();
    ctx.fillStyle = '#4f9fd8';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let sx = Math.max(0, r0); sx <= Math.min(w, r1); sx += 16) {
      ctx.moveTo(sx, groundAt(sx) + 5);
      ctx.lineTo(sx + 22, groundAt(sx) + 5);
    }
    ctx.stroke();
  }

  drawRunway(ctx, w, h, cam, plane, terrain, groundAt);
  drawTown(ctx, cam, plane, terrain, groundAt);
  drawTrees(ctx, cam, plane, terrain, groundAt);
}

function drawRunway(ctx, w, h, cam, plane, terrain, groundAt) {
  const { x0, x1 } = terrain.runway;
  const s0 = (x0 - cam.x) * SX;
  const s1 = (x1 - cam.x) * SX;
  if (s1 < -40 || s0 > w + 40) return;
  const gy0 = groundAt(Math.max(0, Math.min(w, s0)));
  const gy1 = groundAt(Math.max(0, Math.min(w, s1)));
  // The strip: dark asphalt lying flat on the valley floor.
  ctx.fillStyle = CONFIG.colours.runway;
  ctx.beginPath();
  ctx.moveTo(s0, gy0 - 8);
  ctx.lineTo(s1, gy1 - 8);
  ctx.lineTo(s1, gy1 + 2);
  ctx.lineTo(s0, gy0 + 2);
  ctx.closePath();
  ctx.fill();
  // Centreline dashes and the threshold bars.
  ctx.fillStyle = '#f2f2e8';
  const dashes = 14;
  for (let i = 0; i < dashes; i++) {
    const f = (i + 0.5) / dashes;
    const sx = s0 + (s1 - s0) * f;
    const sy = groundAt(sx);
    ctx.fillRect(sx - 14, sy - 5.5, 28, 3);
  }
  ctx.fillRect(s0 + 8, gy0 - 7, 10, 4);
  ctx.fillRect(s1 - 18, gy1 - 7, 10, 4);
  // Runway number 09 at the near threshold.
  ctx.fillStyle = '#f2f2e8';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('09', s0 + 52, gy0 - 12);
  // Edge lights, glowing amber in the evening.
  for (let i = 0; i <= 10; i++) {
    const f = i / 10;
    const sx = s0 + (s1 - s0) * f;
    const sy = groundAt(sx);
    ctx.fillStyle = '#ffcf4d';
    ctx.beginPath();
    ctx.arc(sx, sy - 10, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // The windsock by the threshold, pointing into the wind.
  const wsx = s0 - 30;
  const wsy = groundAt(Math.max(0, wsx));
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(wsx, wsy);
  ctx.lineTo(wsx, wsy - 42);
  ctx.stroke();
  ctx.fillStyle = '#ff7a2f';
  ctx.beginPath();
  ctx.moveTo(wsx, wsy - 42);
  ctx.lineTo(wsx - 26, wsy - 36);
  ctx.lineTo(wsx, wsy - 30);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(wsx - 13, wsy - 39);
  ctx.lineTo(wsx - 26, wsy - 36);
  ctx.lineTo(wsx - 13, wsy - 33);
  ctx.closePath();
  ctx.fill();
}

function drawTown(ctx, cam, plane, terrain, groundAt) {
  for (const house of terrain.houses) {
    const sx = (house.x - cam.x) * SX;
    if (sx < -120 || sx > 1400) continue;
    const gy = groundAt(sx);
    ctx.fillStyle = '#e8dcc0';
    ctx.fillRect(sx - house.w / 2, gy - house.tall, house.w, house.tall);
    ctx.fillStyle = house.roof === 'gable' ? '#a34d2d' : '#5a6b7a';
    ctx.beginPath();
    if (house.roof === 'gable') {
      ctx.moveTo(sx - house.w / 2 - 4, gy - house.tall);
      ctx.lineTo(sx, gy - house.tall - 20);
      ctx.lineTo(sx + house.w / 2 + 4, gy - house.tall);
    } else {
      ctx.rect(sx - house.w / 2, gy - house.tall - 6, house.w, 6);
    }
    ctx.closePath();
    ctx.fill();
    // Lit windows: Pinefield is home for the evening.
    ctx.fillStyle = house.lit ? '#ffd66b' : '#3a4a5a';
    ctx.fillRect(sx - house.w / 4 - 7, gy - house.tall + 12, 14, 14);
    ctx.fillRect(sx + house.w / 4 - 7, gy - house.tall + 12, 14, 14);
    ctx.fillStyle = '#4a3220';
    ctx.fillRect(sx - 8, gy - 24, 16, 24);
  }
}

function drawTrees(ctx, cam, plane, terrain, groundAt) {
  for (const tree of terrain.trees) {
    const sx = (tree.x - cam.x) * SX;
    if (sx < -60 || sx > 1400) continue;
    const gy = groundAt(sx);
    const s = tree.size;
    ctx.fillStyle = '#5a3d24';
    ctx.fillRect(sx - 2, gy - s * 0.3, 4, s * 0.3);
    if (tree.kind === 'pine') {
      ctx.fillStyle = '#2e6b34';
      for (let i = 0; i < 3; i++) {
        const wdt = s * (0.9 - i * 0.24);
        const top = gy - s * (0.25 + i * 0.26);
        ctx.beginPath();
        ctx.moveTo(sx, top - s * 0.3);
        ctx.lineTo(sx - wdt / 2, top + s * 0.22);
        ctx.lineTo(sx + wdt / 2, top + s * 0.22);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      ctx.fillStyle = '#3f7d3a';
      ctx.beginPath();
      ctx.arc(sx, gy - s * 0.55, s * 0.42, 0, Math.PI * 2);
      ctx.arc(sx - s * 0.3, gy - s * 0.35, s * 0.28, 0, Math.PI * 2);
      ctx.arc(sx + s * 0.3, gy - s * 0.35, s * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawRings(ctx, cam, plane, rings, t) {
  for (const ring of rings) {
    if (ring.collected) continue;
    const p = worldToScreen(cam, 0, ring.x, ring.y);
    if (p.x < -90 || p.x > 1400) continue;
    const rx = CONFIG.ringRadius * SX;
    const ry = CONFIG.ringRadius * SY;
    const pulse = 1 + Math.sin(t * 3 + ring.x * 0.01) * 0.05;
    // A golden hoop standing in the sky, glowing at its rim.
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(pulse, pulse);
    const glow = ctx.createRadialGradient(0, 0, rx * 0.6, 0, 0, rx * 1.25);
    glow.addColorStop(0, 'rgba(255, 194, 51, 0)');
    glow.addColorStop(0.8, 'rgba(255, 194, 51, 0.25)');
    glow.addColorStop(1, 'rgba(255, 194, 51, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-rx * 1.3, -ry * 1.3, rx * 2.6, ry * 2.6);
    ctx.lineWidth = 7;
    ctx.strokeStyle = CONFIG.colours.ringGold;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#fff3c4';
    ctx.beginPath();
    ctx.ellipse(0, 0, rx - 4, ry - 3, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// The Skyhopper ST-2: orange and cream, high wing, a spinning prop and
// landing lights that are on whenever she flies.
export function drawPlane(ctx, x, y, pitch, scale, propAngle, gearDown, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(pitch);
  ctx.scale(scale, scale);
  // Landing-light beam when low.
  // Propeller: a faint spinning disc and two thin blades.
  ctx.save();
  ctx.translate(46, 2);
  ctx.fillStyle = 'rgba(50, 50, 50, 0.14)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 4, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(propAngle);
  ctx.strokeStyle = 'rgba(40, 40, 40, 0.55)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(0, 22);
  ctx.stroke();
  ctx.fillStyle = 'rgba(40, 40, 40, 0.6)';
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Tail.
  ctx.fillStyle = CONFIG.colours.planeBody;
  ctx.beginPath();
  ctx.moveTo(-34, -2);
  ctx.lineTo(-50, -18);
  ctx.lineTo(-42, -18);
  ctx.lineTo(-30, -6);
  ctx.closePath();
  ctx.fill();
  // Fuselage.
  ctx.fillStyle = CONFIG.colours.planeBody;
  ctx.beginPath();
  ctx.moveTo(-52, 0);
  ctx.quadraticCurveTo(-40, -12, -8, -11);
  ctx.lineTo(30, -9);
  ctx.quadraticCurveTo(48, -6, 48, 1);
  ctx.quadraticCurveTo(48, 8, 30, 9);
  ctx.lineTo(-20, 10);
  ctx.quadraticCurveTo(-48, 9, -52, 0);
  ctx.closePath();
  ctx.fill();
  // Cream cheatline and lit windows.
  ctx.fillStyle = CONFIG.colours.planeCream;
  ctx.fillRect(-30, -6, 62, 5);
  ctx.fillStyle = '#bfe3ff';
  ctx.beginPath();
  ctx.arc(18, -5, 5, 0, Math.PI * 2);
  ctx.arc(4, -5, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd66b';
  ctx.beginPath();
  ctx.arc(-12, -4, 3.5, 0, Math.PI * 2);
  ctx.fill();
  // High wing.
  ctx.fillStyle = '#d14f12';
  ctx.beginPath();
  ctx.moveTo(-14, -11);
  ctx.lineTo(6, -11);
  ctx.lineTo(2, -26);
  ctx.lineTo(-22, -26);
  ctx.closePath();
  ctx.fill();
  // Landing gear.
  if (gearDown) {
    ctx.strokeStyle = '#2b2b2b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-8, 9);
    ctx.lineTo(-12, 20);
    ctx.moveTo(14, 9);
    ctx.lineTo(18, 20);
    ctx.stroke();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-12, 22, 5, 0, Math.PI * 2);
    ctx.arc(18, 22, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Wingtip nav lights.
  ctx.fillStyle = '#ff4444';
  ctx.beginPath();
  ctx.arc(-20, -24, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#44ff88';
  ctx.beginPath();
  ctx.arc(4, -24, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// The plane's soft shadow on the ground below, fading with height.
export function drawPlaneShadow(ctx, cam, plane, terrain) {
  const ground = terrain.heightAt(plane.x);
  const agl = plane.y - ground;
  if (agl > 700) return;
  const p = worldToScreen(cam, 0, plane.x, ground);
  const alpha = Math.max(0, 0.28 * (1 - agl / 700));
  ctx.fillStyle = `rgba(20, 30, 20, ${alpha})`;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 4, 46 * (1 - agl / 1400), 7, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawSpeedLines(ctx, w, h, speed, t) {
  if (speed < 130) return;
  const count = Math.floor((speed - 130) / 6);
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 2;
  for (let i = 0; i < count; i++) {
    const seed = i * 137.5 + Math.floor(t * 24) * 7;
    const y = (seed * 7919) % h;
    const x = (seed * 104729) % (w + 300) - 150;
    const len = 40 + (seed % 60);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y);
    ctx.stroke();
  }
}
