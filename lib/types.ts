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

// ── Systematic per-week running progression ────────────────────────────────
// Numbers step forward every week from a 5 km week-1 easy-run baseline, so no
// two consecutive weeks are identical. Distances are computed (clean 0.5 km
// steps); zones/paces/cues come from the phase. The long run undulates within
// each 4-week microcycle (build, build, peak, recovery) which guarantees the
// week as a whole always differs from the one before — even once easy runs and
// intervals plateau. Every 4th week is a down/recovery week.

const fmtKm = (n: number) => `${+n.toFixed(2)} km`;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

// Easy run (Mon/Wed): 5 km baseline, +0.5 km every 2 weeks, capped at 8 km.
function easyRunKm(w: number): number {
  return clamp(5 + 0.5 * Math.floor((w - 1) / 2), 5, 8);
}
function easyPace(w: number): string {
  if (w <= 4) return "~8:30/km";
  if (w <= 10) return "~8:00/km";
  if (w <= 18) return "~7:30/km";
  if (w <= 24) return "~7:15/km";
  return "~7:00/km";
}

// Long run (Sat): rising mean (6 → 15 km) with a 4-week undulation so each week
// differs. Position in the microcycle: 0,1,2 build; 3 = down/recovery.
function longRunKm(w: number): number {
  const base = clamp(6 + 0.5 * (w - 1), 6, 15);
  const undulation = [0, 0.5, 1, -3][(w - 1) % 4];
  return clamp(base + undulation, 5, 16);
}
function longPace(w: number): string {
  if (w <= 10) return "~9:00/km";
  if (w <= 24) return "~8:00/km";
  return "~7:30/km";
}

// Interval structure by phase; reps grow ~every 2 weeks within each band.
function intervalSpec(w: number): { reps: number; unit: number; pace: string; rest: string } | null {
  if (w <= 6) return null; // intervals not introduced yet
  if (w <= 12) return { reps: clamp(4 + Math.floor((w - 7) / 2), 4, 8), unit: 400, pace: "~7:00/km", rest: "90s walk" };
  if (w <= 18) return { reps: clamp(6 + Math.floor((w - 13) / 2), 6, 10), unit: 400, pace: "~6:30/km", rest: "75s walk" };
  if (w <= 24) return { reps: clamp(4 + Math.floor((w - 19) / 2), 4, 7), unit: 600, pace: "~6:00/km", rest: "90s jog" };
  return { reps: clamp(4 + Math.floor((w - 25) / 2), 4, 7), unit: 800, pace: "~5:30/km", rest: "2 min jog" };
}

function tempoKm(w: number): number {
  if (w <= 10) return 2;
  if (w <= 16) return 3;
  if (w <= 24) return 4;
  return 5;
}
function tempoPace(w: number): string {
  if (w <= 10) return "~7:30/km";
  if (w <= 16) return "~7:00/km";
  if (w <= 24) return "~6:30/km";
  return "~5:45/km";
}

export function getWeeklyPlan(weekNumber: number): DayPlan[] {
  const w = Math.max(1, weekNumber);
  const isDownWeek = w % 4 === 0; // every 4th week (4, 8, 12, …) is recovery
  const hasSpeed = w >= 7; // structured intervals & tempo from week 7

  const footSession = (id: string): SessionDef => ({
    id,
    time: "—",
    emoji: "🦶",
    ...pick(BP.foot, w),
  });

  // ── Aerobic runs ──
  // The week always has 5 runs, but each has a distinct purpose so no two read
  // the same: Mon steady · Tue strides→intervals · Wed recovery · Thu
  // progression→tempo · Sat long.
  const easyKm = easyRunKm(w);
  const recoveryKm = Math.max(3, easyKm - 1);
  const ePace = easyPace(w);
  const strideCount = w >= 18 ? 6 : 4;

  const monRun = {
    title: `Easy run · ${fmtKm(easyKm)}`,
    detail: `Steady Zone 2, conversational pace (${ePace}). Nasal breathing only, smooth midfoot landing.`,
  };
  const recoveryRun = {
    title: `Recovery run · ${fmtKm(recoveryKm)}`,
    detail: `The week's shortest, easiest run — Zone 1, fully relaxed. Flush the legs between harder days; walk a little if you need to.`,
  };
  const stridesRun = {
    title: `Easy run · ${fmtKm(easyKm)} + strides`,
    detail: `Zone 2 easy (${ePace}), then ${strideCount}×20s strides — fast but relaxed, full recovery between. Builds leg speed without strain.`,
  };
  const progressionRun = {
    title: `Progression run · ${fmtKm(easyKm)}`,
    detail: `Start easy Zone 2, then gradually lift to a strong-but-controlled effort over the final third. A gentle on-ramp toward tempo work.`,
  };

  // Tue AM: easy + strides during the base phase, structured intervals from wk 7.
  const spec = intervalSpec(w);
  let tueRun: { title: string; detail: string };
  if (!spec) {
    tueRun = stridesRun;
  } else {
    const reps = isDownWeek ? Math.max(2, Math.round(spec.reps * 0.7)) : spec.reps;
    const unitLabel = spec.unit >= 1000 ? `${spec.unit / 1000} km` : `${spec.unit} m`;
    tueRun = {
      title: `Intervals · ${reps}×${unitLabel}`,
      detail: `1 km warmup → ${reps} reps @ ${spec.pace}, ${spec.rest} rest → 1 km cooldown.${isDownWeek ? " (Down week — reduced volume, prioritise recovery.)" : ""}`,
    };
  }

  // Thu AM: progression run during the base phase, tempo from wk 7.
  let thuRun: { title: string; detail: string };
  if (w <= 6) {
    thuRun = progressionRun;
  } else {
    const tk = isDownWeek ? Math.max(1, tempoKm(w) - 1) : tempoKm(w);
    thuRun = {
      title: `Tempo run · ${fmtKm(tk + 2)}`,
      detail: `1 km easy → ${fmtKm(tk)} @ 'comfortably hard' ${tempoPace(w)} → 1 km easy cooldown.${isDownWeek ? " (Down week — shortened tempo.)" : ""}`,
    };
  }

  // ── Long run (Sat AM) ──
  const longKm = longRunKm(w);
  const longRun = {
    title: `Long run · ${fmtKm(longKm)}`,
    detail: `Slowest run of the week (${longPace(w)}). Zone 2 endurance, conversational throughout.${longKm >= 10 ? " Practice mid-run fueling & hydration." : ""}${isDownWeek ? " (Down week — keep it very easy and short.)" : ""}`,
  };

  return [
    {
      day: "Monday",
      diet: DIET.easySwim,
      sessions: [
        { id: "mon-am", time: "AM", emoji: "🏃", ...monRun, warmup: WU.easyRun, cooldown: CD.easyRun },
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
          emoji: spec ? "⚡" : "🏃",
          ...tueRun,
          warmup: spec ? WU.speed : WU.easyRun,
          cooldown: spec ? CD.speed : CD.easyRun,
        },
        { id: "tue-pm", time: "PM", emoji: "🏋️", ...pick(BP.strength, w), warmup: WU.strength, cooldown: CD.strength },
        footSession("tue-foot"),
      ],
    },
    {
      day: "Wednesday",
      diet: DIET.easySwim,
      sessions: [
        { id: "wed-am", time: "AM", emoji: "🏃", ...recoveryRun, warmup: WU.easyRun, cooldown: CD.easyRun },
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
          emoji: hasSpeed ? "🔥" : "🏃",
          ...thuRun,
          warmup: hasSpeed ? WU.speed : WU.easyRun,
          cooldown: hasSpeed ? CD.speed : CD.easyRun,
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
        { id: "sat-am", time: "AM", emoji: "🛣️", ...longRun, warmup: WU.longRun, cooldown: CD.longRun },
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
