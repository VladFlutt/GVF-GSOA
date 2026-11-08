import type { Zone } from "./engine";

/** Top-down view: north up, the ship rotated to its heading, blockage sectors relative to the bow. */
export function ShipView({ heading, antAz, satAz, zones, beamOn }: { heading: number; antAz: number; satAz: number; zones: Zone[]; beamOn: boolean }) {
  const R = 90;
  const sector = (from: number, to: number) => {
    const span = ((to - from + 360) % 360) || 360;
    const a0 = ((from + heading - 90) * Math.PI) / 180;
    const a1 = ((from + span + heading - 90) * Math.PI) / 180;
    const r = R - 6;
    return `M0 0 L${r * Math.cos(a0)} ${r * Math.sin(a0)} A${r} ${r} 0 ${span > 180 ? 1 : 0} 1 ${r * Math.cos(a1)} ${r * Math.sin(a1)} Z`;
  };
  const pt = (az: number, r: number) => [r * Math.cos(((az - 90) * Math.PI) / 180), r * Math.sin(((az - 90) * Math.PI) / 180)];
  const [bx, by] = pt(antAz, R - 4);
  const [sx, sy] = pt(satAz, R + 2);
  return (
    <svg viewBox="-110 -110 220 220" className="mx-auto block w-full max-w-[260px]" role="img" aria-label="Ship top view">
      <circle r={R} className="fill-sky-50 stroke-zinc-300 dark:fill-sky-950/40 dark:stroke-zinc-700" />
      {[0, 90, 180, 270].map((a) => {
        const [x, y] = pt(a, R + 12);
        return (
          <text key={a} x={x} y={y + 4} textAnchor="middle" className="fill-zinc-500 text-[11px] font-semibold">
            {["N", "E", "S", "W"][a / 90]}
          </text>
        );
      })}
      {zones
        .slice()
        .sort((a, b) => Number(a.physical) - Number(b.physical))
        .map((z, i) => (
          <path key={i} d={sector(z.from, z.to)} className={z.physical ? "fill-red-600/70" : "fill-red-400/30"} />
        ))}
      <g transform={`rotate(${heading})`}>
        <path d="M0 -46 C14 -30 15 -8 14 36 L-14 36 C-15 -8 -14 -30 0 -46 Z" className="fill-white stroke-zinc-500 dark:fill-zinc-800" />
        <rect x={-6} y={14} width={12} height={10} rx={2} className="fill-zinc-600" />
        <circle cy={-6} r={4} className="fill-zinc-400" />
      </g>
      {beamOn && <line x1={0} y1={-6} x2={bx} y2={by} className="stroke-sky-600" strokeWidth={2.5} strokeDasharray="5 3" />}
      <g transform={`translate(${sx} ${sy})`}>
        <rect x={-3} y={-3} width={6} height={6} className="fill-amber-500" />
        <rect x={-11} y={-1.5} width={7} height={3} className="fill-sky-700" />
        <rect x={4} y={-1.5} width={7} height={3} className="fill-sky-700" />
      </g>
    </svg>
  );
}
