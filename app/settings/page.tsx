"use client";
import { useEffect, useState } from "react";
import { KeyRound, Check, X, ExternalLink, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STORAGE_KEY = "rta-openai-key";

export default function SettingsPage() {
  const [input, setInput] = useState("");
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setInput(stored);
      setSaved(true);
    }
  }, []);

  const handleSave = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    localStorage.setItem(STORAGE_KEY, trimmed);
    setSaved(true);
  };

  const handleClear = () => {
    localStorage.removeItem(STORAGE_KEY);
    setInput("");
    setSaved(false);
  };

  const handleChange = (val: string) => {
    setInput(val);
    if (saved) setSaved(false);
  };

  if (!mounted) return null;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure your AI coach connection.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound size={16} /> OpenAI API Key
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Used by the AI coach to analyse your WHOOP &amp; Strava data and fine-tune your weekly sessions.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Status chip */}
          <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
            saved
              ? "bg-success/10 text-success"
              : "bg-warning/10 text-warning"
          }`}>
            {saved ? <><Check size={11} /> Key saved</> : <><X size={11} /> No key set — AI features disabled</>}
          </div>

          {/* Key input */}
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={input}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="sk-proj-..."
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 pr-10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder:text-muted-foreground/40"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={!input.trim() || saved} className="text-sm">
              Save key
            </Button>
            {saved && (
              <Button variant="ghost" onClick={handleClear} className="text-sm text-destructive hover:bg-destructive/10 hover:text-destructive">
                Clear
              </Button>
            )}
          </div>

          {/* Security note */}
          <div className="bg-secondary rounded-lg p-3 text-xs text-muted-foreground leading-relaxed space-y-1">
            <p>🔒 Your key is stored <strong>only in this browser</strong> (localStorage). It is never saved to any server or included in data backups.</p>
            <p>It is sent directly to the <code className="text-xs">/api/analyse</code> endpoint on each AI request, which forwards it to OpenAI.</p>
          </div>

          {/* Link to OpenAI */}
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
          >
            Get your API key from OpenAI <ExternalLink size={11} />
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
