import type { AIPlan, AppState } from "./types";
import { WEEKLY_PLAN, PHASES } from "./types";

export async function runAIAnalysis(state: AppState): Promise<AIPlan> {
  const { checklist, whoopData, runData } = state;
  const weekNumber = checklist.weekNumber;
  const phase =
    PHASES.find((p) => weekNumber >= p.minWeek && weekNumber <= p.maxWeek) || PHASES[0];

  const recentWhoop = whoopData.slice(-7).map(
    ({ date, recoveryScore, hrv, restingHR, sleepPerformance, sleepDebtMin, strain }) => ({
      date,
      recoveryScore,
      hrv,
      restingHR,
      sleepPerformance,
      sleepDebtMin,
      strain,
    })
  );

  const recentRuns = runData
    .filter((r) => r.paceMinPerKm > 0 && r.paceMinPerKm < 20)
    .slice(-6)
    .map(({ date, distanceKm, paceMinPerKm, avgHR }) => ({
      date,
      distanceKm,
      paceMinPerKm,
      avgHR,
    }));

  const sessions = WEEKLY_PLAN.flatMap((d) =>
    d.sessions.map((s) => ({ id: s.id, title: s.title, detail: s.detail }))
  );

  const res = await fetch("/api/analyse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      weekNumber,
      phaseName: phase.name,
      whoopData: recentWhoop,
      runData: recentRuns,
      sessions,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error || `AI analysis failed (${res.status})`);
  }

  return res.json() as Promise<AIPlan>;
}
