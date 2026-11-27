// Skyline Courier — the Skyhopper ST-2 and how it flies. An arcade flight
// model with real trade-offs: throttle buys speed, the nose buys altitude,
// speed buys both, and a slow wing stops flying.

import { CONFIG } from './config.js';

const KNOTS_TO_FTPS = 1.68781;

export class Plane {
  constructor() {
    this.reset(400, 260);
  }

  reset(x, altitude) {
    this.x = x;                 // feet east along the valley
    this.y = altitude;          // feet above sea level (ground ~140)
    this.speed = 95;            // knots of airspeed
    this.pitch = 0;             // radians, + is nose up
    this.heading = 90;          // degrees, 090 is due east along the route
    this.throttle = 0.62;
    this.fuel = CONFIG.plane.fuelCapacity;
    this.gearDown = true;
    this.engineOut = false;
    this.stalled = false;
    this.propAngle = 0;
    this.verticalSpeed = 0;     // ft/s, for the HUD and the landing check
    this.groundSpeed = 0;       // knots over the ground
  }

  update(dt, input, terrain, windKnots, demo) {
    const P = CONFIG.plane;

    // The stick: pitch toward the commanded nose angle, eased so the plane
    // feels weighty instead of snapping.
    let pitchTarget = input.pitch;
    if (demo) pitchTarget = demoPitchTarget(this, terrain);
    const targetAngle = pitchTarget * P.maxPitch;
    const rate = P.pitchRate * dt;
    this.pitch += Math.max(-rate, Math.min(rate, targetAngle - this.pitch));

    // Bank swings the heading; flying off-course bleeds ground speed.
    this.heading += input.bank * P.turnRate * dt;
    this.heading = Math.max(45, Math.min(135, this.heading));
    const offCourse = Math.abs(this.heading - 90) * (Math.PI / 180);

    // Throttle: the lever moves at a steady rate, the wheel nudges it.
    if (demo) {
      this.throttle = demoThrottle(this);
    } else {
      this.throttle = Math.max(0, Math.min(1, this.throttle + input.throttle * dt * 0.55));
      if (input.brake) this.throttle = Math.max(0, this.throttle - dt * 1.4);
    }

    // Fuel burns with the throttle; an empty tank means a silent glide.
    if (this.throttle > 0 && this.fuel > 0) {
      this.fuel = Math.max(0, this.fuel - P.fuelBurn * this.throttle * dt);
    }
    this.engineOut = this.fuel <= 0;
    const power = this.engineOut ? 0 : this.throttle;

    // Speed: thrust against drag, climbing costs speed, diving buys it.
    const drag = 0.012 * this.speed * this.speed / 100;
    const thrust = power * 26;
    const climbCost = Math.sin(this.pitch) * 22;
    this.speed += (thrust - drag - climbCost) * dt;
    if (input.brake) this.speed -= 34 * dt;
    this.speed = Math.max(28, Math.min(P.maxSpeed, this.speed));

    // The wing: below minimum speed it stops lifting and the nose drops.
    this.stalled = this.speed < P.minSpeed;
    const speedFtps = this.speed * KNOTS_TO_FTPS;
    let climb = Math.sin(this.pitch) * speedFtps;
    if (this.stalled) climb = -P.glideSink * 2.2 - (P.minSpeed - this.speed) * 0.9;
    if (this.engineOut && !this.stalled) climb = Math.sin(this.pitch) * speedFtps - P.glideSink;
    this.verticalSpeed = climb;
    this.y += climb * dt;

    // Ground speed is what moves the world: airspeed along the heading,
    // plus the wind, which is a headwind from the east.
    this.groundSpeed = Math.max(0, this.speed * Math.cos(offCourse) + windKnots);
    this.x += (this.groundSpeed * KNOTS_TO_FTPS) * Math.cos(this.pitch) * dt;
    if (this.x > CONFIG.worldLength) this.x -= CONFIG.worldLength - 400;

    this.propAngle += (power * 28 + 4) * dt;
  }

  // Feet above the ground right now.
  altitudeAgl(terrain) {
    return this.y - terrain.heightAt(this.x);
  }

  // A landing counts when the wheels kiss the strip gently and slow.
  landingQuality(terrain) {
    if (!terrain.isOverRunway(this.x)) return null;
    const agl = this.altitudeAgl(terrain);
    if (agl > 6 || agl < -2) return null;
    if (Math.abs(this.verticalSpeed) > 14) return 'hard';
    if (this.speed > 105) return 'fast';
    if (Math.abs(this.pitch) > 0.16) return 'hard';
    return 'good';
  }

  refuel() {
    this.fuel = CONFIG.plane.fuelCapacity;
    this.engineOut = false;
  }
}

// In screenshot (demo) mode the plane flies itself: hold altitude, hold
// speed, and never argue with the terrain.
function demoPitchTarget(plane, terrain) {
  // On final approach the pilot follows the ground down to the strip,
  // staying a little high so the descent reads as a glide, not a dive.
  // The demo pilot never pitches hard on final: a gentle nose-down only.
  if (plane.demoFollowTerrain) {
    const targetAlt = terrain.heightAt(plane.x + 500) + 100;
    const err = (targetAlt - plane.y) / 160;
    return Math.max(-0.3, Math.min(0.3, err));
  }
  const targetAlt = plane.demoTargetAlt ?? 320;
  const agl = plane.y - terrain.heightAt(plane.x);
  if (agl < 120) return 0.9;
  const err = (targetAlt - plane.y) / 160;
  return Math.max(-0.8, Math.min(0.8, err));
}

function demoThrottle(plane) {
  if (plane.speed < 100) return 0.8;
  if (plane.speed > 125) return 0.5;
  return 0.65;
}
