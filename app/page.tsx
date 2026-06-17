"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingDown, Zap, Heart, Moon, Upload, ArrowRight } from "lucide-react";
import { loadState } from "@/lib/store";
import { formatPace } from "@/lib/parsers";
import { MILESTONES, PHASES, WEEKLY_PLAN } from "@/lib/types";
import type { AppState } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const [state, setState] = useState<AppState | null>(null);

  useEffect(() => {
    setState(loadState());
  }, []);

  if (!state) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;

  const { whoopData, runData, checklist } = state;
  const weekNum = checklist.weekNumber;

  const phase = PHASES.find((p) => weekNum >= p.minWeek && weekNum <= p.maxWeek) || PHASES[0];

  const lastWhoop = whoopData.at(-1);
  const runs = runData.filter((r) => r.paceMinPerKm > 0 && r.paceMinPerKm < 20);
  const recentRuns = runs.slice(-4);

  const bestPace = runs.length ? Math.min(...runs.map((r) => r.paceMinPerKm)) : 8.0;
  const currentMilestoneIdx = MILESTONES.findIndex((m) => bestPace <= m.pace + 0.3);

  const allSessions = WEEKLY_PLAN.flatMap((d) => d.sessions.map((s) => s.id));
  const completedCount = allSessions.filter((id) => checklist.completed[id]).length;
  const weekPct = Math.round((completedCount / allSessions.length) * 100);

  const weeklyKm = runData
    .filter((r) => {
      const d = new Date(r.date);
      const now = new Date();
      const diff = (now.getTime() - d.getTime()) / 86400000;
      return diff <= 7;
    })
    .reduce((sum, r) => sum + r.distanceKm, 0);

  const recoveryColor = (score: number) => (score >= 67 ? "text-success" : score >= 34 ? "text-warning" : "text-primary");
  const recoveryBg = (score: number) => (score >= 67 ? "bg-success" : score >= 34 ? "bg-warning" : "bg-primary");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">8:00/km → 5:00/km · the long game</p>
        </div>
        <Badge variant="outline" className="text-sm font-medium px-3 py-1.5 self-start sm:self-auto" style={{ color: phase.color, borderColor: phase.color + "40", background: phase.color + "10" }}>
          {phase.name} · {phase.weeks}
        </Badge>
      </div>

      {/* No data prompt */}
      {whoopData.length === 0 && runData.length === 0 && (
        <Card className="bg-warning/10 border-warning/30 p-5">
          <div className="flex items-start gap-3">
            <Upload size={20} className="text-warning mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-warning text-sm">No data yet</p>
              <p className="text-warning/80 text-sm mt-1">Upload your WHOOP and Strava CSV files to see your stats here.</p>
              <Link href="/upload" className="inline-flex items-center gap-1.5 mt-2 text-sm font-semibold text-warning hover:underline">
                Upload data <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Key Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stat-card">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">Week</div>
          <div className="text-3xl font-bold">{weekNum}</div>
          <div className="text-xs text-muted-foreground mt-1">{weekPct}% this week</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2 flex items-center gap-1"><TrendingDown size={12} /> Best Pace</div>
          <div className="text-3xl font-bold text-primary">{formatPace(bestPace)}</div>
          <div className="text-xs text-muted-foreground mt-1">per km</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2 flex items-center gap-1"><Heart size={12} /> Recovery</div>
          <div className={`text-3xl font-bold ${lastWhoop ? recoveryColor(lastWhoop.recoveryScore) : "text-muted-foreground"}`}>
            {lastWhoop ? `${lastWhoop.recoveryScore}%` : "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">{lastWhoop ? lastWhoop.date : "no WHOOP data"}</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2 flex items-center gap-1"><Zap size={12} /> Weekly km</div>
          <div className="text-3xl font-bold">{weeklyKm.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground mt-1">last 7 days</div>
        </div>
      </div>

      {/* Milestone Progress */}
      <Card className="p-5">
        <h2 className="font-semibold text-sm mb-4">Pace Milestones</h2>
        <div className="space-y-3">
          {MILESTONES.map((m, i) => {
            const achieved = bestPace <= m.pace + 0.3;
            const isCurrent = i === currentMilestoneIdx;
            return (
              <div key={m.label} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${achieved ? "text-white" : "text-muted-foreground border border-border"}`} style={achieved ? { background: m.color } : {}}>
                  {achieved ? "✓" : i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-semibold ${achieved ? "" : "text-muted-foreground"}`} style={achieved ? { color: m.color } : {}}>{m.label}</span>
                    <span className="text-xs text-muted-foreground">{m.desc}</span>
                  </div>
                  {isCurrent && (
                    <div className="mt-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, ((8.0 - bestPace) / (8.0 - m.pace)) * 100))}%`, background: m.color }} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Recent Runs + WHOOP */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Recent Runs */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm">Recent Runs</h2>
            <Link href="/analytics" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {recentRuns.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No runs yet — upload Strava data</p>
          ) : (
            <div className="space-y-2">
              {recentRuns.map((r, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <div className="text-sm font-medium truncate max-w-[140px]">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.date} · {r.distanceKm.toFixed(1)} km</div>
                  </div>
                  <div className="text-sm font-bold text-primary">{formatPace(r.paceMinPerKm)}/km</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* WHOOP last 7 */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm">WHOOP — Last 7 Days</h2>
            <Moon size={14} className="text-muted-foreground" />
          </div>
          {whoopData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No WHOOP data — upload CSV</p>
          ) : (
            <div className="space-y-2">
              {whoopData.slice(-7).map((w, i) => (
                <div key={i} className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-muted-foreground">{w.date}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${recoveryBg(w.recoveryScore)}`} style={{ width: `${w.recoveryScore}%` }} />
                    </div>
                    <span className={`text-xs font-bold w-8 text-right ${recoveryColor(w.recoveryScore)}`}>{w.recoveryScore}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* This week checklist preview */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm">This Week · Progress</h2>
          <Link href="/checklist" className="text-xs text-primary hover:underline flex items-center gap-1">Open checklist <ArrowRight size={12} /></Link>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-success rounded-full transition-all" style={{ width: `${weekPct}%` }} />
          </div>
          <span className="text-sm font-bold text-success">{weekPct}%</span>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {WEEKLY_PLAN.map((d) => {
            const dayDone = d.sessions.every((s) => checklist.completed[s.id]);
            return (
              <div key={d.day} className="text-center">
                <div className="text-xs text-muted-foreground mb-1">{d.day.slice(0, 1)}</div>
                <div className={`h-6 w-full rounded-md flex items-center justify-center text-xs ${dayDone ? "bg-success text-success-foreground" : "bg-secondary text-muted-foreground"}`}>
                  {dayDone ? "✓" : d.sessions.length}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
