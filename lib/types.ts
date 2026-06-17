export interface WhoopEntry {
  date: string;
  recoveryScore: number;
  hrv: number;
  restingHR: number;
  sleepPerformance: number;
  strain: number;
  skinTemp?: number;
  spo2?: number;
  respiratoryRate?: number;
  energyBurned?: number;
  maxHR?: number;
  avgHR?: number;
  sleepAsleepMin?: number;
  sleepInBedMin?: number;
  sleepLightMin?: number;
  sleepDeepMin?: number;
  sleepRemMin?: number;
  sleepAwakeMin?: number;
  sleepNeedMin?: number;
  sleepDebtMin?: number;
  sleepEfficiency?: number;
  sleepConsistency?: number;
}

export interface WhoopWorkout {
  date: string;
  activityName: string;
  durationMin: number;
  strain: number;
  calories: number;
  maxHR: number;
  avgHR: number;
  hrZones: number[];
  gpsEnabled: boolean;
}

export interface RunActivity {
  date: string;
  name: string;
  type: string;
  distanceKm: number;
  movingTimeSec: number;
  paceMinPerKm: number;
  avgHR?: number;
  elevationGain?: number;
}

export interface SessionId {
  day: string;
  id: string;
}

export interface ChecklistState {
  weekNumber: number;
  completed: Record<string, boolean>;
}

export interface AISessionMod {
  id: string;
  title: string;
  detail: string;
  reason: string;
}

export interface AIPlan {
  weekNumber: number;
  generatedAt: string;
  overallNote: string;
  modifications: AISessionMod[];
}

export interface AppState {
  checklist: ChecklistState;
  whoopData: WhoopEntry[];
  runData: RunActivity[];
  whoopWorkouts: WhoopWorkout[];
  aiPlan?: AIPlan;
}

export const MILESTONES = [
  { pace: 8.0, label: "8:00/km", desc: "Starting point", color: "#888780" },
  { pace: 7.0, label: "7:00/km", desc: "Month 2–3", color: "#1D9E75" },
  { pace: 6.5, label: "6:30/km", desc: "Month 4–5", color: "#378ADD" },
  { pace: 6.0, label: "6:00/km", desc: "Month 6–8", color: "#EF9F27" },
  { pace: 5.5, label: "5:30/km", desc: "Month 9–12", color: "#D85A30" },
  { pace: 5.0, label: "5:00/km", desc: "Month 12–18", color: "#D4537E" },
];

export const PHASES = [
  { id: 1, name: "Phase 1 · Rebuild", weeks: "Wks 1–2", color: "#1D9E75", minWeek: 1, maxWeek: 2 },
  { id: 2, name: "Phase 2 · Base", weeks: "Wks 3–10", color: "#378ADD", minWeek: 3, maxWeek: 10 },
  { id: 3, name: "Phase 3 · Speed", weeks: "Wks 11–24", color: "#EF9F27", minWeek: 11, maxWeek: 24 },
  { id: 4, name: "Phase 4 · Sharpen", weeks: "Mo 7–15", color: "#D4537E", minWeek: 25, maxWeek: 65 },
];

export const WEEKLY_PLAN = [
  {
    day: "Monday",
    sessions: [
      { id: "mon-am", time: "AM", emoji: "🏃", title: "Easy run · 5 km", detail: "Zone 2, conversational pace (~8:30–9:00/km). Nasal breathing only." },
      { id: "mon-pm", time: "PM", emoji: "🏊", title: "Easy swim · 30 min", detail: "Zone 1–2, relaxed technique. Active recovery from the morning run." },
    ],
  },
  {
    day: "Tuesday",
    sessions: [
      { id: "tue-am", time: "AM", emoji: "⚡", title: "Intervals · 6×400 m", detail: "1 km warmup → 6 reps at ~6:30/km effort, 90 sec walk rest → 1 km cooldown." },
      { id: "tue-pm", time: "PM", emoji: "🏋️", title: "Strength · 35 min", detail: "Goblet squats 3×10, reverse lunges 3×10/leg, RDL 3×10, plank 3×45s, calf raises 3×20." },
    ],
  },
  {
    day: "Wednesday",
    sessions: [
      { id: "wed-am", time: "AM", emoji: "🏃", title: "Easy run · 5 km + strides", detail: "Zone 2 pace, finish with 4×20 sec strides — fast but relaxed, full recovery between." },
      { id: "wed-pm", time: "PM", emoji: "🏊", title: "Swim · 40 min", detail: "Mix easy laps with 4–6 fast 50 m efforts. Good for aerobic cross-training." },
    ],
  },
  {
    day: "Thursday",
    sessions: [
      { id: "thu-am", time: "AM", emoji: "🔥", title: "Tempo run · 5 km", detail: "1 km easy → 3 km at 'comfortably hard' (~7:00–7:15/km) → 1 km easy cooldown." },
      { id: "thu-pm", time: "PM", emoji: "🧘", title: "Mobility · 20 min", detail: "Hip flexor stretch, pigeon pose, ankle mobility, foam roll quads and calves." },
    ],
  },
  {
    day: "Friday",
    sessions: [
      { id: "fri-rest", time: "—", emoji: "😴", title: "Full rest day", detail: "No training. Light walk if restless. Prioritise 8 hrs sleep. Let WHOOP recovery rebound." },
    ],
  },
  {
    day: "Saturday",
    sessions: [
      { id: "sat-am", time: "AM", emoji: "🛣️", title: "Long run · 8 km+", detail: "Slowest run of the week (~9:00/km). Add 1 km every 2 weeks, building to 14–16 km." },
    ],
  },
  {
    day: "Sunday",
    sessions: [
      { id: "sun-am", time: "AM", emoji: "🏊", title: "Recovery swim · 30 min", detail: "Zone 1 only — pure active recovery. Skip entirely if WHOOP recovery < 40%." },
      { id: "sun-pm", time: "PM", emoji: "📝", title: "Weekly review", detail: "Log paces in tracker, check WHOOP trends, plan adjustments for next week." },
    ],
  },
];
