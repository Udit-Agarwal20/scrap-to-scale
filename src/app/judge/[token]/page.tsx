"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Trophy, DollarSign, Star, CheckCircle, ChevronRight,
  Users, Globe, Package, Loader2, Lock, AlertCircle,
} from "lucide-react";

const RUBRIC = [
  { key: "bigIdea", label: "Big Idea / Creativity", max: 15, color: "var(--neon-cyan)" },
  { key: "productUsefulness", label: "Product Usefulness & Function", max: 15, color: "var(--neon-cyan)" },
  { key: "repurposeEfficiency", label: "Repurpose Efficiency & Sustainability", max: 10, color: "rgba(191,0,255,1)" },
  { key: "pitchPerformance", label: "Pitch / Storytelling / Confidence", max: 20, color: "rgba(255,107,0,1)" },
  { key: "staticWebsite", label: "Static Website", max: 10, color: "rgba(191,0,255,1)" },
  { key: "feasibility", label: "Feasibility & Marketability", max: 10, color: "var(--neon-green)" },
  { key: "teamSynergy", label: "Team Synergy", max: 10, color: "var(--neon-green)" },
  { key: "uniqueness", label: "Uniqueness / Wow Factor", max: 10, color: "rgba(255,238,0,1)" },
] as const;

type Team = {
  id: string; teamNumber: number; name: string; members: string[];
  scrapItemReceived: string; productIdea: string; productDescription?: string;
  websiteUrl?: string; status: string;
};

type JudgeInfo = {
  judgeId: string; name: string; title?: string;
  organization?: string; remainingBudget: number;
};

type Tab = "score" | "invest";
type ScoreMap = Record<string, number>;

function RubricSlider({
  dim, value, onChange, locked,
}: {
  dim: (typeof RUBRIC)[number]; value: number; onChange: (v: number) => void; locked: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground/90">{dim.label}</label>
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-bold" style={{ color: dim.color }}>{value}</span>
          <span className="text-xs text-muted-foreground">/ {dim.max}</span>
        </div>
      </div>
      <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-150"
          style={{ width: `${(value / dim.max) * 100}%`, background: dim.color, opacity: locked ? 0.5 : 1 }}
        />
      </div>
      <input
        type="range" min={0} max={dim.max} value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        disabled={locked}
        className="w-full opacity-0 absolute cursor-pointer"
        style={{ marginTop: "-20px", height: "20px" }}
      />
      {/* Clickable dot track */}
      <div className="flex gap-1 flex-wrap">
        {Array.from({ length: dim.max + 1 }, (_, i) => (
          <button
            key={i}
            disabled={locked}
            onClick={() => !locked && onChange(i)}
            className={`w-5 h-5 rounded text-[10px] font-mono transition-all duration-100 border
              ${i === value
                ? "text-[#0a0e1a] border-transparent font-bold"
                : "text-muted-foreground border-border/30 hover:border-border/60"
              }
              ${locked ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:scale-110"}
            `}
            style={i === value ? { background: dim.color } : {}}
          >
            {i}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function JudgePortalPage() {
  const { token } = useParams<{ token: string }>();
  const [judgeInfo, setJudgeInfo] = useState<JudgeInfo | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tab, setTab] = useState<Tab>("score");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [scores, setScores] = useState<ScoreMap>({});
  const [submittedTeams, setSubmittedTeams] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [investments, setInvestments] = useState<Record<string, number>>({});
  const [investFinalized, setInvestFinalized] = useState(false);
  const [myScores, setMyScores] = useState<Record<string, any>>({});
  const [peerScores, setPeerScores] = useState<Record<string, any[]>>({});

  // Auth via token
  useEffect(() => {
    fetch("/api/auth/judge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: token }),
    }).then((r) => r.json()).then((d) => {
      if (d.success) {
        setJudgeInfo(d.data);
      } else {
        setAuthError(d.error ?? "Invalid access token");
      }
      setAuthLoading(false);
    }).catch(() => {
      setAuthError("Network error");
      setAuthLoading(false);
    });
  }, [token]);

  // Fetch teams + existing scores
  const fetchData = useCallback(async () => {
    const [teamsRes, scoresRes, investRes] = await Promise.all([
      fetch("/api/judge/teams").then((r) => r.json()),
      fetch("/api/judge/score").then((r) => r.json()),
      fetch("/api/judge/invest").then((r) => r.json()),
    ]);

    const teamsData: Team[] = teamsRes.data ?? [];
    setTeams(teamsData);

    const submitted = new Set<string>();
    const myScoreMap: Record<string, any> = {};
    for (const sc of scoresRes.data ?? []) {
      myScoreMap[sc.teamId] = sc;
      if (sc.isSubmitted) submitted.add(sc.teamId);
    }
    setMyScores(myScoreMap);
    setSubmittedTeams(submitted);

    // Init investments
    const invMap: Record<string, number> = {};
    for (const inv of investRes.data?.investments ?? []) {
      invMap[inv.teamId] = inv.amount;
    }
    setInvestments(invMap);
    setInvestFinalized(investRes.data?.isFinalized ?? false);
    if (judgeInfo) {
      setJudgeInfo((j) => j ? { ...j, remainingBudget: investRes.data?.remainingBudget ?? j.remainingBudget } : j);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && judgeInfo) fetchData();
  }, [authLoading, judgeInfo, fetchData]);

  const loadTeamScore = async (teamId: string) => {
    const res = await fetch(`/api/judge/score?teamId=${teamId}`);
    const data = await res.json();
    if (data.success) {
      const s = data.data.myScore;
      if (s) {
        const vals: ScoreMap = {};
        for (const r of RUBRIC) vals[r.key] = s[r.key] ?? 0;
        setScores(vals);
        setNotes(s.notes ?? "");
      } else {
        const vals: ScoreMap = {};
        for (const r of RUBRIC) vals[r.key] = 0;
        setScores(vals);
        setNotes("");
      }
      if (data.data.allSubmitted && data.data.peerScores) {
        setPeerScores((p) => ({ ...p, [teamId]: data.data.peerScores }));
      }
    }
    setSelectedTeamId(teamId);
  };

  const handleSaveScore = async (submit: boolean) => {
    if (!selectedTeamId) return;
    setSaving(true);
    const res = await fetch("/api/judge/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamId: selectedTeamId, ...scores, notes, submit,
      }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success(submit ? "Score submitted & locked!" : "Draft saved");
      if (submit) setSubmittedTeams((s) => new Set([...s, selectedTeamId]));
      await fetchData();
    } else {
      toast.error(typeof data.error === "string" ? data.error : "Failed to save");
    }
    setSaving(false);
  };

  const handleSaveInvestments = async (finalize: boolean) => {
    setSaving(true);
    const allocations = Object.entries(investments).map(([teamId, amount]) => ({ teamId, amount }));
    const res = await fetch("/api/judge/invest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allocations, finalize }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success(finalize ? "Investment finalized!" : "Draft saved");
      if (finalize) setInvestFinalized(true);
      await fetchData();
    } else {
      toast.error(data.error);
    }
    setSaving(false);
  };

  const totalInvested = Object.values(investments).reduce((s, v) => s + (v || 0), 0);
  const maxBudget = (judgeInfo?.remainingBudget ?? 0) + totalInvested;
  const currentTotal = RUBRIC.reduce((s, r) => s + (scores[r.key] ?? 0), 0);
  const isLocked = selectedTeamId ? submittedTeams.has(selectedTeamId) : false;

  // ─── Auth states ───────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={36} className="animate-spin text-[var(--neon-cyan)]" />
      </div>
    );
  }

  if (authError || !judgeInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-card rounded-3xl p-8 text-center max-w-sm border border-red-500/20">
          <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
          <h2 className="font-display text-xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground text-sm">{authError ?? "Invalid access link"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-grid">
      {/* Header */}
      <header className="glass-card border-b border-border/40 px-4 md:px-8 py-4 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <p className="font-display font-bold text-foreground">{judgeInfo.name}</p>
            <p className="text-xs text-muted-foreground">
              {judgeInfo.title}{judgeInfo.title && judgeInfo.organization ? " · " : ""}{judgeInfo.organization}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-muted-foreground">Budget Remaining</p>
              <p className="font-mono font-bold text-[var(--neon-green)]">
                ₹{(judgeInfo.remainingBudget).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
              <CheckCircle size={12} className="text-[var(--neon-green)]" />
              {submittedTeams.size}/{teams.length} scored
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        {/* Tab switcher */}
        <div className="flex gap-1 glass-card rounded-2xl p-1 w-fit mb-8 border border-border/30">
          {([
            { key: "score", label: "Score Teams", icon: Star },
            { key: "invest", label: "Invest Budget", icon: DollarSign },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                ${tab === key
                  ? "bg-[rgba(0,245,255,0.12)] text-[var(--neon-cyan)] border border-[rgba(0,245,255,0.2)]"
                  : "text-muted-foreground hover:text-foreground"}`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ─── SCORE TAB ──────────────────────────────────────────────── */}
          {tab === "score" && (
            <motion.div key="score"
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Team list */}
              <div className="space-y-2">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">Teams</p>
                {teams.map((team) => {
                  const done = submittedTeams.has(team.id);
                  const active = selectedTeamId === team.id;
                  return (
                    <button key={team.id} onClick={() => loadTeamScore(team.id)}
                      className={`w-full text-left glass-card rounded-xl p-3.5 border transition-all duration-200
                        ${active ? "border-[rgba(0,245,255,0.35)] bg-[rgba(0,245,255,0.05)]" : "border-border/20 hover:border-border/40"}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground">T{team.teamNumber}</span>
                            <span className="text-sm font-semibold text-foreground">{team.name}</span>
                            {done && <CheckCircle size={12} className="text-[var(--neon-green)]" />}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{team.productIdea}</p>
                        </div>
                        <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Score form */}
              <div className="lg:col-span-2">
                {!selectedTeamId ? (
                  <div className="glass-card rounded-2xl p-12 text-center border border-border/20">
                    <Star size={36} className="mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-muted-foreground">Select a team to start scoring</p>
                  </div>
                ) : (() => {
                  const team = teams.find((t) => t.id === selectedTeamId)!;
                  return (
                    <div className="glass-card rounded-2xl border border-border/30 overflow-hidden">
                      {/* Team info */}
                      <div className="px-6 py-5 border-b border-border/30">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-muted-foreground">T{team.teamNumber}</span>
                              <h2 className="font-display text-xl font-bold text-foreground">{team.name}</h2>
                              {isLocked && <Lock size={13} className="text-[rgba(255,107,0,1)]" />}
                            </div>
                            <p className="text-sm text-muted-foreground">{team.productIdea}</p>
                            <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Package size={10} />{team.scrapItemReceived}</span>
                              <span className="flex items-center gap-1"><Users size={10} />{team.members.join(", ")}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-2xl font-bold" style={{ color: "var(--neon-cyan)" }}>{currentTotal}</span>
                            <span className="text-xs text-muted-foreground">/100</span>
                          </div>
                        </div>
                        {team.websiteUrl && (
                          <a href={team.websiteUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-[var(--neon-cyan)] mt-2 hover:underline">
                            <Globe size={10} /> View Website
                          </a>
                        )}
                      </div>

                      {isLocked && (
                        <div className="px-6 py-3 bg-[rgba(255,107,0,0.06)] border-b border-[rgba(255,107,0,0.15)]">
                          <p className="text-xs text-[rgba(255,107,0,0.9)] flex items-center gap-2">
                            <Lock size={11} />
                            Score submitted & locked. You cannot make changes.
                          </p>
                        </div>
                      )}

                      {/* Rubric */}
                      <div className="px-6 py-5 space-y-6">
                        {RUBRIC.map((dim) => (
                          <RubricSlider
                            key={dim.key}
                            dim={dim}
                            value={scores[dim.key] ?? 0}
                            onChange={(v) => setScores((s) => ({ ...s, [dim.key]: v }))}
                            locked={isLocked}
                          />
                        ))}

                        <div>
                          <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1.5 block">
                            Notes (optional)
                          </label>
                          <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            disabled={isLocked}
                            rows={3}
                            placeholder="Private notes for this team…"
                            className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-border/50
                              focus:outline-none focus:border-[rgba(0,245,255,0.4)] text-foreground transition-all resize-none
                              disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-muted-foreground/40"
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      {!isLocked && (
                        <div className="px-6 py-4 border-t border-border/30 flex gap-3">
                          <button onClick={() => handleSaveScore(false)} disabled={saving}
                            className="px-4 py-2.5 rounded-xl text-sm text-muted-foreground border border-border/50
                              hover:bg-white/5 transition-all disabled:opacity-50">
                            Save Draft
                          </button>
                          <button onClick={() => handleSaveScore(true)} disabled={saving}
                            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[#0a0e1a] transition-all disabled:opacity-50"
                            style={{
                              background: "linear-gradient(135deg, rgba(0,245,255,0.9) 0%, rgba(0,180,255,0.9) 100%)",
                              boxShadow: "0 0 20px rgba(0,245,255,0.25)",
                            }}>
                            {saving ? "Submitting…" : "Submit & Lock Score"}
                          </button>
                        </div>
                      )}

                      {/* Peer scores (revealed only after all judges submit) */}
                      {peerScores[selectedTeamId] && peerScores[selectedTeamId].length > 0 && (
                        <div className="px-6 py-4 border-t border-border/30">
                          <p className="text-xs font-mono text-[var(--neon-green)] uppercase tracking-widest mb-3">
                            Peer Scores (All judges submitted)
                          </p>
                          <div className="space-y-2">
                            {peerScores[selectedTeamId].map((ps: any) => (
                              <div key={ps.id} className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">{ps.judge.name}</span>
                                <span className="font-mono font-bold text-foreground">{ps.totalRubricScore}/100</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          )}

          {/* ─── INVEST TAB ─────────────────────────────────────────────── */}
          {tab === "invest" && (
            <motion.div key="invest"
              initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
              className="space-y-6 max-w-2xl"
            >
              <div className="glass-card rounded-2xl p-5 border border-[rgba(57,255,20,0.2)]">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-foreground">Total Budget</p>
                  <p className="font-mono font-bold text-[var(--neon-green)]">₹{maxBudget.toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-muted-foreground">Invested</p>
                  <p className="font-mono font-bold text-foreground">₹{totalInvested.toLocaleString()}</p>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (totalInvested / maxBudget) * 100)}%`,
                      background: totalInvested > maxBudget ? "rgba(239,68,68,1)" : "var(--neon-green)",
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  ₹{(maxBudget - totalInvested).toLocaleString()} remaining
                </p>
              </div>

              {investFinalized && (
                <div className="glass-card rounded-xl px-4 py-3 border border-[rgba(255,107,0,0.3)] flex items-center gap-2">
                  <Lock size={14} className="text-[rgba(255,107,0,1)]" />
                  <p className="text-xs text-[rgba(255,107,0,0.9)]">Investment finalized & locked.</p>
                </div>
              )}

              <div className="space-y-3">
                {teams.map((team) => {
                  const invested = investments[team.id] ?? 0;
                  return (
                    <div key={team.id} className="glass-card rounded-2xl p-5 border border-border/30">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <h3 className="font-display font-bold text-foreground">
                            T{team.teamNumber} · {team.name}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{team.productIdea}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-[var(--neon-green)]">
                            ₹{invested.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <input
                        type="range" min={0} max={maxBudget} step={1000}
                        value={invested}
                        disabled={investFinalized}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          const others = Object.entries(investments)
                            .filter(([tid]) => tid !== team.id)
                            .reduce((s, [, v]) => s + v, 0);
                          if (others + val <= maxBudget) {
                            setInvestments((inv) => ({ ...inv, [team.id]: val }));
                          }
                        }}
                        className="w-full accent-[var(--neon-green)] disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>₹0</span>
                        <span>₹{maxBudget.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {!investFinalized && (
                <div className="flex gap-3">
                  <button onClick={() => handleSaveInvestments(false)} disabled={saving}
                    className="px-4 py-2.5 rounded-xl text-sm text-muted-foreground border border-border/50
                      hover:bg-white/5 transition-all disabled:opacity-50">
                    Save Draft
                  </button>
                  <button
                    onClick={() => handleSaveInvestments(true)}
                    disabled={saving || totalInvested > maxBudget}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[#0a0e1a] transition-all disabled:opacity-50"
                    style={{
                      background: "linear-gradient(135deg, rgba(57,255,20,0.85) 0%, rgba(0,200,80,0.85) 100%)",
                      boxShadow: "0 0 20px rgba(57,255,20,0.2)",
                    }}>
                    {saving ? "Finalizing…" : "Finalize Investment"}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
