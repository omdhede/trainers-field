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

// ─────────────────────────────────────────────────────────────────────────
// Progressive weekly plan
// ─────────────────────────────────────────────────────────────────────────
// The plan adapts to the training week using hand-authored phase breakpoints
// (not mathematical interpolation) so it reads like a real coaching plan.
// Session IDs, days, types, and slots stay STABLE across all weeks — only
// title/detail progress. autoCheck.ts depends on these stable IDs.

export interface SessionDef {
  id: string;
  time: string; // "AM" | "PM" | "—"
  emoji: string;
  title: string;
  detail: string;
  warmup?: string;
  cooldown?: string;
}

export interface DayPlan {
  day: string;
  sessions: SessionDef[];
  diet: string;
}

interface Breakpoint {
  upToWeek: number;
  title: string;
  detail: string;
}

function pick(bps: Breakpoint[], week: number): { title: string; detail: string } {
  const bp = bps.find((b) => week <= b.upToWeek) ?? bps[bps.length - 1];
  return { title: bp.title, detail: bp.detail };
}

// Warm-up / cool-down routines, keyed by session kind (stable across weeks).
const WU = {
  easyRun: "30s short-foot hold per foot (flat-foot prep), then 5 min: leg swings ×10/leg, walking lunges ×10, high knees, butt kicks. First km: focus on midfoot landing.",
  speed: "10–15 min: easy jog 8 min → leg swings, A-skips, high knees → 3–4× 20s strides building to ~90% effort.",
  longRun: "5 min brisk walk + leg swings, walking lunges, ankle circles. Start the first km very easy.",
  swim: "Dryland 3–5 min: arm circles, cross-body & overhead arm swings, trunk twists, Y-raises (shoulder activation). First 100 m easy.",
  strength: "5–10 min: mini-band glute walks, glute bridges ×15, bodyweight squats ×10, hip circles. Prime the muscles — don't fatigue.",
};
const CD = {
  easyRun: "5–10 min walk + static stretch: hamstring, quad, calf, hip-flexor 30s each. Foam roll calves & quads.",
  speed: "10 min easy jog → static stretches → foam roll quads, calves & IT band 60–90s per spot.",
  longRun: "Walk 5 min, full static-stretch routine, foam roll legs 90s/muscle, refuel within 1 hr.",
  swim: "100–200 m easy backstroke, shoulder rolls.",
  strength: "Stretch hip flexors, quads, chest; foam roll glutes & upper back.",
};

// Daily nutrition goals, keyed by day type.
const DIET = {
  hard: "Fuel day — 5–7 g carbs/kg + 1.8 g protein/kg. Post-session 3:1 carb:protein within 30 min (e.g. banana + whey). Hydrate +500 ml.",
  easySwim: "Moderate — 4–5 g carbs/kg, 1.6 g protein/kg. Include eggs or oily fish for omega-3. Hydrate well before the swim.",
  rest: "Recovery — keep protein high (2.0 g/kg), ease carbs to 3–4 g/kg, don't cut calories. Anti-inflammatory foods: berries, leafy greens, turmeric.",
  longRun: "Highest carb day — 6–8 g/kg. Pre: toast + banana ~90 min before. Post: carb + protein meal within 1 hr + electrolytes.",
  activeRecovery: "Light & whole-food — 4–5 g carbs/kg, 1.6 g protein/kg. Use the time to meal-prep for the training week.",
};

const BP = {
  monRun: [
    { upToWeek: 2, title: "Easy run · 3 km", detail: "Zone 1–2, very easy. Walk breaks OK whenever you need them." },
    { upToWeek: 6, title: "Easy run · 4 km", detail: "Zone 2, conversational pace. Relaxed and steady." },
    { upToWeek: 10, title: "Easy run · 5 km", detail: "Zone 2, nasal breathing only (~8:30–9:00/km)." },
    { upToWeek: 17, title: "Easy run · 5 km", detail: "Zone 2 steady ~8:00/km. Smooth midfoot landing." },
    { upToWeek: 24, title: "Easy run · 5–6 km", detail: "Zone 2 ~7:30/km. Relaxed but purposeful." },
    { upToWeek: Infinity, title: "Easy run · 6 km", detail: "Zone 2 ~7:00/km. Easy aerobic mileage." },
  ],
  wedRun: [
    { upToWeek: 2, title: "Easy run · 3 km", detail: "Zone 1–2, very easy. Walk breaks OK." },
    { upToWeek: 6, title: "Easy run · 4 km", detail: "Zone 2, conversational pace." },
    { upToWeek: 10, title: "Easy run · 5 km + strides", detail: "Zone 2 pace, finish with 4×20s strides — fast but relaxed, full recovery between." },
    { upToWeek: 17, title: "Easy run · 5 km + strides", detail: "Zone 2 ~8:00/km, finish 4×20s strides." },
    { upToWeek: 24, title: "Easy run · 5–6 km + strides", detail: "Zone 2 ~7:30/km, finish 6×20s strides." },
    { upToWeek: Infinity, title: "Easy run · 6 km + strides", detail: "Zone 2 ~7:00/km, finish 6×20s strides." },
  ],
  intervals: [
    { upToWeek: 2, title: "Easy run · 3 km", detail: "Base-building easy run, Zone 2. No hard efforts yet — we build the engine first." },
    { upToWeek: 6, title: "Easy run · 4 km + strides", detail: "Zone 2 + 4×100 m strides to introduce light leg speed. Full recovery between." },
    { upToWeek: 10, title: "Intervals · 4×400 m", detail: "1 km warmup → 4 reps @ ~7:30/km, 90s walk rest → 1 km cooldown." },
    { upToWeek: 17, title: "Intervals · 6×400 m", detail: "1 km warmup → 6 reps @ ~6:45/km, 90s walk rest → 1 km cooldown." },
    { upToWeek: 24, title: "Intervals · 8×400 m", detail: "1 km warmup → 8 reps @ ~6:15/km, 75s walk rest → 1 km cooldown." },
    { upToWeek: Infinity, title: "Intervals · 5×800 m", detail: "1.5 km warmup → 5 reps @ ~5:30/km, 2 min jog rest → 1 km cooldown." },
  ],
  tempo: [
    { upToWeek: 2, title: "Easy run · 3 km", detail: "Easy Zone 2. Tempo work comes later — stay relaxed." },
    { upToWeek: 6, title: "Easy run · 4 km", detail: "Easy Zone 2, building aerobic base." },
    { upToWeek: 10, title: "Tempo run · 4 km", detail: "1 km easy → 2 km @ 'comfortably hard' ~7:30/km → 1 km easy cooldown." },
    { upToWeek: 17, title: "Tempo run · 5 km", detail: "1 km easy → 3 km @ ~7:00/km → 1 km easy cooldown." },
    { upToWeek: 24, title: "Tempo run · 6 km", detail: "1 km easy → 4 km @ ~6:30/km → 1 km easy cooldown." },
    { upToWeek: Infinity, title: "Tempo run · 7 km", detail: "1 km easy → 5 km @ ~5:45/km → 1 km easy cooldown." },
  ],
  longRun: [
    { upToWeek: 2, title: "Long run · 4 km", detail: "Slowest run of the week (~9:00/km). Just time on feet." },
    { upToWeek: 6, title: "Long run · 5–6 km", detail: "Zone 2, ~9:00/km. Adds ~1 km every couple of weeks." },
    { upToWeek: 10, title: "Long run · 7–8 km", detail: "Zone 2 endurance, conversational throughout." },
    { upToWeek: 17, title: "Long run · 9–10 km", detail: "Zone 2, steady. Practice mid-run fueling & hydration." },
    { upToWeek: 24, title: "Long run · 11–14 km", detail: "Zone 2 endurance. Build gradually toward 14 km." },
    { upToWeek: Infinity, title: "Long run · 14–16 km", detail: "Zone 2 — your aerobic cornerstone. Negative-split the last 2 km." },
  ],
  monSwim: [
    { upToWeek: 2, title: "Easy swim · 20 min", detail: "Zone 1, technique focus. Active recovery from the morning run." },
    { upToWeek: 6, title: "Easy swim · 25 min", detail: "Zone 1–2, relaxed laps with drills." },
    { upToWeek: 10, title: "Easy swim · 30 min", detail: "Zone 1–2, steady. Pull buoy if the legs feel heavy." },
    { upToWeek: Infinity, title: "Easy swim · 30 min", detail: "Zone 1–2 active recovery. Smooth, relaxed technique." },
  ],
  wedSwim: [
    { upToWeek: 2, title: "Swim · 20 min", detail: "Zone 1–2, technique and breathing. Build comfort in the water." },
    { upToWeek: 6, title: "Swim · 25 min", detail: "Easy laps + drills (catch-up, fingertip drag)." },
    { upToWeek: 10, title: "Swim · 30 min", detail: "Mix easy laps with 4–6 fast 50 m efforts. Aerobic cross-training." },
    { upToWeek: 17, title: "Swim · 30 min", detail: "Warmup + 4×50 m fast on rest, easy laps between." },
    { upToWeek: 24, title: "Swim · 35 min", detail: "Mixed sets: drills, pace 50s, easy. Solid aerobic stimulus." },
    { upToWeek: Infinity, title: "Swim · 40 min", detail: "Structured sets (e.g. 6×100 m on an interval). Strong cross-training." },
  ],
  sunSwim: [
    { upToWeek: 2, title: "Recovery swim · 20 min", detail: "Zone 1 only — pure active recovery. Skip if WHOOP recovery < 40%." },
    { upToWeek: 10, title: "Recovery swim · 30 min", detail: "Zone 1 only — pure active recovery. Skip if WHOOP recovery < 40%." },
    { upToWeek: Infinity, title: "Recovery swim · 30–40 min", detail: "Zone 1 easy. Loosen the legs. Skip if WHOOP recovery < 40%." },
  ],
  strength: [
    { upToWeek: 2, title: "Strength · 20 min", detail: "Bodyweight 2×8: squats, reverse lunges, glute bridges, calf raises, plank 30s. Plus posterior-tibialis: heel raises holding the arch high." },
    { upToWeek: 6, title: "Strength · 25 min", detail: "2×10: goblet squats, reverse lunges, RDL, calf raises, plank 40s. Eccentric heel raises 3×12 (slow 3–4s down)." },
    { upToWeek: 10, title: "Strength · 30 min", detail: "3×10: goblet squats, lunges, RDL, calf raises, plank 45s. Single-leg eccentric heel raises 2×10/side." },
    { upToWeek: 17, title: "Strength · 35 min", detail: "3×10 weighted: squats, lunges, RDL, calf raises, plank 60s. Single-leg heel raises 3×15 with arch focus." },
    { upToWeek: 24, title: "Strength · 35 min", detail: "3×10 heavier (2–3 RIR): squats, lunges, RDL, hip thrust, weighted single-leg calf raises." },
    { upToWeek: Infinity, title: "Strength · 35 min", detail: "3×12 progressive: squats, lunges, RDL, hip thrust, controlled calf raises. Maintain through peak running." },
  ],
  mobility: [
    { upToWeek: 2, title: "Mobility · 15 min", detail: "Hip-flexor stretch, pigeon pose, ankle mobility, calf stretch. Gentle, hold 30s." },
    { upToWeek: 6, title: "Mobility · 20 min", detail: "Hip flexor, pigeon, ankle mobility, hamstring, calf. Hold 30–45s each." },
    { upToWeek: 10, title: "Mobility · 20 min + foam roll", detail: "Full lower-body stretch + foam roll quads, calves, IT band 60–90s." },
    { upToWeek: 17, title: "Mobility · 20 min", detail: "Full routine: hips, hamstrings, calves, T-spine. Foam roll glutes & IT band." },
    { upToWeek: Infinity, title: "Mobility · 25 min", detail: "Comprehensive mobility + foam roll. Extra attention to calves & feet (flat-foot care)." },
  ],
  foot: [
    { upToWeek: 2, title: "Foot care · 8 min", detail: "Seated short-foot holds 3×30s/foot, toe yoga (big toe down / others up) 10×/foot, towel scrunches 2×15, ankle circles 10×/direction." },
    { upToWeek: 6, title: "Foot care · 10 min", detail: "Standing short-foot holds 3×30s, double-leg eccentric heel raises 3×12 (slow 3–4s down), heel walks 3×20 steps, light band inversion 2×15." },
    { upToWeek: 10, title: "Foot care · 10 min", detail: "Single-leg short-foot balance 3×20s, single-leg eccentric heel raise 2×10/side, band inversion (red) 2×15, calf + Achilles stretch." },
    { upToWeek: 17, title: "Foot care · 10 min", detail: "Single-leg heel raise 3×15 (arch focus), balance on a cushion 3×30s, band inversion (green) 2×20, arch doming 3×20." },
    { upToWeek: 24, title: "Foot care · 10 min", detail: "Weighted single-leg calf raises 3×12, controlled hops with arch hold 3×10, single-leg balance eyes-closed 3×30s." },
    { upToWeek: Infinity, title: "Foot care · 10 min", detail: "Maintenance circuit: short-foot, single-leg calf raises, band work + barefoot strides on grass 4×20s." },
  ],
};

export function getWeeklyPlan(weekNumber: number): DayPlan[] {
  const w = Math.max(1, weekNumber);
  const isDownWeek = w % 4 === 0; // every 4th week (8, 12, …) is a recovery week
  const isSpeedPhase = w >= 7; // intervals & tempo introduced from week 7

  const footSession = (id: string): SessionDef => ({
    id,
    time: "—",
    emoji: "🦶",
    ...pick(BP.foot, w),
  });

  // Intervals & long run get trimmed on down weeks.
  const intervals = pick(BP.intervals, w);
  const longRun = pick(BP.longRun, w);
  const intervalsDetail = isDownWeek && isSpeedPhase
    ? `DOWN WEEK — cut volume ~30%: run about ⅔ of the listed reps at the same effort, then stop. Prioritise recovery. (${intervals.detail})`
    : intervals.detail;
  const longRunDetail = isDownWeek
    ? `DOWN WEEK — reduce distance ~30% from the listed range and keep it very easy. Let the body absorb the training. (${longRun.detail})`
    : longRun.detail;

  return [
    {
      day: "Monday",
      diet: DIET.easySwim,
      sessions: [
        { id: "mon-am", time: "AM", emoji: "🏃", ...pick(BP.monRun, w), warmup: WU.easyRun, cooldown: CD.easyRun },
        { id: "mon-pm", time: "PM", emoji: "🏊", ...pick(BP.monSwim, w), warmup: WU.swim, cooldown: CD.swim },
        footSession("mon-foot"),
      ],
    },
    {
      day: "Tuesday",
      diet: DIET.hard,
      sessions: [
        {
          id: "tue-am",
          time: "AM",
          emoji: isSpeedPhase ? "⚡" : "🏃",
          title: intervals.title,
          detail: intervalsDetail,
          warmup: isSpeedPhase ? WU.speed : WU.easyRun,
          cooldown: isSpeedPhase ? CD.speed : CD.easyRun,
        },
        { id: "tue-pm", time: "PM", emoji: "🏋️", ...pick(BP.strength, w), warmup: WU.strength, cooldown: CD.strength },
        footSession("tue-foot"),
      ],
    },
    {
      day: "Wednesday",
      diet: DIET.easySwim,
      sessions: [
        { id: "wed-am", time: "AM", emoji: "🏃", ...pick(BP.wedRun, w), warmup: WU.easyRun, cooldown: CD.easyRun },
        { id: "wed-pm", time: "PM", emoji: "🏊", ...pick(BP.wedSwim, w), warmup: WU.swim, cooldown: CD.swim },
        footSession("wed-foot"),
      ],
    },
    {
      day: "Thursday",
      diet: DIET.hard,
      sessions: [
        {
          id: "thu-am",
          time: "AM",
          emoji: isSpeedPhase ? "🔥" : "🏃",
          ...pick(BP.tempo, w),
          warmup: isSpeedPhase ? WU.speed : WU.easyRun,
          cooldown: isSpeedPhase ? CD.speed : CD.easyRun,
        },
        { id: "thu-pm", time: "PM", emoji: "🧘", ...pick(BP.mobility, w) },
        footSession("thu-foot"),
      ],
    },
    {
      day: "Friday",
      diet: DIET.rest,
      sessions: [
        { id: "fri-rest", time: "—", emoji: "😴", title: "Full rest day", detail: "No training. Light walk if restless. Prioritise 8 hrs sleep. Let WHOOP recovery rebound." },
        footSession("fri-foot"),
      ],
    },
    {
      day: "Saturday",
      diet: DIET.longRun,
      sessions: [
        { id: "sat-am", time: "AM", emoji: "🛣️", title: longRun.title, detail: longRunDetail, warmup: WU.longRun, cooldown: CD.longRun },
        footSession("sat-foot"),
      ],
    },
    {
      day: "Sunday",
      diet: DIET.activeRecovery,
      sessions: [
        { id: "sun-am", time: "AM", emoji: "🏊", ...pick(BP.sunSwim, w), warmup: WU.swim, cooldown: CD.swim },
        { id: "sun-pm", time: "PM", emoji: "📝", title: "Weekly review", detail: "Log paces in the tracker, check WHOOP trends, plan adjustments for next week." },
        footSession("sun-foot"),
      ],
    },
  ];
}
