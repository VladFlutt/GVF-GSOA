"use client";
import { useEffect, useReducer, useRef } from "react";
import type { Locale } from "@/i18n/config";
import { display, leds, modemState, press, tick, TICK_MS, relBearing, type Key, type SimState } from "./engine";
import { scenarios } from "./scenarios";
import { simText } from "./text";
import { ShipView } from "./ShipView";

type Action = { type: "tick" } | { type: "key"; key: Key } | { type: "helm"; delta: number } | { type: "rain"; value: number } | { type: "reseat" } | { type: "reset"; state: SimState };

function reducer(s: SimState, a: Action): SimState {
  switch (a.type) {
    case "tick":
      return tick(s);
    case "key":
      return press(s, a.key);
    case "helm":
      return { ...s, heading: (((s.heading + a.delta) % 360) + 360) % 360 };
    case "rain":
      return { ...s, rain: a.value };
    case "reseat":
      return { ...s, cableSeated: true, seen: { ...s.seen, reseated: true } };
    case "reset":
      return a.state;
  }
}

export function AcuSimulator({ scenario, locale, onComplete }: { scenario: string; locale: Locale; onComplete?: () => void }) {
  const sc = scenarios[scenario] ?? scenarios["explore-panel"];
  const [s, dispatch] = useReducer(reducer, undefined, sc.initial);
  const txt = simText[locale];
  const done = sc.goals.map((g) => g(s));
  const complete = done.every(Boolean);
  const reported = useRef(false);

  useEffect(() => {
    const id = setInterval(() => dispatch({ type: "tick" }), TICK_MS);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (complete && !reported.current) {
      reported.current = true;
      onComplete?.();
    }
  }, [complete, onComplete]);

  const [l1, l2] = display(s);
  const led = leds(s);
  const modem = modemState(s);
  const k = (key: Key) => () => dispatch({ type: "key", key });

  return (
    <div className="space-y-4">
      {/* ACU front panel (19-inch, 1U) */}
      <div className="rounded-lg border border-zinc-700 bg-gradient-to-b from-zinc-800 to-zinc-900 p-3 shadow-inner sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-row gap-3 sm:flex-col sm:gap-1.5">
            <Led on={led.power} color="green" label="POWER" />
            <Led on={led.tracking} color="green" label="TRACKING" />
            <Led on={led.error} color="red" label="ERROR" />
          </div>
          <div
            aria-live="polite"
            className="min-w-0 flex-1 overflow-x-auto rounded border border-black bg-[#05130f] px-3 py-2 font-mono text-[13px] leading-5 whitespace-pre text-[#5ef2c3] [text-shadow:0_0_6px_#2bd9a2] sm:text-sm"
          >
            <div>{l1 || " "}</div>
            <div>{l2 || " "}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="grid grid-cols-3 gap-1">
              <span />
              <PanelKey onClick={k("up")} label="▲" aria={txt.up} />
              <span />
              <PanelKey onClick={k("left")} label="◀" aria={txt.left} />
              <PanelKey onClick={k("ok")} label="OK" />
              <PanelKey onClick={k("right")} label="▶" aria={txt.right} />
              <span />
              <PanelKey onClick={k("down")} label="▼" aria={txt.down} />
              <span />
            </div>
            <div className="flex flex-col gap-1">
              <PanelKey onClick={k("menu")} label="MENU" wide />
              <PanelKey onClick={k("back")} label="BACK" wide />
            </div>
            <button
              onClick={k("power")}
              aria-label={txt.power}
              className={`ml-1 h-10 w-10 rounded-full border-2 text-lg font-bold ${led.power ? "border-red-400 bg-red-700 text-white" : "border-zinc-500 bg-zinc-700 text-zinc-300"}`}
            >
              ⏻
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">{txt.topView}</div>
          <ShipView heading={s.heading} antAz={s.antAz} satAz={s.satellites[s.sat].az} zones={s.zones} beamOn={s.mode !== "OFF" && s.mode !== "BOOT"} />
          <div className="mt-2 text-xs text-zinc-500">
            {txt.heading}: {s.heading.toFixed(0)}° · {txt.relative}: {relBearing(s.antAz, s.heading).toFixed(0)}°
          </div>
          {sc.controls.helm && (
            <div className="mt-3 flex flex-wrap gap-2">
              {[-30, -10, 10, 30].map((d) => (
                <button key={d} onClick={() => dispatch({ type: "helm", delta: d })} className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
                  {d < 0 ? `↺ ${-d}°` : `↻ ${d}°`}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">{txt.modem}</div>
            <div className="flex flex-wrap gap-4 rounded bg-zinc-900 px-3 py-2.5">
              <Led on={modem.powered} color="green" label="PWR" />
              <Led on={modem.rxLock} color="green" label="RX LOCK" />
              <Led on={modem.tx} color="amber" label="TX" />
              <Led on={modem.net} color="green" label="NET" />
            </div>
            <SignalBar value={s.signal} label={txt.signal} />
          </div>

          {sc.controls.rain && (
            <label className="block rounded-lg border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
              <span className="mb-1 block text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                {txt.rain}: {s.rain}%
              </span>
              <input type="range" min={0} max={100} value={s.rain} onChange={(e) => dispatch({ type: "rain", value: Number(e.target.value) })} className="w-full accent-sky-600" />
            </label>
          )}

          {sc.controls.cables && (
            <div className="rounded-lg border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">{txt.cables}</div>
              <p className="mb-2">{s.cableSeated ? txt.cableOk : txt.cableLoose}</p>
              <button disabled={s.cableSeated} onClick={() => dispatch({ type: "reseat" })} className="rounded bg-sky-700 px-3 py-1.5 text-white disabled:opacity-40">
                {txt.reseat}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <ul className="flex gap-1.5" aria-label={txt.goals}>
          {done.map((d, i) => (
            <li key={i} className={`h-2 w-8 rounded-full ${d ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"}`} />
          ))}
        </ul>
        <button onClick={() => dispatch({ type: "reset", state: sc.initial() })} className="text-sm text-zinc-500 underline">
          {txt.reset}
        </button>
      </div>
    </div>
  );
}

function Led({ on, color, label }: { on: boolean; color: "green" | "red" | "amber"; label: string }) {
  const c = { green: "bg-emerald-400 shadow-[0_0_8px_#34d399]", red: "bg-red-500 shadow-[0_0_8px_#ef4444]", amber: "bg-amber-400 shadow-[0_0_8px_#fbbf24]" }[color];
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-zinc-300">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${on ? c : "bg-zinc-600"}`} />
      {label}
    </div>
  );
}

function PanelKey({ onClick, label, aria, wide }: { onClick: () => void; label: string; aria?: string; wide?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={aria ?? label}
      className={`h-8 ${wide ? "w-16" : "w-8"} rounded border border-zinc-600 bg-zinc-700 text-[11px] font-semibold text-zinc-100 shadow active:translate-y-px active:bg-zinc-600`}
    >
      {label}
    </button>
  );
}

function SignalBar({ value, label }: { value: number; label: string }) {
  const pct = Math.min(100, (value / 999) * 100);
  return (
    <div className="mt-3">
      <div className="mb-1 flex justify-between text-xs text-zinc-500">
        <span>{label}</span>
        <span className="font-mono">{value}</span>
      </div>
      <div className="relative h-2.5 rounded bg-zinc-200 dark:bg-zinc-800">
        <div className={`h-full rounded ${value >= 300 ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${pct}%` }} />
        <div className="absolute top-[-3px] h-4 w-0.5 bg-zinc-500" style={{ left: `${(300 / 999) * 100}%` }} title="THR 300" />
      </div>
    </div>
  );
}
