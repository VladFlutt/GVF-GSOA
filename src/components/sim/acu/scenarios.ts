import type { Mode, SimState } from "./engine";

export interface Scenario {
  /** Which extra controls the learner gets beside the ACU. */
  controls: { helm?: boolean; rain?: boolean; cables?: boolean };
  initial: () => SimState;
  /** Goal checks, in order; the task is complete when all pass. */
  goals: ((s: SimState) => boolean)[];
}

// Look angles from Piraeus (37.94N 23.63E).
const SATS = [
  { name: "EUTELSAT 7B", lon: 7, az: 199.6, el: 42.3 },
  { name: "HELLAS SAT 3", lon: 39, az: 158.5, el: 42.6 },
  { name: "SES-5", lon: 5, az: 203.5, el: 41.5 },
];

function base(over: Partial<SimState> = {}): SimState {
  return {
    mode: "TRACKING",
    modeTicks: 10,
    heading: 100,
    gyro: true,
    satellites: SATS,
    sat: 0,
    antAz: SATS[0].az,
    antEl: SATS[0].el,
    rain: 0,
    signal: 780,
    fault: null,
    cableSeated: true,
    zones: [
      { from: 160, to: 200, physical: true }, // funnel aft
      { from: 145, to: 215, physical: false }, // programmed margin around it
    ],
    screen: "status",
    menu: null,
    modemNetTicks: 10,
    lat: 37.94,
    lon: 23.63,
    seen: { screens: ["status"], modes: ["TRACKING"], loadedSat: [], powerCycles: 0, reseated: false },
    ...over,
  };
}

const saw = (m: Mode) => (s: SimState) => s.seen.modes.includes(m);

export const scenarios: Record<string, Scenario> = {
  "explore-panel": {
    controls: {},
    initial: () => base(),
    goals: [(s) => ["status", "position", "nav"].every((x) => s.seen.screens.includes(x as SimState["screen"]))],
  },
  "power-up": {
    controls: {},
    initial: () => base({ mode: "OFF", modeTicks: 0, signal: 0, antAz: 300, antEl: 5, seen: { screens: [], modes: [], loadedSat: [], powerCycles: 0, reseated: false } }),
    goals: [saw("INIT"), saw("TARGET"), (s) => s.mode === "TRACKING"],
  },
  "power-up-no-gyro": {
    controls: {},
    initial: () =>
      base({ mode: "OFF", gyro: false, modeTicks: 0, signal: 0, antAz: 20, antEl: 5, seen: { screens: [], modes: [], loadedSat: [], powerCycles: 0, reseated: false } }),
    goals: [saw("SEARCH3"), (s) => s.mode === "TRACKING"],
  },
  "switch-satellite": {
    controls: {},
    initial: () => base(),
    goals: [(s) => s.seen.loadedSat.includes("HELLAS SAT 3"), (s) => s.mode === "TRACKING" && s.satellites[s.sat].name === "HELLAS SAT 3"],
  },
  blockage: {
    controls: { helm: true },
    initial: () => base(),
    goals: [saw("BLOCKING"), (s) => s.seen.modes.includes("BLOCKING") && s.mode === "TRACKING"],
  },
  "rain-fade": {
    controls: { rain: true },
    initial: () => base(),
    goals: [saw("SEARCH1"), (s) => s.seen.modes.includes("SEARCH1") && s.mode === "TRACKING" && s.rain < 50],
  },
  "comm-error": {
    controls: { cables: true },
    initial: () =>
      base({
        mode: "INIT",
        modeTicks: 9,
        fault: "comm",
        cableSeated: false,
        signal: 0,
        screen: "errors",
        modemNetTicks: 0,
        seen: { screens: ["errors"], modes: ["INIT"], loadedSat: [], powerCycles: 0, reseated: false },
      }),
    goals: [(s) => s.seen.reseated, (s) => s.seen.powerCycles > 0 && s.fault === null, (s) => s.mode === "TRACKING"],
  },
};
