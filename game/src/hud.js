// Skyline Courier — the instruments. A lit panel with altitude, speed and
// heading, a fuel and throttle gauge, a compass ribbon, and the title and
// game-over screens that frame the flight.

import { CONFIG } from './config.js';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(10, 22, 38, 0.72)';
  ctx.strokeStyle = 'rgba(255, 214, 107, 0.55)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function label(ctx, text, x, y, colour = '#9fc3e8') {
  ctx.fillStyle = colour;
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(text, x, y);
}

function value(ctx, text, x, y, colour = '#ffffff') {
  ctx.fillStyle = colour;
  ctx.font = '700 26px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(text, x, y);
}

// The little attitude ball: a horizon that tilts with the nose.
function drawAttitude(ctx, x, y, r, pitch) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#2f6db3';
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.translate(x, y);
  ctx.rotate(-pitch);
  ctx.fillStyle = '#7fae56';
  ctx.fillRect(-r, 0, r * 2, r);
  ctx.fillStyle = '#f7ead2';
  ctx.fillRect(-r, -1.5, r * 2, 3);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255, 214, 107, 0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  // Fixed wings: the little plane never moves, the world does.
  ctx.fillStyle = '#ffd66b';
  ctx.fillRect(x - r * 0.7, y - 2, r * 0.55, 4);
  ctx.fillRect(x + r * 0.15, y - 2, r * 0.55, 4);
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fill();
}

export function drawHUD(ctx, w, h, game) {
  const plane = game.plane;
  const agl = Math.max(0, Math.round(plane.altitudeAgl(game.terrain)));
  const vsFpm = Math.round(plane.verticalSpeed * 60);

  // Top-left: the instrument panel, lamps on.
  panel(ctx, 16, 14, 300, 118);
  drawAttitude(ctx, 52, 73, 30, plane.pitch);
  label(ctx, 'ALT · FT AGL', 96, 40);
  value(ctx, String(agl), 96, 66);
  label(ctx, 'SPD · KT', 196, 40);
  value(ctx, String(Math.round(plane.speed)), 196, 66);
  label(ctx, 'HDG', 96, 96);
  value(ctx, String(Math.round(plane.heading)).padStart(3, '0') + '°', 96, 118, '#ffd66b');
  label(ctx, 'V/S · FT/MIN', 196, 96);
  value(ctx, (vsFpm >= 0 ? '+' : '') + vsFpm, 196, 118, vsFpm >= 0 ? '#8fd694' : '#ff9a7a');

  // Top-right: score, sortie and lives.
  panel(ctx, w - 236, 14, 220, 118);
  label(ctx, 'SCORE', w - 220, 40);
  value(ctx, String(game.score), w - 220, 66, '#ffd66b');
  label(ctx, 'SORTIE ' + game.sortie + ' · ' + game.missionText, w - 220, 96, '#cfe3f5');
  drawLives(ctx, w - 220, 116, game.lives);

  // Bottom-left: fuel and throttle.
  panel(ctx, 16, h - 78, 240, 62);
  label(ctx, 'FUEL', 30, h - 56);
  bar(ctx, 30, h - 48, 96, 12, plane.fuel / 100, plane.fuel < 25 ? '#ff6a4d' : '#8fd694');
  label(ctx, 'THR', 146, h - 56);
  bar(ctx, 146, h - 48, 96, 12, plane.throttle, '#ffd66b');
  if (plane.engineOut) {
    ctx.fillStyle = '#ff6a4d';
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.fillText('ENGINE OUT — GLIDE TO THE RUNWAY', 30, h - 26);
  } else if (plane.stalled) {
    ctx.fillStyle = '#ff9a7a';
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.fillText('STALL — NOSE DOWN, POWER UP', 30, h - 26);
  }

  // Bottom-centre: the compass ribbon, 090 in the middle.
  drawCompass(ctx, w / 2, h - 34, plane.heading);

  // Bottom-right: the quiet reminder of the controls.
  ctx.fillStyle = 'rgba(230, 240, 250, 0.75)';
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('↑↓ pitch · ←→ throttle · A/D turn · mouse steers · M mute · P pause', w - 16, h - 18);

  // Centre banners: ring chimes, touchdowns, sortie changes.
  if (game.banner && game.banner.alpha > 0.01) {
    ctx.save();
    ctx.globalAlpha = game.banner.alpha;
    ctx.fillStyle = '#fff';
    ctx.font = '700 34px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 12;
    ctx.fillText(game.banner.text, w / 2, h * 0.3);
    if (game.banner.sub) {
      ctx.font = '600 17px system-ui, sans-serif';
      ctx.fillText(game.banner.sub, w / 2, h * 0.3 + 30);
    }
    ctx.restore();
  }
}

function bar(ctx, x, y, w, h, frac, colour) {
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  roundRect(ctx, x, y, w, h, 4);
  ctx.fill();
  if (frac > 0.01) {
    ctx.fillStyle = colour;
    roundRect(ctx, x, y, Math.max(6, w * frac), h, 4);
    ctx.fill();
  }
}

function drawLives(ctx, x, y, lives) {
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < lives ? '#ffd66b' : 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.moveTo(x + i * 26, y - 4);
    ctx.lineTo(x + i * 26 + 18, y - 4);
    ctx.lineTo(x + i * 26 + 14, y + 2);
    ctx.lineTo(x + i * 26 + 4, y + 2);
    ctx.closePath();
    ctx.fill();
  }
}

function drawCompass(ctx, cx, y, heading) {
  ctx.fillStyle = 'rgba(10, 22, 38, 0.72)';
  roundRect(ctx, cx - 130, y - 16, 260, 32, 8);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - 130, y - 16, 260, 32);
  ctx.clip();
  ctx.fillStyle = '#9fc3e8';
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (let d = 0; d < 360; d += 15) {
    let diff = d - heading;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    const sx = cx + diff * 2.2;
    if (sx < cx - 130 || sx > cx + 130) continue;
    const major = d % 45 === 0;
    ctx.fillText(major ? String(d).padStart(3, '0') : '·', sx, y + (major ? 12 : 4));
  }
  ctx.restore();
  ctx.fillStyle = '#ffd66b';
  ctx.beginPath();
  ctx.moveTo(cx, y - 16);
  ctx.lineTo(cx - 6, y - 26);
  ctx.lineTo(cx + 6, y - 26);
  ctx.closePath();
  ctx.fill();
}

export function drawTitle(ctx, w, h, best, t) {
  ctx.fillStyle = 'rgba(8, 18, 34, 0.45)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd66b';
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.fillText('PINEFIELD VALLEY · EVENING MAIL RUN', w / 2, h * 0.2);
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 64px system-ui, sans-serif';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 18;
  ctx.fillText('SKYLINE COURIER', w / 2, h * 0.2 + 72);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#dcebf8';
  ctx.font = '400 19px system-ui, sans-serif';
  ctx.fillText('Fly Mira Sol’s little Skyhopper through the golden rings,', w / 2, h * 0.2 + 112);
  ctx.fillText('then bring her home onto the grass runway at Pinefield.', w / 2, h * 0.2 + 140);
  // The blinking invitation.
  if (Math.sin(t * 4) > -0.2) {
    ctx.fillStyle = '#ffd66b';
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.fillText('— PRESS ENTER OR CLICK TO FLY —', w / 2, h * 0.62);
  }
  ctx.fillStyle = 'rgba(230, 240, 250, 0.9)';
  ctx.font = '15px system-ui, sans-serif';
  const lines = [
    '↑ / W climb · ↓ / S descend · ← / → throttle · A / D turn',
    'Mouse steers by pointing · wheel works the throttle · hold click for power',
    'Space airbrake · P pause · M mute · R restart',
    'Rings pay 100 · a gentle landing pays 500 · mind the fuel and the hills',
  ];
  lines.forEach((line, i) => ctx.fillText(line, w / 2, h * 0.7 + i * 24));
  if (best > 0) {
    ctx.fillStyle = '#ffd66b';
    ctx.font = '700 16px system-ui, sans-serif';
    ctx.fillText('BEST SCORE  ' + best, w / 2, h * 0.7 + lines.length * 24 + 18);
  }
}

export function drawGameOver(ctx, w, h, game, best) {
  ctx.fillStyle = 'rgba(8, 14, 26, 0.62)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff9a7a';
  ctx.font = '800 52px system-ui, sans-serif';
  ctx.fillText('OUT OF LIVES', w / 2, h * 0.38);
  ctx.fillStyle = '#ffffff';
  ctx.font = '400 20px system-ui, sans-serif';
  ctx.fillText('The Skyhopper is in the hangar for repairs. The valley will wait.', w / 2, h * 0.38 + 40);
  ctx.fillStyle = '#ffd66b';
  ctx.font = '700 30px system-ui, sans-serif';
  ctx.fillText('SCORE  ' + game.score, w / 2, h * 0.38 + 96);
  ctx.fillStyle = '#dcebf8';
  ctx.font = '400 17px system-ui, sans-serif';
  ctx.fillText('Best  ' + Math.max(best, game.score) + '  ·  Sortie ' + game.sortie + '  ·  Rings ' + game.ringsCollected, w / 2, h * 0.38 + 128);
  if (Math.sin(Date.now() / 300) > -0.2) {
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 20px system-ui, sans-serif';
    ctx.fillText('PRESS R TO FLY AGAIN', w / 2, h * 0.38 + 176);
  }
}

export function drawPaused(ctx, w, h) {
  ctx.fillStyle = 'rgba(8, 14, 26, 0.5)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = '800 44px system-ui, sans-serif';
  ctx.fillText('PAUSED', w / 2, h * 0.45);
  ctx.font = '400 18px system-ui, sans-serif';
  ctx.fillStyle = '#dcebf8';
  ctx.fillText('Press P to keep flying', w / 2, h * 0.45 + 36);
}
