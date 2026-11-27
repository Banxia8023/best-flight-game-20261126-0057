// Skyline Courier — the game itself. States, sorties, rings, landings and
// crashes, and the wind that keeps every flight a little different.

import { CONFIG } from './config.js';
import { Terrain } from './terrain.js';
import { Plane } from './plane.js';
import { SoundEngine } from './audio.js';
import { Input } from './input.js';
import { cameraFor, drawSky, drawTerrain, drawRings, drawPlane, drawPlaneShadow, drawSpeedLines, worldToScreen } from './render.js';
import { drawHUD, drawTitle, drawGameOver, drawPaused } from './hud.js';
import { makeRng } from './random.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.terrain = new Terrain();
    this.plane = new Plane();
    this.input = new Input(canvas);
    this.sound = new SoundEngine();
    this.state = 'title'; // title | playing | paused | gameover
    this.score = 0;
    this.best = 0;
    try { this.best = Number(window.localStorage.getItem('skyline-courier-best') || 0); } catch (e) { /* private mode */ }
    this.lives = CONFIG.lives;
    this.sortie = 1;
    this.rings = [];
    this.ringsCollected = 0;
    this.ringsNeeded = 0;
    this.combo = 0;
    this.banner = null;
    this.wind = CONFIG.windBase;
    this.time = 0;
    this.crashTimer = 0;
    this.landTimer = 0;
    this.demo = false;
    this.missionText = '';
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.startSortie(1);
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(window.innerWidth * dpr);
    this.canvas.height = Math.floor(window.innerHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.viewWidth = window.innerWidth;
    this.viewHeight = window.innerHeight;
  }

  // A sortie is one mail run: a line of golden rings, then home to Pinefield.
  startSortie(n) {
    this.sortie = n;
    const count = CONFIG.ringsPerSortie[Math.min(n - 1, CONFIG.ringsPerSortie.length - 1)];
    this.ringsNeeded = count;
    this.ringsCollected = 0;
    this.combo = 0;
    const rng = makeRng(1000 + n * 77);
    this.rings = [];
    // The first ring is always an easy one, dead ahead at cruise height.
    let x = this.plane.x + 1400;
    let alt = 320 + rng() * 120;
    for (let i = 0; i < count; i++) {
      this.rings.push({ x, y: alt, collected: false });
      x += 1500 + rng() * 900;
      alt = 240 + rng() * 420;
      if (i === count - 2) alt = CONFIG.groundBase + 90; // the last ring sits low, over the runway
      if (i === count - 1) { x = CONFIG.runwayX - 900; alt = CONFIG.groundBase + 110; }
    }
    this.missionText = `RINGS ${this.ringsCollected}/${count} · LAND 09`;
    if (this.state === 'playing') {
      this.showBanner(`SORTIE ${n}`, count + ' rings, then home to Pinefield');
    }
  }

  showBanner(text, sub = '') {
    this.banner = { text, sub, alpha: 1, ttl: 2.6 };
  }

  reset() {
    this.score = 0;
    this.lives = CONFIG.lives;
    this.plane.reset(400, 320);
    this.state = 'playing';
    this.startSortie(1);
    this.showBanner('SORTIE 1', 'Five rings, then land at Pinefield');
  }

  // Screenshot presets: put the plane somewhere worth photographing and let
  // the demo pilot hold her steady there.
  applyShot(name) {
    this.demo = true;
    if (name === 'title') {
      this.state = 'title';
      this.plane.reset(400, 320);
      return;
    }
    this.state = 'playing';
    if (name === 'flight') {
      const ground = this.terrain.heightAt(2600);
      this.plane.reset(2600, Math.max(330, ground + 180));
      this.plane.demoTargetAlt = this.plane.y;
      this.score = 100;
      this.ringsCollected = 1;
      this.startSortie(1);
      this.banner = null;
      this.rings[0].collected = true;
      this.rings[1].x = this.plane.x + 700;
      this.rings[1].y = this.plane.y;
      this.rings[2].x = this.plane.x + 1500;
      this.rings[2].y = this.plane.y + 50;
      this.missionText = 'RINGS 1/5 · LAND 09';
    } else if (name === 'runway') {
      this.plane.reset(CONFIG.runwayX - 500, 0);
      this.plane.y = this.terrain.heightAt(this.plane.x) + 110;
      this.plane.demoFollowTerrain = true;
      this.plane.speed = 92;
      this.plane.throttle = 0.5;
      this.score = 500;
      this.ringsCollected = 5;
      this.startSortie(1);
      this.rings.forEach((r) => { r.collected = true; });
      this.missionText = 'FINAL · LAND 09';
      this.showBanner('FINAL APPROACH', 'Runway 09 · gear down · nice and easy');
    } else if (name === 'rings') {
      const ground = this.terrain.heightAt(5200);
      this.plane.reset(5200, Math.max(420, ground + 200));
      this.plane.demoTargetAlt = this.plane.y;
      this.score = 300;
      this.ringsCollected = 3;
      this.startSortie(1);
      this.banner = null;
      this.rings[0].collected = true;
      this.rings[1].collected = true;
      this.rings[2].collected = true;
      this.rings[3].x = this.plane.x + 620;
      this.rings[3].y = this.plane.y;
      this.rings[4].x = this.plane.x + 1900;
      this.rings[4].y = this.plane.y + 80;
      this.missionText = 'RINGS 3/5 · LAND 09';
    }
  }

  update(dt) {
    this.time += dt;
    // The wind gusts slowly, a sine with a long breath.
    this.wind = CONFIG.windBase + Math.sin(this.time * 0.11) * CONFIG.windGust;

    if (this.banner) {
      this.banner.ttl -= dt;
      this.banner.alpha = Math.max(0, Math.min(1, this.banner.ttl));
      if (this.banner.ttl <= 0) this.banner = null;
    }

    if (this.state === 'title') {
      // The valley drifts by behind the title, the plane circling overhead.
      this.plane.x += 60 * dt;
      this.plane.y = 340 + Math.sin(this.time * 0.5) * 30;
      this.plane.pitch = Math.cos(this.time * 0.5) * 0.08;
      this.plane.propAngle += 20 * dt;
      if (this.input.wasPressed('Enter', ' ') || this.input.mouse.down) {
        this.sound.ensure();
        this.sound.click();
        this.reset();
      }
      this.input.endFrame();
      return;
    }

    if (this.state === 'gameover') {
      if (this.input.wasPressed('r', 'R', 'Enter', ' ')) {
        this.sound.click();
        this.reset();
      }
      this.input.endFrame();
      return;
    }

    if (this.state === 'paused') {
      if (this.input.wasPressed('p', 'P', 'Escape')) this.state = 'playing';
      this.input.endFrame();
      return;
    }

    // --- playing ---
    if (this.input.wasPressed('p', 'P', 'Escape')) {
      this.state = 'paused';
      this.input.endFrame();
      return;
    }
    if (this.input.wasPressed('m', 'M')) this.sound.toggleMute();

    const cam = cameraFor(this.plane, this.viewWidth, this.viewHeight);
    const planeScreenY = cam.planeScreenY;
    const pitchCmd = this.demo ? 0 : this.input.pitchCommand(planeScreenY, this.viewHeight);
    const throttleCmd = this.demo ? 0 : this.input.throttleCommand();
    const bankCmd = this.demo ? 0 : this.input.bankCommand();
    const brake = this.demo ? false : this.input.airbrake();

    if (this.crashTimer > 0) {
      this.crashTimer -= dt;
      this.plane.propAngle += 2 * dt;
      if (this.crashTimer <= 0) this.afterCrash();
      this.input.endFrame();
      return;
    }
    if (this.landTimer > 0) {
      this.landTimer -= dt;
      this.plane.speed = Math.max(0, this.plane.speed - 60 * dt);
      this.plane.x += (this.plane.speed * 1.68781) * dt;
      if (this.landTimer <= 0) this.afterLanding();
      this.input.endFrame();
      return;
    }

    this.plane.update(dt, { pitch: pitchCmd, throttle: throttleCmd, bank: bankCmd, brake }, this.terrain, this.wind, this.demo);
    this.sound.setEngine(this.plane.throttle, this.state === 'playing');

    // Stall warning, once a second at most.
    if (this.plane.stalled && !this.demo && Math.floor(this.time * 2) !== Math.floor((this.time - dt) * 2)) {
      this.sound.stallWarning();
    }

    // Rings: crossing one's x near its height collects it.
    for (const ring of this.rings) {
      if (ring.collected) continue;
      const crossed = this.plane.x >= ring.x - 8 && this.plane.x <= ring.x + 60;
      const near = Math.abs(this.plane.y - ring.y) < CONFIG.ringRadius + CONFIG.ringPassSlop;
      if (crossed && near) {
        ring.collected = true;
        this.ringsCollected++;
        this.combo++;
        const pts = CONFIG.score.ring + CONFIG.score.ringComboBonus * (this.combo - 1);
        this.score += pts;
        this.sound.chime(this.combo);
        this.showBanner(`RING  +${pts}`, this.combo > 1 ? `Combo ×${this.combo}` : '');
        this.missionText = `RINGS ${this.ringsCollected}/${this.ringsNeeded} · LAND 09`;
        if (this.ringsCollected === this.ringsNeeded) {
          this.showBanner('ALL RINGS!', 'Now land on runway 09 at Pinefield');
          this.missionText = 'ALL RINGS · LAND 09!';
        }
      }
    }

    // The ground: a gentle kiss on the strip is a landing, anything else
    // at speed is a crash.
    const agl = this.plane.altitudeAgl(this.terrain);
    if (agl <= 0) {
      const quality = this.plane.landingQuality(this.terrain);
      if (quality === 'good' && this.ringsCollected >= this.ringsNeeded) {
        this.landTimer = 1.6;
        this.plane.y = this.terrain.heightAt(this.plane.x);
        const fuelBonus = Math.round(this.plane.fuel) * CONFIG.score.landingFuelBonus;
        this.score += CONFIG.score.landing + fuelBonus;
        this.sound.land();
        this.showBanner(`TOUCHDOWN!  +${CONFIG.score.landing + fuelBonus}`, 'Fuel bonus included — nicely flown');
      } else if (quality === 'good') {
        // Landed early: a safe stop, but the sortie is not finished.
        this.landTimer = 1.2;
        this.plane.y = this.terrain.heightAt(this.plane.x);
        this.sound.land();
        this.showBanner('LANDED EARLY', 'The rings are still out there — take off again');
      } else {
        this.crash(quality === 'hard' ? 'Too hard on the ground.' : 'Too fast for the strip.');
      }
    }

    // Out of fuel over the hills is a glide, not a crash — until the ground.
    this.input.endFrame();
  }

  crash(reason) {
    this.sound.crash();
    this.sound.setEngine(0, false);
    this.crashTimer = 1.4;
    this.lives--;
    this.combo = 0;
    this.showBanner('CRASH!', reason);
    this.plane.y = this.terrain.heightAt(this.plane.x);
  }

  afterCrash() {
    if (this.lives <= 0) {
      this.state = 'gameover';
      if (this.score > this.best) {
        this.best = this.score;
        try { window.localStorage.setItem('skyline-courier-best', String(this.best)); } catch (e) { /* ignore */ }
      }
    } else {
      // Back in the air, a little shaken, over the valley start.
      this.plane.reset(400, 340);
      this.plane.refuel();
      this.showBanner(`LIVES LEFT: ${this.lives}`, 'Watch the hills this time');
    }
  }

  afterLanding() {
    if (this.ringsCollected >= this.ringsNeeded) {
      this.score += CONFIG.score.sortieClear;
      this.plane.refuel();
      this.plane.reset(400, 340);
      this.startSortie(this.sortie + 1);
      this.showBanner(`SORTIE ${this.sortie} CLEAR  +${CONFIG.score.sortieClear}`, 'Fuelled up — the next run is waiting');
    } else {
      // Early landing: roll back out and take off from the strip.
      this.plane.reset(CONFIG.runwayX + 200, CONFIG.groundBase + 140);
      this.plane.refuel();
      this.showBanner('BACK IN THE AIR', `${this.ringsNeeded - this.ringsCollected} rings still to fly`);
    }
  }

  render() {
    const ctx = this.ctx;
    const w = this.viewWidth;
    const h = this.viewHeight;
    const cam = cameraFor(this.plane, w, h);
    drawSky(ctx, w, h, this.time, this.plane, this.terrain);
    drawTerrain(ctx, w, h, cam, this.plane, this.terrain, this.time);
    drawRings(ctx, cam, this.plane, this.rings, this.time);
    drawPlaneShadow(ctx, cam, this.plane, this.terrain);
    if (this.state !== 'title') {
      const p = worldToScreen(cam, h, this.plane.x, this.plane.y);
      drawPlane(ctx, p.x, p.y, this.plane.pitch, 1, this.plane.propAngle, this.plane.gearDown, this.time);
    } else {
      // The title plane: bigger, circling over the valley, clear of the text.
      drawPlane(ctx, w * 0.5, h * 0.48, this.plane.pitch, 1.5, this.plane.propAngle, false, this.time);
    }
    drawSpeedLines(ctx, w, h, this.plane.speed, this.time);

    if (this.state === 'title') drawTitle(ctx, w, h, this.best, this.time);
    else if (this.state === 'gameover') drawGameOver(ctx, w, h, this, this.best);
    else {
      drawHUD(ctx, w, h, this);
      if (this.state === 'paused') drawPaused(ctx, w, h);
    }

    // Screen-reader status, updated a few times a second at most.
    if (Math.floor(this.time * 4) !== Math.floor((this.time - 1 / 60) * 4)) {
      const status = document.getElementById('status');
      if (status) {
        status.textContent = this.state === 'playing'
          ? `Score ${this.score}, altitude ${Math.round(this.plane.altitudeAgl(this.terrain))} feet, speed ${Math.round(this.plane.speed)} knots, heading ${Math.round(this.plane.heading)}, fuel ${Math.round(this.plane.fuel)} percent`
          : this.state;
      }
    }
  }
}
