"use client";

import React, { useEffect, useMemo, useState } from "react";
import { MapPin, Package, Timer, Truck } from "lucide-react";
import {
  MAP_VIEWBOX,
  DIVISIONS,
  DIVISION_CITIES,
  DISTRICT_POINTS,
  DIVISION_RESELLERS,
  HUBS,
  ROUTES,
  DISPATCH_EVENTS,
  MapPoint,
} from "./bangladeshMapData";

const TICK_MS = 2600;
const INITIAL_DISPATCHED = 1284;
const INITIAL_ORDER_NO = 94812;

// Quadratic curve between two points, bowed perpendicular to the straight line.
function curvePath(from: MapPoint, to: MapPoint, bend: number) {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const cx = mx - dy * bend;
  const cy = my + dx * bend;
  return `M${from.x},${from.y} Q${cx.toFixed(1)},${cy.toFixed(1)} ${to.x},${to.y}`;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

const pct = (value: number, total: number) => `${(value / total) * 100}%`;

export function BangladeshDistributionMap() {
  const reducedMotion = usePrefersReducedMotion();
  const [tick, setTick] = useState(0);
  const [dispatched, setDispatched] = useState(INITIAL_DISPATCHED);
  const [hoveredDivision, setHoveredDivision] = useState<string | null>(null);

  // Advance the live dispatch feed; randomness lives here (client-only) to keep SSR deterministic.
  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setInterval(() => {
      setTick((t) => t + 1);
      setDispatched((n) => n + 1 + Math.floor(Math.random() * 6));
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [reducedMotion]);

  const event = DISPATCH_EVENTS[tick % DISPATCH_EVENTS.length];
  const activeDivision = hoveredDivision ?? event.division;

  const routes = useMemo(
    () =>
      ROUTES.map((r, i) => ({
        ...r,
        d: curvePath(r.from, r.to, i % 2 === 0 ? 0.18 : -0.18),
      })),
    []
  );

  const maxResellers = Math.max(...Object.values(DIVISION_RESELLERS));
  const totalResellers = Object.values(DIVISION_RESELLERS).reduce((a, b) => a + b, 0);
  const hovered = hoveredDivision
    ? { ...DIVISION_CITIES[hoveredDivision], resellers: DIVISION_RESELLERS[hoveredDivision] }
    : null;
  const { width: W, height: H } = MAP_VIEWBOX;

  return (
    <div className="relative rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl text-white overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-brand/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="relative flex w-2.5 h-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping motion-reduce:animate-none" />
            <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </span>
          <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold">
            Nationwide Distribution
          </span>
        </div>
        <span className="hidden sm:inline text-[10px] font-mono text-slate-400">8 Divisions &bull; 64 Districts</span>
      </div>

      {/* Map */}
      <div className="relative mx-auto mt-4 w-full max-w-[270px] sm:max-w-[290px]" style={{ aspectRatio: `${W} / ${H}` }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="absolute inset-0 w-full h-full overflow-visible"
          role="img"
          aria-label={`Map of Bangladesh showing WIN wholesale delivery routes from Dhaka and Chattogram hubs to all 8 divisions and 64 districts, serving ${totalResellers.toLocaleString()} active resellers.`}
        >
          <defs>
            <linearGradient id="bd-route-trunk" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
            <filter id="bd-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Divisions, shaded by reseller density */}
          <g>
            {DIVISIONS.map((div) => {
              const density = DIVISION_RESELLERS[div.id] / maxResellers;
              const isActive = activeDivision === div.id;
              return (
                <path
                  key={div.id}
                  d={div.path}
                  fill="#005FD5"
                  fillOpacity={isActive ? 0.55 : 0.12 + density * 0.3}
                  stroke={isActive ? "#93c5fd" : "#334155"}
                  strokeWidth={isActive ? 1.6 : 1}
                  strokeLinejoin="round"
                  className="cursor-pointer transition-[fill-opacity,stroke] duration-500"
                  onMouseEnter={() => setHoveredDivision(div.id)}
                  onMouseLeave={() => setHoveredDivision(null)}
                >
                  <title>{`${div.name} Division`}</title>
                </path>
              );
            })}
          </g>

          {/* Delivery routes */}
          <g aria-hidden="true" className="pointer-events-none">
            {routes.map((r, i) => (
              <path
                key={i}
                d={r.d}
                fill="none"
                stroke={r.trunk ? "url(#bd-route-trunk)" : "#64748b"}
                strokeWidth={r.trunk ? 1.6 : 1}
                strokeOpacity={r.trunk ? 0.9 : 0.6}
                strokeDasharray={r.trunk ? "5 5" : "2 4"}
                strokeLinecap="round"
              >
                {!reducedMotion && (
                  <animate
                    attributeName="stroke-dashoffset"
                    from={r.trunk ? 20 : 12}
                    to={0}
                    dur={r.trunk ? "1.2s" : "1.8s"}
                    repeatCount="indefinite"
                  />
                )}
              </path>
            ))}
          </g>

          {/* Parcels travelling along trunk routes */}
          {!reducedMotion && (
            <g aria-hidden="true" className="pointer-events-none">
              {routes.map((r, i) =>
                r.trunk ? (
                  <circle key={i} r={3} fill="#ecfdf5" filter="url(#bd-glow)" opacity={0}>
                    <animateMotion
                      path={r.d}
                      dur={`${2.6 + (i % 4) * 0.5}s`}
                      begin={`${(i * 0.45) % 3}s`}
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0;1;1;0"
                      keyTimes="0;0.1;0.85;1"
                      dur={`${2.6 + (i % 4) * 0.5}s`}
                      begin={`${(i * 0.45) % 3}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                ) : null
              )}
            </g>
          )}

          {/* District delivery points */}
          <g aria-hidden="true" className="pointer-events-none">
            {DISTRICT_POINTS.map((p) => (
              <circle key={p.name} cx={p.x} cy={p.y} r={2.2} fill="#94a3b8" />
            ))}
          </g>

          {/* Divisional cities */}
          <g aria-hidden="true" className="pointer-events-none">
            {Object.entries(DIVISION_CITIES).map(([id, c]) => {
              const isActive = activeDivision === id;
              return (
                <g key={id}>
                  {isActive && !reducedMotion && (
                    <circle cx={c.x} cy={c.y} r={5} fill="none" stroke="#34d399" strokeWidth={1.5}>
                      <animate attributeName="r" values="5;16" dur="1.3s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.9;0" dur="1.3s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={isActive ? 5 : 3.6}
                    fill="#34d399"
                    stroke="#0f172a"
                    strokeWidth={1.5}
                    className="transition-all duration-300"
                  />
                </g>
              );
            })}
          </g>

          {/* Fulfillment hubs */}
          <g aria-hidden="true" className="pointer-events-none">
            {HUBS.map((hub) => {
              const c = DIVISION_CITIES[hub.id];
              return (
                <g key={hub.id}>
                  {!reducedMotion &&
                    [0, 1].map((n) => (
                      <circle key={n} cx={c.x} cy={c.y} r={7} fill="none" stroke="#60a5fa" strokeWidth={1.5}>
                        <animate attributeName="r" values="7;22" dur="2.4s" begin={`${n * 1.2}s`} repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.8;0" dur="2.4s" begin={`${n * 1.2}s`} repeatCount="indefinite" />
                      </circle>
                    ))}
                  <circle cx={c.x} cy={c.y} r={7} fill="#005FD5" stroke="#bfdbfe" strokeWidth={2} filter="url(#bd-glow)" />
                  <text
                    x={c.x + (hub.id === "chattogram" ? -12 : 12)}
                    y={c.y + 4}
                    textAnchor={hub.id === "chattogram" ? "end" : "start"}
                    className="fill-blue-200 font-mono font-bold"
                    fontSize={13}
                  >
                    {hub.code}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Hovered division tooltip */}
        {hovered && (
          <div
            className="absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+12px)] pointer-events-none whitespace-nowrap rounded-lg bg-slate-950/95 border border-slate-700 px-2.5 py-1.5 shadow-xl"
            style={{ left: pct(hovered.x, W), top: pct(hovered.y, H) }}
          >
            <p className="text-[11px] font-bold text-white">{hovered.name} Division</p>
            <p className="text-[10px] text-slate-400">
              <span className="text-emerald-400 font-semibold">{hovered.resellers.toLocaleString()}</span> active resellers
            </p>
          </div>
        )}

        {/* Legend (sits in the Bay of Bengal) */}
        <div aria-hidden="true" className="absolute left-0 bottom-0 space-y-1 text-[9px] font-medium text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-brand ring-2 ring-blue-200/70" />
            Fulfillment hub
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            Division hub
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            </span>
            District delivery
          </div>
        </div>
      </div>

      {/* Live dispatch ticker */}
      <div
        className="relative mt-4 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between gap-3"
        aria-live="polite"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 shrink-0 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Truck className="w-4.5 h-4.5" />
          </div>
          <div key={tick} className="min-w-0 animate-in fade-in slide-in-from-bottom-1 duration-300">
            <p className="text-xs font-bold text-slate-100 truncate">
              Dispatched to {event.destination}
            </p>
            <span className="block text-[10px] text-slate-400 truncate">
              Order #WN-WS-{INITIAL_ORDER_NO + tick} &bull; {event.units} units &bull; {event.courier}
            </span>
          </div>
        </div>
        <span className="shrink-0 text-[11px] font-mono font-bold text-emerald-400">IN TRANSIT</span>
      </div>

      {/* Network stats */}
      <div className="relative mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <MapPin className="w-3.5 h-3.5 mx-auto text-blue-400" />
          <p className="mt-1 text-sm font-extrabold tabular-nums">64/64</p>
          <p className="text-[10px] text-slate-400">Districts</p>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <Package className="w-3.5 h-3.5 mx-auto text-purple-400" />
          <p className="mt-1 text-sm font-extrabold tabular-nums">{dispatched.toLocaleString("en-US")}</p>
          <p className="text-[10px] text-slate-400">Shipped today</p>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <Timer className="w-3.5 h-3.5 mx-auto text-emerald-400" />
          <p className="mt-1 text-sm font-extrabold tabular-nums">24&ndash;72h</p>
          <p className="text-[10px] text-slate-400">Delivery</p>
        </div>
      </div>

      {/* Bottom Quick Callout */}
      <div className="relative mt-3 p-3 rounded-xl bg-brand/20 border border-brand/40 flex items-center justify-between text-xs">
        <span className="text-slate-300 font-medium">Average Reseller Monthly Margin:</span>
        <span className="font-extrabold text-emerald-400 text-sm">৳68,400+</span>
      </div>
    </div>
  );
}
