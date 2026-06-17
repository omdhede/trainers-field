"use client";
import { useEffect, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from "recharts";
import Link from "next/link";
import { Upload, ArrowRight } from "lucide-react";
import { loadState } from "@/lib/store";
import { formatPace } from "@/lib/parsers";
import { MILESTONES } from "@/lib/types";
import type { AppState } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type Range = "4w" | "3m" | "all";

const C = {
  grid: "hsl(var(--border))",
  axis: "hsl(var(--muted-foreground))",
  primary: "hsl(var(--primary))",
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  destructive: "hsl(var(--destructive))",
  c1: "hsl(var(--chart-1))",
  c2: "hsl(var(--chart-2))",
  c3: "hsl(var(--chart-3))",
  c4: "hsl(var(--chart-4))",
  c5: "hsl(var(--chart-5))",
};

function activityColor(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("run")) return C.c1;
  if (n.includes("swim")) return C.c3;
  if (n.includes("walk")) return C.c2;
  if (n.includes("cycl") || n.includes("bik")) return C.c4;
  return C.c5;
}

function filterByRange<T extends { date: string }>(data: T[], range: Range): T[] {
  if (range === "all") return data;
  const now = new Date();
  const days = range === "4w" ? 28 : 90;
  const cutoff = new Date(now.getTime() - days * 86400000).toISOString().slice(0, 10);
  return data.filter((d) => d.date >= cutoff);
}

const avg = (arr: number[]) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-md text-xs">
      <p className="font-semibold text-popover-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <strong>{typeof p.value === "number" && p.name.toLowerCase().includes("pace") ? formatPace(p.value) + "/km" : p.value}</strong>
        </p>
      ))}
    </div>
  );
};

function EmptyTab({ message }: { message: string }) {
  return (
    <Card className="p-8 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      <Link href="/upload" className="inline-flex items-center gap-1.5 mt-2 text-sm font-semibold text-primary hover:underline">
        Upload data <ArrowRight size={14} />
      </Link>
    </Card>
  );
}

export default function Analytics() {
  const [state, setState] = useState<AppState | null>(null);
  const [range, setRange] = useState<Range>("3m");

  useEffect(() => { setState(loadState()); }, []);

  if (!state) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;

  const { whoopData, runData, whoopWorkouts } = state;
  const hasRuns = runData.length > 0;
  const hasWhoop = whoopData.length > 0;
  const hasWorkouts = whoopWorkouts.length > 0;

  const filteredRuns = filterByRange(runData, range).filter((r) => r.paceMinPerKm > 0 && r.paceMinPerKm < 20);
  const filteredWhoop = filterByRange(whoopData, range);
  const filteredWorkouts = filterByRange(whoopWorkouts, range);

  // ---- Running ----
  const paceData = filteredRuns.map((r) => ({
    date: r.date.slice(5),
    pace: parseFloat(r.paceMinPerKm.toFixed(2)),
    dist: r.distanceKm,
    name: r.name,
  }));

  const weeklyVol: Record<string, number> = {};
  filteredRuns.forEach((r) => {
    const d = new Date(r.date);
    const mon = new Date(d);
    mon.setDate(d.getDate() - d.getDay() + 1);
    const key = mon.toISOString().slice(0, 10);
    weeklyVol[key] = (weeklyVol[key] || 0) + r.distanceKm;
  });
  const volData = Object.entries(weeklyVol)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, km]) => ({ date: date.slice(5), km: parseFloat(km.toFixed(1)) }));

  const bestPace = hasRuns ? Math.min(...filteredRuns.map((r) => r.paceMinPerKm)) : 0;
  const avgPace = hasRuns ? avg(filteredRuns.map((r) => r.paceMinPerKm)) : 0;
  const totalKm = filteredRuns.reduce((s, r) => s + r.distanceKm, 0);

  // ---- Recovery ----
  const whoopChartData = filteredWhoop.map((w) => ({
    date: w.date.slice(5),
    recovery: w.recoveryScore,
    hrv: w.hrv,
    strain: parseFloat(w.strain.toFixed(1)),
  }));

  const vitalsData = filteredWhoop
    .filter((w) => w.spo2 !== undefined || w.skinTemp !== undefined)
    .map((w) => ({
      date: w.date.slice(5),
      spo2: w.spo2 !== undefined ? parseFloat(w.spo2.toFixed(1)) : undefined,
      skinTemp: w.skinTemp !== undefined ? parseFloat(w.skinTemp.toFixed(1)) : undefined,
    }));
  const hasVitals = vitalsData.length > 0;

  const avgRecovery = hasWhoop ? Math.round(avg(filteredWhoop.map((w) => w.recoveryScore))) : 0;
  const avgHRV = hasWhoop ? Math.round(avg(filteredWhoop.map((w) => w.hrv))) : 0;
  const avgRHR = hasWhoop ? Math.round(avg(filteredWhoop.map((w) => w.restingHR))) : 0;
  const spo2Vals = filteredWhoop.map((w) => w.spo2).filter((v): v is number => v !== undefined);
  const avgSpo2 = spo2Vals.length ? avg(spo2Vals) : 0;

  // ---- Sleep ----
  const sleepStageData = filteredWhoop
    .filter((w) => w.sleepLightMin !== undefined || w.sleepDeepMin !== undefined || w.sleepRemMin !== undefined)
    .map((w) => ({
      date: w.date.slice(5),
      Deep: w.sleepDeepMin ?? 0,
      REM: w.sleepRemMin ?? 0,
      Light: w.sleepLightMin ?? 0,
      Awake: w.sleepAwakeMin ?? 0,
    }));
  const hasSleepStages = sleepStageData.length > 0;

  const sleepPerfData = filteredWhoop.map((w) => ({
    date: w.date.slice(5),
    performance: w.sleepPerformance,
    efficiency: w.sleepEfficiency !== undefined ? Math.round(w.sleepEfficiency) : undefined,
  }));

  const avgSleepPerf = hasWhoop ? Math.round(avg(filteredWhoop.map((w) => w.sleepPerformance))) : 0;
  const sleepEffVals = filteredWhoop.map((w) => w.sleepEfficiency).filter((v): v is number => v !== undefined);
  const avgSleepEff = sleepEffVals.length ? Math.round(avg(sleepEffVals)) : 0;
  const sleepDebtVals = filteredWhoop.map((w) => w.sleepDebtMin).filter((v): v is number => v !== undefined);
  const avgSleepDebtMin = sleepDebtVals.length ? avg(sleepDebtVals) : 0;
  const sleepAsleepVals = filteredWhoop.map((w) => w.sleepAsleepMin).filter((v): v is number => v !== undefined);
  const avgSleepHrs = sleepAsleepVals.length ? avg(sleepAsleepVals) / 60 : 0;

  // ---- Workouts ----
  const workoutStrainData = filteredWorkouts.map((w) => ({
    date: w.date.slice(5),
    strain: parseFloat(w.strain.toFixed(1)),
    activity: w.activityName,
  }));

  const totalWorkouts = filteredWorkouts.length;
  const totalWorkoutHrs = filteredWorkouts.reduce((s, w) => s + w.durationMin, 0) / 60;
  const avgWorkoutStrain = totalWorkouts ? avg(filteredWorkouts.map((w) => w.strain)) : 0;
  const totalCalories = filteredWorkouts.reduce((s, w) => s + (w.calories || 0), 0);

  const hrZoneData = filteredWorkouts.slice(-10).map((w) => ({
    name: `${w.date.slice(5)} ${w.activityName.slice(0, 3)}`,
    Z1: w.hrZones[0] || 0,
    Z2: w.hrZones[1] || 0,
    Z3: w.hrZones[2] || 0,
    Z4: w.hrZones[3] || 0,
    Z5: w.hrZones[4] || 0,
  }));

  const activityTypes = Array.from(new Set(filteredWorkouts.map((w) => w.activityName)));

  const defaultTab = hasRuns ? "running" : hasWhoop ? "recovery" : hasWorkouts ? "workouts" : "running";

  const RangeBtn = ({ r, label }: { r: Range; label: string }) => (
    <button
      onClick={() => setRange(r)}
      className={cn(
        "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors",
        range === r ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your pace, recovery & sleep trends</p>
        </div>
        <div className="inline-flex items-center gap-1 bg-secondary rounded-lg p-1 self-start sm:self-auto">
          <RangeBtn r="4w" label="4 weeks" />
          <RangeBtn r="3m" label="3 months" />
          <RangeBtn r="all" label="All time" />
        </div>
      </div>

      {!hasRuns && !hasWhoop && !hasWorkouts && (
        <Card className="bg-warning/10 border-warning/30 p-6 text-center">
          <Upload size={24} className="text-warning mx-auto mb-2" />
          <p className="font-semibold text-warning">No data to analyse yet</p>
          <p className="text-sm text-warning/80 mt-1 mb-3">Upload your Strava and WHOOP exports to see charts here.</p>
          <Link href="/upload" className="btn-primary inline-flex items-center gap-2">
            <Upload size={14} /> Go to Upload
          </Link>
        </Card>
      )}

      {/* Summary stats */}
      {(hasRuns || hasWhoop) && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Best Pace", val: hasRuns ? formatPace(bestPace) + "/km" : "—", cls: "text-primary" },
            { label: "Avg Pace", val: hasRuns ? formatPace(avgPace) + "/km" : "—", cls: "text-foreground" },
            { label: "Total km", val: hasRuns ? totalKm.toFixed(0) + " km" : "—", cls: "text-foreground" },
            { label: "Avg Recovery", val: hasWhoop ? avgRecovery + "%" : "—", cls: avgRecovery >= 67 ? "text-success" : "text-warning" },
            { label: "Avg HRV", val: hasWhoop ? avgHRV + " ms" : "—", cls: "text-foreground" },
          ].map((s, i) => (
            <div key={s.label} className={cn("stat-card", i === 4 && "col-span-2 sm:col-span-1")}>
              <div className="text-xs text-muted-foreground mb-1">{s.label}</div>
              <div className={cn("text-lg font-bold", s.cls)}>{s.val}</div>
            </div>
          ))}
        </div>
      )}

      <Tabs defaultValue={defaultTab}>
        <TabsList className="grid w-full grid-cols-4 sm:inline-flex sm:w-auto">
          <TabsTrigger value="running" className="text-xs sm:text-sm">Running</TabsTrigger>
          <TabsTrigger value="recovery" className="text-xs sm:text-sm">Recovery</TabsTrigger>
          <TabsTrigger value="sleep" className="text-xs sm:text-sm">Sleep</TabsTrigger>
          <TabsTrigger value="workouts" className="text-xs sm:text-sm">Workouts</TabsTrigger>
        </TabsList>

        {/* Running */}
        <TabsContent value="running" className="space-y-4">
          {!hasRuns && <EmptyTab message="No runs yet — upload your Strava activities.csv to see pace and volume charts." />}

          {hasRuns && (
            <Card className="p-5">
              <h2 className="font-semibold text-sm mb-4">Pace per Run</h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={paceData} margin={{ top: 5, right: 58, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: C.axis }} />
                  <YAxis
                    reversed
                    domain={[4.5, 10]}
                    tickFormatter={(v) => formatPace(v)}
                    tick={{ fontSize: 11, fill: C.axis }}
                    width={45}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  {MILESTONES.map((m) => (
                    <ReferenceLine key={m.label} y={m.pace} stroke={m.color} strokeDasharray="4 3" strokeOpacity={0.5} label={{ value: m.label, position: "right", fontSize: 10, fill: m.color }} />
                  ))}
                  <Line type="monotone" dataKey="pace" name="Pace" stroke={C.primary} strokeWidth={2} dot={{ r: 3, fill: C.primary }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {volData.length > 0 && (
            <Card className="p-5">
              <h2 className="font-semibold text-sm mb-4">Weekly Running Volume (km)</h2>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={volData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: C.axis }} />
                  <YAxis tick={{ fontSize: 11, fill: C.axis }} width={30} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="km" name="km run" fill={C.primary} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {hasRuns && (
            <Card className="p-5">
              <h2 className="font-semibold text-sm mb-4">Progress to 5:00/km</h2>
              <div className="space-y-3">
                {MILESTONES.map((m) => {
                  const done = bestPace <= m.pace + 0.3;
                  const pct = Math.min(100, Math.max(0, ((8.0 - bestPace) / (8.0 - m.pace)) * 100));
                  return (
                    <div key={m.label} className="flex items-center gap-3">
                      <span className="text-xs font-bold w-16 text-right" style={{ color: m.color }}>{m.label}</span>
                      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${done ? 100 : pct}%`, background: m.color, opacity: done ? 1 : 0.6 }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-16">{done ? "✅ Done" : m.desc}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Recovery */}
        <TabsContent value="recovery" className="space-y-4">
          {!hasWhoop && <EmptyTab message="No WHOOP data yet — upload physiological_cycles.csv to see recovery, HRV and strain trends." />}

          {hasWhoop && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="stat-card">
                <div className="text-xs text-muted-foreground mb-1">Avg Recovery</div>
                <div className={cn("text-lg font-bold", avgRecovery >= 67 ? "text-success" : "text-warning")}>{avgRecovery}%</div>
              </div>
              <div className="stat-card">
                <div className="text-xs text-muted-foreground mb-1">Avg HRV</div>
                <div className="text-lg font-bold">{avgHRV} ms</div>
              </div>
              <div className="stat-card">
                <div className="text-xs text-muted-foreground mb-1">Avg RHR</div>
                <div className="text-lg font-bold">{avgRHR} bpm</div>
              </div>
              <div className="stat-card">
                <div className="text-xs text-muted-foreground mb-1">Avg SpO2</div>
                <div className="text-lg font-bold">{avgSpo2 ? avgSpo2.toFixed(1) + "%" : "—"}</div>
              </div>
            </div>
          )}

          {hasWhoop && (
            <Card className="p-5">
              <h2 className="font-semibold text-sm mb-4">WHOOP — Recovery & HRV</h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={whoopChartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: C.axis }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: C.axis }} width={30} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: C.axis }} width={40} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine yAxisId="left" y={67} stroke={C.success} strokeDasharray="4 3" strokeOpacity={0.4} />
                  <ReferenceLine yAxisId="left" y={34} stroke={C.warning} strokeDasharray="4 3" strokeOpacity={0.4} />
                  <Line yAxisId="left" type="monotone" dataKey="recovery" name="Recovery %" stroke={C.success} strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="hrv" name="HRV (ms)" stroke={C.c3} strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {hasWhoop && (
            <Card className="p-5">
              <h2 className="font-semibold text-sm mb-4">WHOOP — Daily Strain</h2>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={whoopChartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: C.axis }} />
                  <YAxis domain={[0, 21]} tick={{ fontSize: 11, fill: C.axis }} width={25} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="strain" name="Strain" fill={C.c5} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {hasVitals && (
            <Card className="p-5">
              <h2 className="font-semibold text-sm mb-4">SpO2 & Skin Temperature</h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={vitalsData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: C.axis }} />
                  <YAxis yAxisId="left" domain={[90, 100]} tick={{ fontSize: 11, fill: C.axis }} width={32} />
                  <YAxis yAxisId="right" orientation="right" domain={["auto", "auto"]} tick={{ fontSize: 11, fill: C.axis }} width={36} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line yAxisId="left" type="monotone" dataKey="spo2" name="SpO2 %" stroke={C.c3} strokeWidth={2} dot={false} connectNulls />
                  <Line yAxisId="right" type="monotone" dataKey="skinTemp" name="Skin Temp °C" stroke={C.c4} strokeWidth={1.5} dot={false} strokeDasharray="4 2" connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}
        </TabsContent>

        {/* Sleep */}
        <TabsContent value="sleep" className="space-y-4">
          {!hasWhoop && <EmptyTab message="No WHOOP data yet — upload physiological_cycles.csv to see sleep stage and performance trends." />}

          {hasWhoop && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="stat-card">
                <div className="text-xs text-muted-foreground mb-1">Sleep Performance</div>
                <div className={cn("text-lg font-bold", avgSleepPerf >= 70 ? "text-success" : "text-warning")}>{avgSleepPerf}%</div>
              </div>
              <div className="stat-card">
                <div className="text-xs text-muted-foreground mb-1">Sleep Efficiency</div>
                <div className="text-lg font-bold">{avgSleepEff ? avgSleepEff + "%" : "—"}</div>
              </div>
              <div className="stat-card">
                <div className="text-xs text-muted-foreground mb-1">Avg Time Asleep</div>
                <div className="text-lg font-bold">{avgSleepHrs ? avgSleepHrs.toFixed(1) + "h" : "—"}</div>
              </div>
              <div className="stat-card">
                <div className="text-xs text-muted-foreground mb-1">Avg Sleep Debt</div>
                <div className="text-lg font-bold">{avgSleepDebtMin ? Math.round(avgSleepDebtMin) + " min" : "—"}</div>
              </div>
            </div>
          )}

          {hasSleepStages && (
            <Card className="p-5">
              <h2 className="font-semibold text-sm mb-4">Sleep Stage Composition (min)</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={sleepStageData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: C.axis }} />
                  <YAxis tick={{ fontSize: 11, fill: C.axis }} width={30} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Deep" name="Deep" stackId="sleep" fill={C.c3} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="REM" name="REM" stackId="sleep" fill={C.c5} />
                  <Bar dataKey="Light" name="Light" stackId="sleep" fill={C.c4} />
                  <Bar dataKey="Awake" name="Awake" stackId="sleep" fill={C.axis} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {hasWhoop && (
            <Card className="p-5">
              <h2 className="font-semibold text-sm mb-4">Sleep Performance & Efficiency</h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={sleepPerfData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: C.axis }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: C.axis }} width={30} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="performance" name="Performance %" stroke={C.success} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="efficiency" name="Efficiency %" stroke={C.c3} strokeWidth={1.5} dot={false} strokeDasharray="4 2" connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}
        </TabsContent>

        {/* Workouts */}
        <TabsContent value="workouts" className="space-y-4">
          {!hasWorkouts && <EmptyTab message="No WHOOP workouts yet — upload workouts.csv to see strain and heart-rate zone breakdowns." />}

          {hasWorkouts && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="stat-card">
                <div className="text-xs text-muted-foreground mb-1">Workouts</div>
                <div className="text-lg font-bold">{totalWorkouts}</div>
              </div>
              <div className="stat-card">
                <div className="text-xs text-muted-foreground mb-1">Total Time</div>
                <div className="text-lg font-bold">{totalWorkoutHrs.toFixed(1)}h</div>
              </div>
              <div className="stat-card">
                <div className="text-xs text-muted-foreground mb-1">Avg Strain</div>
                <div className="text-lg font-bold">{avgWorkoutStrain.toFixed(1)}</div>
              </div>
              <div className="stat-card">
                <div className="text-xs text-muted-foreground mb-1">Calories</div>
                <div className="text-lg font-bold">{Math.round(totalCalories)}</div>
              </div>
            </div>
          )}

          {workoutStrainData.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="font-semibold text-sm">Strain by Workout</h2>
                <div className="flex items-center gap-3 flex-wrap">
                  {activityTypes.map((a) => (
                    <span key={a} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: activityColor(a) }} />
                      {a}
                    </span>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={workoutStrainData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: C.axis }} />
                  <YAxis domain={[0, 21]} tick={{ fontSize: 11, fill: C.axis }} width={25} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="strain" name="Strain" radius={[3, 3, 0, 0]}>
                    {workoutStrainData.map((d, i) => (
                      <Cell key={i} fill={activityColor(d.activity)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {hrZoneData.length > 0 && (
            <Card className="p-5">
              <h2 className="font-semibold text-sm mb-4">Heart Rate Zone Distribution — Last {hrZoneData.length} Workouts</h2>
              <ResponsiveContainer width="100%" height={Math.max(160, hrZoneData.length * 32)}>
                <BarChart data={hrZoneData} layout="vertical" margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: C.axis }} unit="%" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: C.axis }} width={70} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Z1" name="Zone 1" stackId="hr" fill={C.success} />
                  <Bar dataKey="Z2" name="Zone 2" stackId="hr" fill={C.c3} />
                  <Bar dataKey="Z3" name="Zone 3" stackId="hr" fill={C.c4} />
                  <Bar dataKey="Z4" name="Zone 4" stackId="hr" fill={C.primary} />
                  <Bar dataKey="Z5" name="Zone 5" stackId="hr" fill={C.destructive} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
