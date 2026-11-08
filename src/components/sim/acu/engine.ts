/**
 * Behavioural model of a marine VSAT terminal: antenna control unit (ACU),
 * stabilised above-decks antenna (ADE) and satellite modem.
 * Pure functions only, so the model can be unit-tested and reused by other courses.
 */

export type Mode = "OFF" | "BOOT" | "INIT" | "TARGET" | "SEARCH1" | "SEARCH3" | "TRACKING" | "BLOCKING";
export type Fault = null | "comm";
export type Screen = "status" | "position" | "nav" | "errors";
export type Key = "up" | "down" | "left" | "right" | "ok" | "menu" | "back" | "power";

export interface Satellite {
  name: string;
  /** Longitude, degrees east. */
  lon: number;
  /** True azimuth and elevation from the ship's current position. */
  az: number;
  el: number;
}

export interface Zone {
  /** Sector relative to the bow, degrees clockwise. */
  from: number;
  to: number;
  physical: boolean;
}

export interface SimState {
  mode: Mode;
  modeTicks: number;
  heading: number;
  gyro: boolean;
  satellites: Satellite[];
  sat: number;
  /** Where the antenna is pointing (true azimuth, elevation). */
  antAz: number;
  antEl: number;
  rain: number; // 0..100
  signal: number; // 0..999 ACU signal level
  fault: Fault;
  cableSeated: boolean;
  zones: Zone[];
  screen: Screen;
  menu: null | { level: "root" | "sats"; cursor: number };
  modemNetTicks: number;
  lat: number;
  lon: number;
  /** Things the learner has done or seen – scenario goals are checked against these. */
  seen: { screens: Screen[]; modes: Mode[]; loadedSat: string[]; powerCycles: number; reseated: boolean };
}

export const TICK_MS = 500;
export const THRESHOLD = 300;
const SEARCH_STEP = 14;

const ROOT_MENU = ["LOAD SATELLITE", "SETUP (TECHNICIAN)"];

export function relBearing(trueAz: number, heading: number) {
  return (((trueAz - heading) % 360) + 360) % 360;
}

export function inZone(rel: number, z: Zone) {
  return z.from <= z.to ? rel >= z.from && rel <= z.to : rel >= z.from || rel <= z.to;
}

export function blockingZone(s: SimState): Zone | undefined {
  const rel = relBearing(s.antAz, s.heading);
  return s.zones.find((z) => inZone(rel, z));
}

function angleDiff(a: number, b: number) {
  const d = Math.abs((((a - b) % 360) + 540) % 360 - 180);
  return d;
}

/** Signal the ACU would measure with the antenna at its current pointing. */
export function measuredSignal(s: SimState): number {
  if (s.mode === "OFF" || s.mode === "BOOT" || s.fault === "comm") return 0;
  const target = s.satellites[s.sat];
  const off = Math.hypot(angleDiff(s.antAz, target.az), s.antEl - target.el);
  if (off > 3) return 80 + Math.round(Math.random() * 30); // noise floor
  let level = 820 - off * 120;
  level -= s.rain * 6.5;
  const z = blockingZone(s);
  if (z?.physical) level = 90;
  return Math.max(60, Math.round(level + (Math.random() - 0.5) * 16));
}

export function modemState(s: SimState) {
  const rxLock = (s.mode === "TRACKING" || s.mode === "BLOCKING") && s.signal >= THRESHOLD;
  const muted = s.mode === "BLOCKING" || !rxLock;
  return { powered: true /* the modem has its own supply */, rxLock, tx: rxLock && !muted, net: rxLock && !muted && s.modemNetTicks >= 4 };
}

function setMode(s: SimState, mode: Mode): SimState {
  if (s.mode === mode) return s;
  const modes = s.seen.modes.includes(mode) ? s.seen.modes : [...s.seen.modes, mode];
  return { ...s, mode, modeTicks: 0, seen: { ...s.seen, modes } };
}

/** Advance the model by one tick. */
export function tick(prev: SimState): SimState {
  let s: SimState = { ...prev, modeTicks: prev.modeTicks + 1 };
  const target = s.satellites[s.sat];

  switch (s.mode) {
    case "OFF":
      break;
    case "BOOT":
      if (s.modeTicks >= 4) s = setMode(s, "INIT");
      break;
    case "INIT":
      // Calibration: the antenna sweeps its axes.
      s.antAz = (s.antAz + 40) % 360;
      s.antEl = 20 + 25 * Math.sin(s.modeTicks / 2);
      if (s.modeTicks >= 8) s = s.fault === "comm" ? s : setMode(s, "TARGET");
      break;
    case "TARGET": {
      // With a gyro the ACU knows true azimuth; without one it only ramps elevation.
      const goalAz = s.gyro ? target.az : s.antAz;
      s.antAz = approach(s.antAz, goalAz, 30);
      s.antEl = approach(s.antEl, target.el + (s.modeTicks < 3 ? 5 : 0), 6);
      if (s.modeTicks >= 6) s = setMode(s, s.gyro ? "SEARCH1" : "SEARCH3");
      break;
    }
    case "SEARCH1":
    case "SEARCH3": {
      const sig = measuredSignal(s);
      if (sig >= THRESHOLD) {
        s = setMode(s, "TRACKING");
        break;
      }
      if (s.mode === "SEARCH1") {
        // Small spiral around the computed position.
        const r = 1 + s.modeTicks * 0.6;
        s.antAz = (target.az + r * Math.cos(s.modeTicks) + 360) % 360;
        s.antEl = target.el + r * Math.sin(s.modeTicks) * 0.5;
        if (s.modeTicks > 12) s = setMode(s, "SEARCH3");
      } else {
        // Full azimuth sweep at the computed elevation.
        s.antEl = approach(s.antEl, target.el, 4);
        s.antAz = (s.antAz + SEARCH_STEP) % 360;
        if (angleDiff(s.antAz, target.az) < SEARCH_STEP / 2) s.antAz = target.az;
      }
      break;
    }
    case "TRACKING":
    case "BLOCKING": {
      // Stabilisation keeps the beam on the satellite while the ship moves.
      s.antAz = target.az;
      s.antEl = target.el;
      const z = blockingZone(s);
      if (z && s.mode === "TRACKING") s = setMode(s, "BLOCKING");
      if (!z && s.mode === "BLOCKING") s = setMode(s, "TRACKING");
      const sig = measuredSignal(s);
      if (sig < THRESHOLD && !z && s.modeTicks > 2) s = setMode(s, "SEARCH1");
      break;
    }
  }

  s.signal = measuredSignal(s);
  const m = modemState(s);
  s.modemNetTicks = m.rxLock && s.mode !== "BLOCKING" ? s.modemNetTicks + 1 : 0;
  return s;
}

function approach(a: number, b: number, step: number) {
  const d = b - a;
  return Math.abs(d) <= step ? b : a + Math.sign(d) * step;
}

function visit(s: SimState, screen: Screen): SimState {
  const screens = s.seen.screens.includes(screen) ? s.seen.screens : [...s.seen.screens, screen];
  return { ...s, screen, seen: { ...s.seen, screens } };
}

export function availableScreens(s: SimState): Screen[] {
  const base: Screen[] = ["status", "position", "nav"];
  return s.fault ? ["errors", ...base] : base;
}

export function press(s: SimState, key: Key): SimState {
  if (key === "power") {
    if (s.mode === "OFF") {
      const powerCycles = s.seen.powerCycles + 1;
      const fault = s.fault === "comm" && s.cableSeated ? null : s.fault;
      return visit(setMode({ ...s, fault, menu: null, seen: { ...s.seen, powerCycles } }, "BOOT"), fault ? "errors" : "status");
    }
    return setMode({ ...s, menu: null, signal: 0 }, "OFF");
  }
  if (s.mode === "OFF" || s.mode === "BOOT") return s;

  if (s.menu) {
    const items = s.menu.level === "root" ? ROOT_MENU : s.satellites.map((x) => x.name);
    if (key === "back" || key === "menu") return { ...s, menu: s.menu.level === "sats" ? { level: "root", cursor: 0 } : null };
    if (key === "up") return { ...s, menu: { ...s.menu, cursor: (s.menu.cursor + items.length - 1) % items.length } };
    if (key === "down") return { ...s, menu: { ...s.menu, cursor: (s.menu.cursor + 1) % items.length } };
    if (key === "ok") {
      if (s.menu.level === "root") return s.menu.cursor === 0 ? { ...s, menu: { level: "sats", cursor: s.sat } } : s;
      const sat = s.menu.cursor;
      const loadedSat = [...s.seen.loadedSat, s.satellites[sat].name];
      return visit(setMode({ ...s, sat, menu: null, seen: { ...s.seen, loadedSat } }, "TARGET"), "status");
    }
    return s;
  }

  const screens = availableScreens(s);
  const i = Math.max(0, screens.indexOf(s.screen));
  if (key === "right") return visit(s, screens[(i + 1) % screens.length]);
  if (key === "left") return visit(s, screens[(i + screens.length - 1) % screens.length]);
  if (key === "menu") return { ...s, menu: { level: "root", cursor: 0 } };
  return s;
}

const pad = (v: string, n: number) => (v.length >= n ? v.slice(0, n) : v + " ".repeat(n - v.length));
const num = (v: number, w: number, d = 1) => v.toFixed(d).padStart(w, " ");

/** The two 40-character lines shown on the vacuum fluorescent display. */
export function display(s: SimState): [string, string] {
  if (s.mode === "OFF") return ["", ""];
  if (s.mode === "BOOT") return ["  MARINE VSAT ACU", "  STARTING..."];
  if (s.menu) {
    const items = s.menu.level === "root" ? ROOT_MENU : s.satellites.map((x) => `${x.name} ${x.lon.toFixed(1)}E`);
    const title = s.menu.level === "root" ? "MENU" : "LOAD SATELLITE";
    return [pad(title, 40), pad(`> ${items[s.menu.cursor]}`, 40)];
  }
  const sat = s.satellites[s.sat];
  const modeLabel = s.mode === "INIT" ? "INITIALIZE" : s.mode === "TARGET" ? "INITIALIZE-SAT POSITION" : s.mode;
  const blink = s.mode === "BLOCKING" && s.modeTicks % 2 === 0;
  switch (s.screen) {
    case "errors":
      return ["ERROR 1/1", "COMMUNICATIONS ERROR (ACU-ADE)"];
    case "status":
      return [pad(blink ? "BLOCKING" : modeLabel, 26) + pad(sat.name, 14), `SIGNAL ${String(s.signal).padStart(3, " ")}  THR ${THRESHOLD}  RX NBD`];
    case "position":
      return [
        `AZ ${num(s.antAz, 6)}  EL ${num(s.antEl, 5)}`,
        `REL${num(relBearing(s.antAz, s.heading), 6)}  POL ${num(12.5, 5)}`,
      ];
    case "nav":
      return [`LAT ${num(s.lat, 7, 2)}N  LON ${num(s.lon, 7, 2)}E`, `HDG ${num(s.heading, 6)}  ${s.gyro ? "GYRO" : "NO GYRO"}`];
  }
}

export function leds(s: SimState) {
  return {
    power: s.mode !== "OFF",
    tracking: s.mode === "TRACKING" || s.mode === "BLOCKING",
    error: s.fault !== null && s.mode !== "OFF",
  };
}
