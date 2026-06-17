"use client";
import { useEffect, useRef, useState } from "react";
import { Upload, Check, X, Download, RefreshCw, Loader2, Sparkles } from "lucide-react";
import {
  loadState,
  saveState,
  exportJSON,
  importJSON,
  mergeWhoopData,
  mergeRunData,
  mergeWhoopWorkouts,
} from "@/lib/store";
import { parseWhoopCSV, parseWhoopWorkoutsCSV, parseStravaCSV, formatPace } from "@/lib/parsers";
import { runAIAnalysis } from "@/lib/aiClient";
import { applyAutoCheck } from "@/lib/autoCheck";
import type { AppState } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type UploadStatus = "idle" | "success" | "error";

export default function UploadPage() {
  const [state, setState] = useState<AppState | null>(null);
  const [whoopStatus, setWhoopStatus] = useState<UploadStatus>("idle");
  const [workoutsStatus, setWorkoutsStatus] = useState<UploadStatus>("idle");
  const [stravaStatus, setStravaStatus] = useState<UploadStatus>("idle");
  const [whoopMsg, setWhoopMsg] = useState("");
  const [workoutsMsg, setWorkoutsMsg] = useState("");
  const [stravaMsg, setStravaMsg] = useState("");
  const [aiAnalysing, setAiAnalysing] = useState(false);
  const [aiError, setAiError] = useState("");
  const whoopRef = useRef<HTMLInputElement>(null);
  const workoutsRef = useRef<HTMLInputElement>(null);
  const stravaRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setState(loadState()); }, []);

  const triggerAI = (nextState: AppState) => {
    if (nextState.whoopData.length === 0 && nextState.runData.length === 0) return;
    setAiAnalysing(true);
    setAiError("");
    runAIAnalysis(nextState)
      .then((aiPlan) => {
        const withAI = { ...nextState, aiPlan };
        setState(withAI);
        saveState(withAI);
      })
      .catch((err: unknown) => {
        setAiError(err instanceof Error ? err.message : "AI analysis failed");
      })
      .finally(() => setAiAnalysing(false));
  };

  const handleWhoop = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !state) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseWhoopCSV(ev.target?.result as string);
        if (parsed.length === 0) throw new Error("No valid rows found");
        const merged = mergeWhoopData(state.whoopData, parsed);
        const next = applyAutoCheck({ ...state, whoopData: merged });
        setState(next);
        saveState(next);
        setWhoopStatus("success");
        setWhoopMsg(`${parsed.length} days imported (${merged.length} total)`);
        triggerAI(next);
      } catch (err: unknown) {
        setWhoopStatus("error");
        setWhoopMsg(err instanceof Error ? err.message : "Failed to parse file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleWorkouts = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !state) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseWhoopWorkoutsCSV(ev.target?.result as string);
        if (parsed.length === 0) throw new Error("No valid workouts found");
        const merged = mergeWhoopWorkouts(state.whoopWorkouts, parsed);
        const next = applyAutoCheck({ ...state, whoopWorkouts: merged });
        setState(next);
        saveState(next);
        setWorkoutsStatus("success");
        setWorkoutsMsg(`${parsed.length} workouts imported (${merged.length} total)`);
        triggerAI(next);
      } catch (err: unknown) {
        setWorkoutsStatus("error");
        setWorkoutsMsg(err instanceof Error ? err.message : "Failed to parse file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleStrava = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !state) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseStravaCSV(ev.target?.result as string);
        if (parsed.length === 0) throw new Error("No running activities found");
        const merged = mergeRunData(state.runData, parsed);
        const next = applyAutoCheck({ ...state, runData: merged });
        setState(next);
        saveState(next);
        setStravaStatus("success");
        setStravaMsg(`${parsed.length} runs imported (${merged.length} total)`);
        triggerAI(next);
      } catch (err: unknown) {
        setStravaStatus("error");
        setStravaMsg(err instanceof Error ? err.message : "Failed to parse file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = importJSON(ev.target?.result as string);
        setState(imported);
        saveState(imported);
        alert("Data imported successfully!");
      } catch {
        alert("Failed to import file. Make sure it's a valid backup.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const clearAll = () => {
    if (!confirm("Clear all uploaded data? This cannot be undone.")) return;
    const next = { ...state!, whoopData: [], whoopWorkouts: [], runData: [] };
    setState(next);
    saveState(next);
    setWhoopStatus("idle");
    setWorkoutsStatus("idle");
    setStravaStatus("idle");
  };

  if (!state) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload Data</h1>
        <p className="text-sm text-muted-foreground mt-1">Upload WHOOP and Strava CSVs to track your progress automatically.</p>
      </div>

      {/* WHOOP Recovery/Sleep Upload */}
      <UploadCard
        title="WHOOP — Daily Recovery & Sleep"
        emoji="💚"
        description="WHOOP app → Account → Export Data → physiological_cycles.csv"
        format="Recovery score %, HRV, RHR, Strain, SpO2, Skin temp, Sleep stages (Light/Deep/REM), Sleep performance"
        status={whoopStatus}
        message={whoopMsg}
        count={state.whoopData.length}
        countLabel="days stored"
        onUpload={() => whoopRef.current?.click()}
      />
      <input ref={whoopRef} type="file" accept=".csv" onChange={handleWhoop} />

      {/* WHOOP Workouts Upload */}
      <UploadCard
        title="WHOOP — Workouts"
        emoji="🏋️"
        description="WHOOP app → Account → Export Data → workouts.csv (optional)"
        format="Activity name, Duration, Activity Strain, Calories, Max/Avg HR, HR Zone 1–5 %"
        status={workoutsStatus}
        message={workoutsMsg}
        count={state.whoopWorkouts.length}
        countLabel="workouts stored"
        onUpload={() => workoutsRef.current?.click()}
      />
      <input ref={workoutsRef} type="file" accept=".csv" onChange={handleWorkouts} />

      {/* Strava Upload */}
      <UploadCard
        title="Strava Activities"
        emoji="🟠"
        description="Strava → Settings → My Account → Download or Delete Your Data → Request your Archive → activities.csv"
        format="CSV with columns: Activity Date, Activity Name, Activity Type, Distance, Moving Time, Average Heart Rate"
        status={stravaStatus}
        message={stravaMsg}
        count={state.runData.length}
        countLabel="runs stored"
        onUpload={() => stravaRef.current?.click()}
      />
      <input ref={stravaRef} type="file" accept=".csv" onChange={handleStrava} />

      {/* Preview tables */}
      {state.whoopData.length > 0 && (
        <DataTable
          title="WHOOP — Recent Days"
          headers={["Date", "Recovery", "HRV", "RHR", "Sleep", "Strain", "SpO2"]}
          rows={state.whoopData.slice(-5).reverse().map((w) => [
            w.date,
            `${w.recoveryScore}%`,
            `${w.hrv} ms`,
            `${w.restingHR} bpm`,
            `${w.sleepPerformance}%`,
            w.strain ? w.strain.toFixed(1) : "—",
            w.spo2 ? `${w.spo2.toFixed(1)}%` : "—",
          ])}
        />
      )}

      {state.whoopWorkouts.length > 0 && (
        <DataTable
          title="WHOOP — Recent Workouts"
          headers={["Date", "Activity", "Duration", "Strain", "Avg HR", "Calories"]}
          rows={state.whoopWorkouts.slice(-5).reverse().map((w) => [
            w.date,
            w.activityName,
            `${w.durationMin} min`,
            w.strain.toFixed(1),
            w.avgHR ? `${w.avgHR} bpm` : "—",
            w.calories ? `${Math.round(w.calories)} cal` : "—",
          ])}
        />
      )}

      {state.runData.length > 0 && (
        <DataTable
          title="Strava — Recent Runs"
          headers={["Date", "Name", "Distance", "Pace", "HR"]}
          rows={state.runData.slice(-5).reverse().map((r) => [
            r.date, r.name.slice(0, 20), `${r.distanceKm.toFixed(1)} km`, formatPace(r.paceMinPerKm) + "/km", r.avgHR ? `${r.avgHR} bpm` : "—",
          ])}
        />
      )}

      {/* AI status */}
      {(aiAnalysing || aiError) && (
        <Card className={`p-4 ${aiError ? "bg-destructive/5 border-destructive/20" : "bg-primary/5 border-primary/20"}`}>
          <div className="flex items-center gap-3">
            {aiAnalysing ? (
              <>
                <Loader2 size={16} className="text-primary animate-spin flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-primary">AI is updating your plan…</p>
                  <p className="text-xs text-primary/70 mt-0.5">Analysing your WHOOP & run data to fine-tune this week's sessions.</p>
                </div>
              </>
            ) : (
              <>
                <X size={16} className="text-destructive flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-destructive">AI analysis failed</p>
                  <p className="text-xs text-destructive/70 mt-0.5">{aiError}</p>
                </div>
              </>
            )}
          </div>
        </Card>
      )}
      {!aiAnalysing && !aiError && state?.aiPlan && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-3">
            <Sparkles size={16} className="text-primary flex-shrink-0" />
            <p className="text-sm text-primary font-medium">AI plan updated — check your <a href="/checklist" className="underline font-semibold">Training Checklist</a> to see adjustments.</p>
          </div>
        </Card>
      )}

      {/* Backup / Restore */}
      <Card>
        <CardHeader>
          <CardTitle>Backup & Restore</CardTitle>
          <p className="text-xs text-muted-foreground">Data is stored in your browser. Export a backup to keep it safe or use on another device.</p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => exportJSON(state)} className="text-sm">
            <Download size={14} /> Export backup
          </Button>
          <Button variant="secondary" onClick={() => importRef.current?.click()} className="text-sm">
            <Upload size={14} /> Restore backup
          </Button>
          <Button variant="ghost" onClick={clearAll} className="text-sm text-destructive hover:bg-destructive/10 hover:text-destructive">
            <RefreshCw size={14} /> Clear all data
          </Button>
          <input ref={importRef} type="file" accept=".json" onChange={handleImport} />
        </CardContent>
      </Card>
    </div>
  );
}

function UploadCard({ title, emoji, description, format, status, message, count, countLabel, onUpload }: {
  title: string; emoji: string; description: string; format: string;
  status: UploadStatus; message: string; count: number; countLabel: string; onUpload: () => void;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>{emoji} {title}</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{count > 0 ? `${count} ${countLabel}` : "No data yet"}</p>
        </div>
        {status === "success" && <Check size={18} className="text-success" />}
        {status === "error" && <X size={18} className="text-destructive" />}
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-2">{description}</p>
        <div className="bg-secondary rounded-lg p-3 mb-4">
          <p className="text-xs text-muted-foreground font-mono break-words">{format}</p>
        </div>
        {message && (
          <p className={`text-xs mb-3 font-medium ${status === "success" ? "text-success" : "text-destructive"}`}>{message}</p>
        )}
        <Button onClick={onUpload} className="text-sm">
          <Upload size={14} /> Upload CSV
        </Button>
      </CardContent>
    </Card>
  );
}

function DataTable({ title, headers, rows }: { title: string; headers: string[]; rows: string[][] }) {
  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              {headers.map((h) => <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-border last:border-0 hover:bg-secondary/50">
                {row.map((cell, j) => <td key={j} className="px-4 py-2.5 text-xs whitespace-nowrap">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
