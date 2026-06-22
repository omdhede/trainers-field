import type { AIPlan, AppState } from "./types";
import { getWeeklyPlan, PHASES } from "./types";

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

  // Only send incomplete sessions — AI must not touch already-done work.
  // Foot-care sessions are excluded — they're a fixed rehab protocol, not for AI tweaking.
  const sessions = getWeeklyPlan(weekNumber).flatMap((d) =>
    d.sessions
      .filter((s) => !checklist.completed[s.id] && !s.id.endsWith("-foot"))
      .map((s) => ({ id: s.id, title: s.title, detail: s.detail }))
  );

  const storedKey = typeof window !== "undefined" ? localStorage.getItem("rta-openai-key") : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (storedKey) headers["x-openai-key"] = storedKey;

  const res = await fetch("/api/analyse", {
    method: "POST",
    headers,
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
