"use client";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, Sparkles, Loader2 } from "lucide-react";
import { loadState, saveState } from "@/lib/store";
import { runAIAnalysis } from "@/lib/aiClient";
import { applyAutoCheck } from "@/lib/autoCheck";
import { WEEKLY_PLAN, PHASES } from "@/lib/types";
import type { AppState } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function Checklist() {
  const [state, setState] = useState<AppState | null>(null);
  const [aiAnalysing, setAiAnalysing] = useState(false);
  const [showOriginal, setShowOriginal] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loaded = loadState();
    const withAuto = applyAutoCheck(loaded);
    if (withAuto !== loaded) saveState(withAuto); // persist only if something changed
    setState(withAuto);
  }, []);

  if (!state) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;

  const { checklist } = state;
  const weekNum = checklist.weekNumber;
  const phase = PHASES.find((p) => weekNum >= p.minWeek && weekNum <= p.maxWeek) || PHASES[0];

  const allIds = WEEKLY_PLAN.flatMap((d) => d.sessions.map((s) => s.id));
  const completedCount = allIds.filter((id) => checklist.completed[id]).length;
  const pct = Math.round((completedCount / allIds.length) * 100);

  const aiPlan = state.aiPlan?.weekNumber === weekNum ? state.aiPlan : undefined;
  const hasData = state.whoopData.length > 0 || state.runData.length > 0;

  const toggle = (id: string) => {
    const next: AppState = {
      ...state,
      checklist: {
        ...checklist,
        completed: { ...checklist.completed, [id]: !checklist.completed[id] },
      },
    };
    setState(next);
    saveState(next);
  };

  const nextWeek = () => {
    const next: AppState = {
      ...state,
      checklist: { weekNumber: weekNum + 1, completed: {} },
    };
    setState(next);
    saveState(next);
  };

  const prevWeek = () => {
    if (weekNum <= 1) return;
    const next: AppState = {
      ...state,
      checklist: { weekNumber: weekNum - 1, completed: {} },
    };
    setState(next);
    saveState(next);
  };

  const reset = () => {
    const next: AppState = { ...state, checklist: { weekNumber: weekNum, completed: {} } };
    setState(next);
    saveState(next);
  };

  const reanalyse = () => {
    if (!state || aiAnalysing || !hasData) return;
    setAiAnalysing(true);
    runAIAnalysis(state)
      .then((plan) => {
        const next = { ...state, aiPlan: plan };
        setState(next);
        saveState(next);
      })
      .catch((err: unknown) => {
        console.error("AI analysis failed:", err);
      })
      .finally(() => setAiAnalysing(false));
  };

  const toggleOriginal = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setShowOriginal((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Training Checklist</h1>
          <p className="text-sm mt-0.5" style={{ color: phase.color }}>{phase.name} · {phase.weeks}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={reanalyse}
            disabled={aiAnalysing || !hasData}
            className="text-xs gap-1.5 disabled:opacity-40"
          >
            {aiAnalysing
              ? <><Loader2 size={12} className="animate-spin" /> Analysing…</>
              : <><Sparkles size={12} /> Re-analyse</>
            }
          </Button>
          <Button variant="outline" size="icon" onClick={prevWeek} disabled={weekNum <= 1} className="disabled:opacity-30">
            <ChevronLeft size={16} />
          </Button>
          <span className="font-bold min-w-[70px] text-center">Week {weekNum}</span>
          <Button variant="outline" size="icon" onClick={nextWeek}>
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{completedCount} of {allIds.length} sessions</span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-success">{pct}%</span>
            <button onClick={reset} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <RotateCcw size={12} /> Reset week
            </button>
          </div>
        </div>
        <Progress value={pct} className="h-2.5" indicatorClassName="bg-success" />
      </div>

      {/* AI Coach note */}
      {aiPlan && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <Sparkles size={15} className="text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary">AI Coach · Week {weekNum}</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{aiPlan.overallNote}</p>
              <p className="text-xs text-muted-foreground/50 mt-1.5">
                Updated {new Date(aiPlan.generatedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                {aiPlan.modifications.length > 0 && ` · ${aiPlan.modifications.length} session${aiPlan.modifications.length > 1 ? "s" : ""} adjusted`}
              </p>
            </div>
          </div>
        </Card>
      )}

      {pct === 100 && (
        <Card className="bg-success/10 border-success/30 p-4 text-center">
          <p className="font-bold text-success">🎉 Week {weekNum} complete!</p>
          <p className="text-sm text-success/80 mt-1">Brilliant work. Ready to move to week {weekNum + 1}?</p>
          <Button onClick={nextWeek} className="mt-3 bg-success text-success-foreground hover:opacity-90">
            Start Week {weekNum + 1} →
          </Button>
        </Card>
      )}

      {/* Sessions */}
      {WEEKLY_PLAN.map((day) => {
        const dayDone = day.sessions.every((s) => checklist.completed[s.id]);
        return (
          <div key={day.day}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{day.day}</span>
              {dayDone && <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full font-semibold">complete</span>}
            </div>
            <div className="space-y-2">
              {day.sessions.map((s) => {
                const done = !!checklist.completed[s.id];
                const mod = aiPlan?.modifications.find((m) => m.id === s.id);
                const isShowingOrig = showOriginal[s.id];
                const displayTitle = mod && !isShowingOrig ? mod.title : s.title;
                const displayDetail = mod && !isShowingOrig ? mod.detail : s.detail;

                return (
                  <div
                    key={s.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggle(s.id)}
                    onKeyDown={(e) => e.key === "Enter" && toggle(s.id)}
                    className={`w-full text-left flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                      done ? "bg-success/5 border-success/30" : "bg-card border-border hover:border-primary/30"
                    }`}
                  >
                    <div className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center text-xs font-bold text-white transition-colors ${
                      done ? "bg-success border-success" : "border-muted-foreground/40"
                    }`}>
                      {done && "✓"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {s.time !== "—" && (
                          <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-md">{s.time}</span>
                        )}
                        <span className={`text-sm font-semibold ${done ? "line-through text-muted-foreground" : ""}`}>
                          {s.emoji} {displayTitle}
                        </span>
                        {mod && (
                          <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary leading-none">
                            ✦ AI
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{displayDetail}</p>
                      {mod && (
                        <button
                          onClick={(e) => toggleOriginal(e, s.id)}
                          className="text-xs text-primary/50 hover:text-primary mt-1.5 underline-offset-2 hover:underline transition-colors"
                        >
                          {isShowingOrig
                            ? "Show AI version"
                            : `Show original · ${mod.reason.length > 55 ? mod.reason.slice(0, 55) + "…" : mod.reason}`
                          }
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Phase guide */}
      <Card className="p-5">
        <h3 className="font-semibold text-sm mb-3">Phase Guide</h3>
        <div className="space-y-2">
          {PHASES.map((p) => (
            <div key={p.id} className={`flex items-center gap-3 p-3 rounded-lg text-sm ${weekNum >= p.minWeek && weekNum <= p.maxWeek ? "border" : "opacity-50"}`} style={weekNum >= p.minWeek && weekNum <= p.maxWeek ? { borderColor: p.color + "40", background: p.color + "08" } : {}}>
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
              <span className="font-semibold" style={{ color: p.color }}>{p.name}</span>
              <span className="text-muted-foreground text-xs">{p.weeks}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
