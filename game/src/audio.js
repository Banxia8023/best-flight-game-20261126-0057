// Skyline Courier — every sound is synthesised live with WebAudio. No audio
// files are loaded, so the game stays silent on the network and small on disk.

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.engineFilter = null;
    this.muted = false;
    this.started = false;
  }

  // Browsers only let audio start after a gesture; call from the first
  // keypress or click and the hum fades in from there.
  ensure() {
    if (this.started) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      // The engine: two detuned sawtooths through a low-pass, the way a
      // little piston engine drones when it works.
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 62;
      const second = this.ctx.createOscillator();
      second.type = 'sawtooth';
      second.frequency.value = 93;
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 320;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.0;
      this.engineOsc.connect(this.engineFilter);
      second.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engineOsc.start();
      second.start();
      this.secondOsc = second;
      this.started = true;
    } catch (e) {
      // No audio device, no problem: the game flies on silently.
      this.started = false;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  // The hum follows the throttle: faster and louder as the pilot pushes in.
  setEngine(throttle, flying) {
    if (!this.started || !this.ctx) return;
    const t = this.ctx.currentTime;
    const target = flying ? 0.045 + throttle * 0.075 : 0.0;
    this.engineGain.gain.setTargetAtTime(target, t, 0.15);
    const freq = 52 + throttle * 58;
    this.engineOsc.frequency.setTargetAtTime(freq, t, 0.12);
    this.secondOsc.frequency.setTargetAtTime(freq * 1.5, t, 0.12);
    this.engineFilter.frequency.setTargetAtTime(240 + throttle * 420, t, 0.2);
  }

  blip(freq, dur, type, vol, when = 0) {
    if (!this.started || !this.ctx || this.muted) return;
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  // A golden ring sings a bright two-note chime.
  chime(combo) {
    const lift = Math.min(combo, 6) * 40;
    this.blip(880 + lift, 0.16, 'sine', 0.22);
    this.blip(1318 + lift, 0.28, 'sine', 0.2, 0.09);
  }

  // A touchdown is a soft thump and a rising little arpeggio.
  land() {
    this.blip(140, 0.18, 'triangle', 0.3);
    this.blip(523, 0.14, 'sine', 0.18, 0.1);
    this.blip(659, 0.14, 'sine', 0.18, 0.2);
    this.blip(784, 0.24, 'sine', 0.2, 0.3);
  }

  // A crash is filtered noise bursting and dying fast.
  crash() {
    if (!this.started || !this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * 0.5);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.5;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t);
    this.blip(70, 0.4, 'sine', 0.3);
  }

  click() {
    this.blip(660, 0.07, 'square', 0.08);
  }

  stallWarning() {
    this.blip(440, 0.12, 'square', 0.07);
    this.blip(440, 0.12, 'square', 0.07, 0.16);
  }
}
