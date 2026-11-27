// Skyline Courier — keyboard and mouse, read as one stick. Arrows or WASD
// fly the plane, the mouse can steer by pointing, and the wheel works the
// throttle, so the game answers whatever the pilot reaches for.

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, down: false, inside: false };
    this.wheelDelta = 0;
    this.pressed = new Set(); // keys pressed since the last frame was read
    this.canvas = canvas;

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (!e.repeat) this.pressed.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
      this.keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    });
    window.addEventListener('blur', () => this.keys.clear());

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
      this.mouse.inside = true;
    });
    canvas.addEventListener('mousedown', (e) => {
      this.mouse.down = true;
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
    });
    window.addEventListener('mouseup', () => { this.mouse.down = false; });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.wheelDelta += e.deltaY;
    }, { passive: false });
    canvas.addEventListener('mouseleave', () => { this.mouse.inside = false; });
  }

  down(...names) {
    return names.some((n) => this.keys.has(n));
  }

  wasPressed(...names) {
    return names.some((n) => this.pressed.has(n));
  }

  endFrame() {
    this.pressed.clear();
    this.wheelDelta = 0;
  }

  // -1 (nose down) to +1 (nose up) from keys, or from where the mouse points.
  pitchCommand(planeScreenY, viewHeight) {
    let cmd = 0;
    if (this.down('ArrowUp', 'w')) cmd += 1;
    if (this.down('ArrowDown', 's')) cmd -= 1;
    if (cmd !== 0) return cmd;
    if (this.mouse.inside && !this.mouse.down) {
      const dy = planeScreenY - this.mouse.y;
      if (Math.abs(dy) > 24) return Math.max(-1, Math.min(1, dy / (viewHeight * 0.28)));
    }
    return 0;
  }

  // -1 to +1: throttle down or up.
  throttleCommand() {
    let cmd = 0;
    if (this.down('ArrowRight', 'e')) cmd += 1;
    if (this.down('ArrowLeft', 'q')) cmd -= 1;
    if (this.wheelDelta !== 0) cmd += this.wheelDelta < 0 ? 0.35 : -0.35;
    if (this.mouse.down) cmd += 0.6; // holding the mouse pours on power
    return Math.max(-1, Math.min(1, cmd));
  }

  // -1 to +1: bank left or right, which swings the heading.
  bankCommand() {
    let cmd = 0;
    if (this.down('a')) cmd -= 1;
    if (this.down('d')) cmd += 1;
    return cmd;
  }

  airbrake() {
    return this.down(' ');
  }
}
