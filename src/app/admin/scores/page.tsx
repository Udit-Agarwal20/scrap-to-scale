"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, CheckCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";

type Score = {
  id: string; judgeId: string; teamId: string;
  bigIdea: number; productUsefulness: number; repurposeEfficiency: number;
  pitchPerformance: number; staticWebsite: number; feasibility: number;
  teamSynergy: number; uniqueness: number; totalRubricScore: number;
  isSubmitted: boolean; submittedAt?: string; notes?: string;
  judge: { id: string; name: string; title?: string };
  team: { id: string; name: string; teamNumber: number };
};

const RUBRIC = [
  { key: "bigIdea", label: "Big Idea", max: 15 },
  { key: "productUsefulness", label: "Usefulness", max: 15 },
  { key: "repurposeEfficiency", label: "Repurpose", max: 10 },
  { key: "pitchPerformance", label: "Pitch", max: 20 },
  { key: "staticWebsite", label: "Website", max: 10 },
  { key: "feasibility", label: "Feasibility", max: 10 },
  { key: "teamSynergy", label: "Synergy", max: 10 },
  { key: "uniqueness", label: "Uniqueness", max: 10 },
];

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center w-12">
      <div className="h-12 w-4 bg-white/10 rounded-full overflow-hidden flex items-end">
        <div
          className="w-full rounded-full transition-all duration-700"
          style={{ height: `${(value / max) * 100}%`, background: color }}
        />
      </div>
      <span className="text-xs font-mono text-muted-foreground">{value}/{max}</span>
    </div>
  );
}

export default function ScoresPage() {
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<"team" | "judge">("team");

  useEffect(() => {
    fetch("/api/admin/scores")
      .then((r) => r.json())
      .then((d) => { setScores(d.data ?? []); setLoading(false); });
  }, []);

  // Group scores
  const groups = scores.reduce<Record<string, Score[]>>((acc, s) => {
    const key = groupBy === "team" ? s.team.name : s.judge.name;
    acc[key] = [...(acc[key] ?? []), s];
    return acc;
  }, {});

  const colorForScore = (pct: number) => {
    if (pct >= 0.8) return "var(--neon-green)";
    if (pct >= 0.6) return "var(--neon-cyan)";
    if (pct >= 0.4) return "rgba(255,238,0,1)";
    return "rgba(239,68,68,1)";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Scores Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">{scores.length} submitted scores</p>
        </div>
        <div className="flex rounded-xl overflow-hidden border border-border/40 text-sm">
          {(["team", "judge"] as const).map((g) => (
            <button key={g} onClick={() => setGroupBy(g)}
              className={`px-4 py-2 font-medium transition-all capitalize ${
                groupBy === g ? "bg-[rgba(0,245,255,0.12)] text-[var(--neon-cyan)]" : "text-muted-foreground hover:bg-white/5"
              }`}>
              By {g}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-2xl shimmer" />)}</div>
      ) : Object.keys(groups).length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BarChart3 size={40} className="mx-auto mb-3 opacity-30" />
          <p>No scores submitted yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(groups).map(([groupKey, groupScores]) => {
            const avgTotal = groupScores.reduce((s, sc) => s + sc.totalRubricScore, 0) / groupScores.length;
            const isOpen = expanded === groupKey;

            return (
              <motion.div key={groupKey} layout className="glass-card rounded-2xl border border-border/30 overflow-hidden">
                {/* Group header */}
                <button
                  onClick={() => setExpanded(isOpen ? null : groupKey)}
                  className="w-full flex items-center justify-between gap-4 p-5 hover:bg-white/5 transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <h3 className="font-display font-bold text-foreground">{groupKey}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {groupScores.length} score{groupScores.length > 1 ? "s" : ""}
                        {" · "}
                        {groupScores.filter((s) => s.isSubmitted).length} submitted
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="font-mono font-bold text-xl" style={{ color: colorForScore(avgTotal / 100) }}>
                        {avgTotal.toFixed(1)}
                      </span>
                      <span className="text-xs text-muted-foreground">/100</span>
                    </div>
                    {isOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                  </div>
                </button>

                {/* Expanded scores */}
                {isOpen && (
                  <div className="border-t border-border/30 divide-y divide-border/20">
                    {groupScores.map((score) => (
                      <div key={score.id} className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <span className="text-sm font-semibold text-foreground">
                              {groupBy === "team" ? score.judge.name : `T${score.team.teamNumber} · ${score.team.name}`}
                            </span>
                            {groupBy === "team" && score.judge.title && (
                              <span className="text-xs text-muted-foreground ml-2">{score.judge.title}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {score.isSubmitted ? (
                              <span className="flex items-center gap-1 text-xs text-[var(--neon-green)] font-mono">
                                <CheckCircle size={11} /> Submitted
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                                <Clock size={11} /> Draft
                              </span>
                            )}
                            <span className="font-mono font-bold text-lg" style={{ color: colorForScore(score.totalRubricScore / 100) }}>
                              {score.totalRubricScore}
                            </span>
                          </div>
                        </div>

                        {/* Mini bars */}
                        <div className="flex gap-2 flex-wrap">
                          {RUBRIC.map((r) => (
                            <div key={r.key} className="flex flex-col items-center gap-1">
                              <MiniBar
                                value={(score as any)[r.key]}
                                max={r.max}
                                color={colorForScore((score as any)[r.key] / r.max)}
                              />
                              <span className="text-[9px] font-mono text-muted-foreground/60 w-12 text-center leading-tight">
                                {r.label}
                              </span>
                            </div>
                          ))}
                        </div>

                        {score.notes && (
                          <p className="mt-3 text-xs text-muted-foreground italic border-l-2 border-border/30 pl-3">
                            {score.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
