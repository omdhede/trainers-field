import { NextRequest, NextResponse } from "next/server";
import type { AIPlan } from "@/lib/types";

const SYSTEM_PROMPT = `You are a personal running coach AI. A runner is working toward a goal of 5:00/km pace (sub-50 minute 10 km). Their weekly training plan has fixed session types and days. You review recent WHOOP recovery and Strava run data, then make SMALL adjustments to individual session details only.

HARD RULES — never break these:
1. Do NOT remove, add, or reorder any sessions.
2. Do NOT change the session type (tempo stays tempo, swim stays swim, strength stays strength, rest stays rest).
3. Do NOT change the training phase structure or the 5:00/km end goal.
4. Volume adjustments are ±1–2 km maximum for runs; intensity shifts are minor (e.g., Zone 2 → Zone 1 only if severely fatigued).
5. If the data looks normal (recovery 50–100%, HRV stable, paces improving), return an EMPTY modifications array.
6. Every modification reason must cite a specific metric from the provided data.
7. Use only the exact session ids from the input — never invent new ones.

ADJUSTMENT GUIDE:
- Recovery < 40%: reduce run distances by 1 km, add extra rest cues in detail.
- HRV trending down >15% across the week: shift intensity to the lower zone range.
- Sleep debt consistently > 60 min: note it in overallNote, ease the most demanding session's detail.
- Recent pace faster than session target: acknowledge progress; can push tempo/interval sessions slightly.
- Recovery 67–100%: sessions can stay as-is or slightly increase volume by ±0.5 km if appropriate.

Return ONLY a valid JSON object with exactly this shape (no markdown, no text outside the JSON):
{
  "weekNumber": <number>,
  "generatedAt": "<current ISO timestamp>",
  "overallNote": "<1-2 sentences summarising weekly outlook based on the data>",
  "modifications": [
    {
      "id": "<exact session id from the input>",
      "title": "<adjusted title — same format as original>",
      "detail": "<adjusted detail with a specific, data-driven coaching cue>",
      "reason": "<one-line reason citing the specific metric>"
    }
  ]
}`;

interface WhoopRow {
  date: string;
  recoveryScore: number;
  hrv: number;
  restingHR: number;
  sleepPerformance: number;
  sleepDebtMin?: number;
  strain: number;
}

interface RunRow {
  date: string;
  distanceKm: number;
  paceMinPerKm: number;
  avgHR?: number;
}

interface Session {
  id: string;
  title: string;
  detail: string;
}

interface AnalysePayload {
  weekNumber: number;
  phaseName: string;
  whoopData: WhoopRow[];
  runData: RunRow[];
  sessions: Session[];
}

function buildUserMessage(payload: AnalysePayload): string {
  const whoopLines = payload.whoopData.length
    ? payload.whoopData
        .map(
          (w) =>
            `${w.date}: Recovery ${w.recoveryScore}%, HRV ${w.hrv}ms, RHR ${w.restingHR}bpm, Sleep ${w.sleepPerformance}%, Strain ${w.strain.toFixed(1)}${w.sleepDebtMin != null ? `, Sleep debt ${w.sleepDebtMin}min` : ""}`
        )
        .join("\n")
    : "No WHOOP data available.";

  const runLines = payload.runData.length
    ? payload.runData
        .map((r) => {
          const paceMin = Math.floor(r.paceMinPerKm);
          const paceSec = Math.round((r.paceMinPerKm - paceMin) * 60);
          return `${r.date}: ${r.distanceKm.toFixed(1)} km @ ${paceMin}:${String(paceSec).padStart(2, "0")}/km${r.avgHR ? ` (avg HR ${r.avgHR} bpm)` : ""}`;
        })
        .join("\n")
    : "No run data available.";

  return `Training week: ${payload.weekNumber} (${payload.phaseName})

WHOOP — last 7 days (oldest to most recent):
${whoopLines}

RECENT RUNS — last 6 (oldest to most recent):
${runLines}

THIS WEEK'S SESSIONS (use exact session ids in your modifications[]):
${JSON.stringify(payload.sessions, null, 2)}

Return the AIPlan JSON.`;
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-openai-key") || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "No OpenAI API key configured. Add one in the Settings page or set OPENAI_API_KEY on the server." },
      { status: 500 }
    );
  }

  let payload: AnalysePayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const userMessage = buildUserMessage(payload);

  let openAIRes: Response;
  try {
    openAIRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 1500,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      }),
    });
  } catch {
    return NextResponse.json({ error: "Failed to reach OpenAI API." }, { status: 500 });
  }

  if (!openAIRes.ok) {
    const errBody = await openAIRes.json().catch(() => ({})) as { error?: { message?: string } };
    return NextResponse.json(
      { error: errBody.error?.message || "OpenAI API error." },
      { status: 500 }
    );
  }

  const data = await openAIRes.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    return NextResponse.json({ error: "Empty response from AI." }, { status: 500 });
  }

  let plan: AIPlan;
  try {
    plan = JSON.parse(content) as AIPlan;
  } catch {
    return NextResponse.json({ error: "AI returned invalid JSON." }, { status: 500 });
  }

  return NextResponse.json(plan);
}
