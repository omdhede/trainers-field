import Papa from "papaparse";
import type { WhoopEntry, RunActivity, WhoopWorkout } from "./types";

function findCol(row: Record<string, string>, candidates: string[]): string {
  for (const c of candidates) {
    const key = Object.keys(row).find((k) => k.toLowerCase().trim().includes(c.toLowerCase()));
    if (key && row[key] !== undefined && row[key] !== "") return row[key];
  }
  return "";
}

function safeNum(s: string): number {
  const n = parseFloat(s?.replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? 0 : n;
}

function safeNumOrUndefined(s: string): number | undefined {
  const n = safeNum(s);
  return s && !isNaN(n) ? n : undefined;
}

function parseDate(s: string): string {
  if (!s) return "";
  // Try YYYY-MM-DD first
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // Try MM/DD/YYYY
  const parts = s.split("/");
  if (parts.length === 3) {
    const [m, d, y] = parts;
    return `${y.slice(0, 4)}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // Try to parse with Date
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return s;
}

/**
 * Parses WHOOP's `physiological_cycles.csv` export (one row per daily cycle),
 * but also tolerates simpler/generic "date, recovery, hrv, ..." CSV layouts.
 */
export function parseWhoopCSV(text: string): WhoopEntry[] {
  const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  return result.data
    .map((row) => ({
      date: parseDate(findCol(row, ["date", "cycle start", "day"])),
      recoveryScore: safeNum(findCol(row, ["recovery score", "recovery"])),
      hrv: safeNum(findCol(row, ["heart rate variability", "hrv"])),
      restingHR: safeNum(findCol(row, ["resting heart rate", "resting hr", "rhr"])),
      sleepPerformance: safeNum(findCol(row, ["sleep performance", "sleep score"])),
      strain: safeNum(findCol(row, ["day strain", "strain", "activity strain"])),
      skinTemp: safeNumOrUndefined(findCol(row, ["skin temp"])),
      spo2: safeNumOrUndefined(findCol(row, ["blood oxygen", "spo2"])),
      respiratoryRate: safeNumOrUndefined(findCol(row, ["respiratory rate"])),
      energyBurned: safeNumOrUndefined(findCol(row, ["energy burned"])),
      maxHR: safeNumOrUndefined(findCol(row, ["max hr"])),
      avgHR: safeNumOrUndefined(findCol(row, ["average hr", "avg hr"])),
      sleepAsleepMin: safeNumOrUndefined(findCol(row, ["asleep duration"])),
      sleepInBedMin: safeNumOrUndefined(findCol(row, ["in bed duration"])),
      sleepLightMin: safeNumOrUndefined(findCol(row, ["light sleep duration"])),
      sleepDeepMin: safeNumOrUndefined(findCol(row, ["deep (sws) duration", "deep sleep duration"])),
      sleepRemMin: safeNumOrUndefined(findCol(row, ["rem duration"])),
      sleepAwakeMin: safeNumOrUndefined(findCol(row, ["awake duration"])),
      sleepNeedMin: safeNumOrUndefined(findCol(row, ["sleep need"])),
      sleepDebtMin: safeNumOrUndefined(findCol(row, ["sleep debt"])),
      sleepEfficiency: safeNumOrUndefined(findCol(row, ["sleep efficiency"])),
      sleepConsistency: safeNumOrUndefined(findCol(row, ["sleep consistency"])),
    }))
    .filter((e) => e.date && (e.recoveryScore > 0 || e.strain > 0 || e.hrv > 0))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Parses WHOOP's `workouts.csv` export — one row per logged activity
 * (Running, Swimming, Walking, etc.) with strain, HR and HR-zone breakdowns.
 */
export function parseWhoopWorkoutsCSV(text: string): WhoopWorkout[] {
  const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  return result.data
    .map((row) => ({
      date: parseDate(findCol(row, ["workout start time", "cycle start", "date"])),
      activityName: findCol(row, ["activity name"]) || "Activity",
      durationMin: safeNum(findCol(row, ["duration"])),
      strain: safeNum(findCol(row, ["activity strain", "strain"])),
      calories: safeNum(findCol(row, ["energy burned"])),
      maxHR: safeNum(findCol(row, ["max hr"])),
      avgHR: safeNum(findCol(row, ["average hr", "avg hr"])),
      hrZones: [1, 2, 3, 4, 5].map((z) => safeNum(findCol(row, [`hr zone ${z}`]))),
      gpsEnabled: findCol(row, ["gps enabled"]).toLowerCase() === "true",
    }))
    .filter((w) => w.date && w.durationMin > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function parseStravaCSV(text: string): RunActivity[] {
  const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  return result.data
    .map((row) => {
      const type = findCol(row, ["activity type", "type", "sport"]);
      const distRaw = safeNum(findCol(row, ["distance"]));
      // Strava exports distance in metres in some formats, km in others
      const distKm = distRaw > 500 ? distRaw / 1000 : distRaw;
      const movingTimeSec = safeNum(findCol(row, ["moving time", "elapsed time"]));
      const paceMinPerKm = distKm > 0 ? movingTimeSec / 60 / distKm : 0;
      return {
        date: parseDate(findCol(row, ["activity date", "date", "start date"])),
        name: findCol(row, ["activity name", "name"]) || "Run",
        type,
        distanceKm: parseFloat(distKm.toFixed(2)),
        movingTimeSec,
        paceMinPerKm: parseFloat(paceMinPerKm.toFixed(3)),
        avgHR: safeNum(findCol(row, ["average heart rate", "average hr", "avg hr"])) || undefined,
        elevationGain: safeNum(findCol(row, ["elevation gain"])) || undefined,
      };
    })
    .filter((a) => a.date && a.distanceKm > 0 && ["run", "running"].some((t) => a.type.toLowerCase().includes(t)))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function formatPace(minPerKm: number): string {
  if (!minPerKm || minPerKm <= 0 || minPerKm > 30) return "—";
  const mins = Math.floor(minPerKm);
  const secs = Math.round((minPerKm - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}
