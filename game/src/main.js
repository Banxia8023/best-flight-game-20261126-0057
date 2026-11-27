// Skyline Courier — the front door. Sizes the canvas, starts the game loop,
// and reads the ?shot= preset the screenshot run uses (title, flight,
// runway or rings). Nothing here needs the network: the whole game is local.

import { Game } from './game.js';

const canvas = document.getElementById('game');
const game = new Game(canvas);

// The screenshot presets are part of the game: a real render of the code,
// started in the state the maker wants to photograph.
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) game.applyShot(shot);

// Exposed for play-testing and screenshots: window.__game.state,
// window.__game.score and friends are the live game object.
window.__game = game;

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.update(dt);
  game.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
