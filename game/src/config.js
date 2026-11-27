// Skyline Courier — shared tuning numbers. One place for every constant the
// plane, the world and the HUD agree on, so a tweak here retunes the whole game.

export const CONFIG = {
  // Canvas the game is composed for; it scales to any window at run time.
  viewWidth: 1280,
  viewHeight: 720,

  // The world is measured in feet. The plane flies east (heading 090) over a
  // valley about twelve miles long before the route loops back to the start.
  worldLength: 64000,
  groundBase: 140,          // feet: the valley floor the runway sits on
  hillAmp1: 95,
  hillAmp2: 55,
  hillAmp3: 28,
  runwayX: 6000,           // feet: the near threshold of Pinefield runway
  runwayLength: 1500,
  runwayHeading: 90,

  // The little bush plane: a Skyhopper ST-2, flown by the courier Mira Sol.
  plane: {
    cruiseSpeed: 118,       // knots the throttle holds at full cruise
    minSpeed: 52,           // knots: below this the wing stops flying
    maxSpeed: 168,
    climbRate: 26,          // ft/s at full climb and cruise speed
    turnRate: 26,           // deg/s of heading change at full bank
    pitchRate: 1.9,         // rad/s the nose answers the stick
    maxPitch: 0.62,         // rad up or down
    fuelCapacity: 100,      // percent
    fuelBurn: 0.55,         // percent per second at full throttle
    glideSink: 9,           // ft/s the plane sinks with the engine out
  },

  // Scoring: rings pay, landings pay more, and a clean sortie pays best.
  score: {
    ring: 100,
    ringComboBonus: 25,     // extra per ring in an unbroken chain
    landing: 500,
    landingFuelBonus: 4,    // per percent of fuel left on touchdown
    sortieClear: 250,
  },

  lives: 3,
  ringsPerSortie: [5, 8, 11, 14],
  ringRadius: 42,           // feet: the golden hoop is this wide
  ringPassSlop: 26,         // feet of sideways slack when crossing a ring

  // A gentle headwind that gusts; it pushes the nose and the compass around.
  windBase: -6,             // knots, a headwind from the east
  windGust: 9,

  colours: {
    skyTop: '#2f6db3',
    skyMid: '#7fb2dd',
    skyLow: '#f6d9a0',
    sun: '#ffd66b',
    planeBody: '#e8641f',
    planeCream: '#f7ead2',
    ringGold: '#ffc233',
    runway: '#3c4148',
  },
};
