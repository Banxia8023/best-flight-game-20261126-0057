[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/Banxia8023/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/Banxia8023/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

# Skyline Courier

A little bush-plane flight game, made for the [make.fun best flight game bounty](https://make.fun/bounty/best-flight-game-20261126-0057).

You are Mira Sol, courier pilot of the Skyhopper ST-2, flying the evening mail
run over Pinefield Valley. Thread the golden rings strung along the route,
mind the fuel and the hills, then bring her home onto the grass runway at
Pinefield — gently, or the landing does not count. Each cleared sortie adds
more rings and a longer run; three lives, and the hangar bill is yours.

## How to fly

- **↑ / W** climb · **↓ / S** descend
- **← / →** throttle down / up
- **A / D** bank left / right (swings the heading and bleeds ground speed)
- **Mouse** steers by pointing · **wheel** works the throttle · **hold click** for power
- **Space** airbrake · **P** pause · **M** mute · **R** restart after game over

The HUD shows altitude (feet above the ground), speed (knots), heading, rate
of climb, fuel and throttle, plus an attitude ball and a compass ribbon.
Landings only count on runway 09, slow and level, once every ring is flown.
Running dry means a silent glide — pick a field, or better, the runway.

## Run it

The game is plain static files under `game/` — no build step, no network:

```sh
cd game
python3 -m http.server 8080
# open http://localhost:8080 in desktop Chrome
```

Or serve it the way the kit does, with `node serve.ts` from the kit starter.

## Hand it in

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/`
into `/output` and writes `/output/dossier.json` with the vendored make.fun
library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Run it twice and the two outputs are byte-identical.

## The game

- Original idea, art, sounds and names — drawn and synthesised in code, no
  assets loaded from anywhere.
- A procedural valley (seeded, so the same valley greets every pilot):
  layered hills, a river, pine woods, the town of Pinefield with lit windows,
  and the grass runway with edge lights and a windsock.
- WebAudio engine hum that follows the throttle, ring chimes, landing
  arpeggios and crash noise — all synthesised live, no audio files.
- Sorties with different goals: more rings each run, then a landing; fuel
  and damage turn each sortie into decisions.

## Layout

- `game/index.html` — the page, one canvas
- `game/src/config.js` — every tuning number in one place
- `game/src/random.js` — the seeded random source for the valley
- `game/src/terrain.js` — hills, river, trees, town, runway
- `game/src/plane.js` — the Skyhopper's flight model
- `game/src/input.js` — keyboard and mouse, read as one stick
- `game/src/audio.js` — synthesised WebAudio sounds
- `game/src/render.js` — sky, valley, plane and rings
- `game/src/hud.js` — instruments, compass, title and game-over screens
- `game/src/game.js` — states, sorties, rings, landings and crashes
- `game/src/main.js` — the front door and the `?shot=` screenshot presets
- `main.ts` — the hand-in program
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged

MIT licensed. Built by an AI agent session for the make.fun bounty.
