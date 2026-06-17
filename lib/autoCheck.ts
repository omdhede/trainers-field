import type { AppState } from "./types";
import { WEEKLY_PLAN } from "./types";

const DAY_OFFSET: Record<string, number> = {
  Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3,
  Friday: 4, Saturday: 5, Sunday: 6,
};

function getMondayOfCurrentWeek(): Date {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function isSwimActivity(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes("swim") || n.includes("pool") || n.includes("open water");
}

function isStrengthActivity(name: string): boolean {
  const n = name.toLowerCase();
  return (
    n.includes("strength") || n.includes("weight") || n.includes("gym") ||
    n.includes("crossfit") || n.includes("hiit") || n.includes("functional") ||
    n.includes("lifting") || n.includes("powerlifting")
  );
}

function isMobilityActivity(name: string): boolean {
  const n = name.toLowerCase();
  return (
    n.includes("yoga") || n.includes("pilates") || n.includes("stretch") ||
    n.includes("mobility") || n.includes("flexibility")
  );
}

const RUN_SESSION_IDS = new Set(["mon-am", "tue-am", "wed-am", "thu-am", "sat-am"]);

/**
 * Matches this week's Strava runs and WHOOP workouts to planned sessions and
 * marks them complete. Only ever adds true — never unsets an existing check.
 * Returns the same object if nothing changed.
 */
export function applyAutoCheck(state: AppState): AppState {
  const monday = getMondayOfCurrentWeek();
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const newCompleted = { ...state.checklist.completed };
  let changed = false;

  for (const day of WEEKLY_PLAN) {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + DAY_OFFSET[day.day]);
    // Can't auto-check future sessions
    if (dayDate > today) continue;

    const dateStr = dayDate.toISOString().slice(0, 10);

    for (const session of day.sessions) {
      const { id } = session;
      if (newCompleted[id]) continue; // already checked — skip

      let matched = false;

      if (RUN_SESSION_IDS.has(id)) {
        // Any run logged on this date in Strava
        matched = state.runData.some(
          (r) => r.date === dateStr && r.paceMinPerKm > 0 && r.paceMinPerKm < 20
        );
      } else if (id === "mon-pm" || id === "wed-pm" || id === "sun-am") {
        // Swim in WHOOP workouts
        matched = state.whoopWorkouts.some(
          (w) => w.date === dateStr && isSwimActivity(w.activityName)
        );
      } else if (id === "tue-pm") {
        // Strength in WHOOP workouts
        matched = state.whoopWorkouts.some(
          (w) => w.date === dateStr && isStrengthActivity(w.activityName)
        );
      } else if (id === "thu-pm") {
        // Mobility / yoga in WHOOP workouts
        matched = state.whoopWorkouts.some(
          (w) => w.date === dateStr && isMobilityActivity(w.activityName)
        );
      } else if (id === "fri-rest") {
        // Auto-check rest day if no run was logged (true rest)
        matched = !state.runData.some((r) => r.date === dateStr);
      }
      // sun-pm (weekly review) — manual only, never auto-checked

      if (matched) {
        newCompleted[id] = true;
        changed = true;
      }
    }
  }

  if (!changed) return state;
  return { ...state, checklist: { ...state.checklist, completed: newCompleted } };
}
