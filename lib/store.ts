"use client";
import type { AppState, WhoopEntry, RunActivity, WhoopWorkout } from "./types";

const KEY = "run-tracker-v1";

const DEFAULT_STATE: AppState = {
  checklist: { weekNumber: 1, completed: {} },
  whoopData: [],
  runData: [],
  whoopWorkouts: [],
};

export function loadState(): AppState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(state: AppState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}

export function exportJSON(state: AppState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `run-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importJSON(text: string): AppState {
  return { ...DEFAULT_STATE, ...JSON.parse(text) };
}

export function mergeWhoopData(existing: WhoopEntry[], incoming: WhoopEntry[]): WhoopEntry[] {
  const map = new Map(existing.map((e) => [e.date, e]));
  incoming.forEach((e) => map.set(e.date, e));
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function mergeRunData(existing: RunActivity[], incoming: RunActivity[]): RunActivity[] {
  const map = new Map(existing.map((r) => [`${r.date}-${r.name}`, r]));
  incoming.forEach((r) => map.set(`${r.date}-${r.name}`, r));
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function mergeWhoopWorkouts(existing: WhoopWorkout[], incoming: WhoopWorkout[]): WhoopWorkout[] {
  const map = new Map(existing.map((w) => [`${w.date}-${w.activityName}-${w.durationMin}`, w]));
  incoming.forEach((w) => map.set(`${w.date}-${w.activityName}-${w.durationMin}`, w));
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}
