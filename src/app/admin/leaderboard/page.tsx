"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Trophy, RefreshCw, TrendingUp, Users, ThumbsUp, DollarSign } from "lucide-react";

type TeamEntry = {
  id: string; teamNumber: number; name: string; productIdea: string;
  members: string[]; finalScore: number; finalRank: number;
  scoreAggregate?: {
    avgRubricScore: string; rubricScoreNormalized: string;
    investmentScoreNormalized: string; audienceScoreNormalized: string;
    totalInvestment: number; audienceLikes: number; audienceNeutrals: number;
    audienceDislikes: number; judgeCount: number;
  };
};

function ScoreBar({ value, max = 33.33, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs font-mono text-muted-foreground w-10 text-right">{value.toFixed(1)}</span>
    </div>
  );
}

export default function AdminLeaderboardPage() {
  const [teams, setTeams] = useState<TeamEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    const res = await fetch("/api/admin/leaderboard");
    const data = await res.json();
    const sorted = (data.data ?? []).sort((a: TeamEntry, b: TeamEntry) => (a.finalRank ?? 999) - (b.finalRank ?? 999));
    setTeams(sorted);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetch("/api/admin/leaderboard", { method: "POST" });
    await fetchLeaderboard();
    toast.success("Rankings recomputed!");
    setRefreshing(false);
  };

  const rankColor = (r: number) => {
    if (r === 1) return "#FFD700";
    if (r === 2) return "#C0C0C0";
    if (r === 3) return "#CD7F32";
    return "rgba(148,163,184,0.8)";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Leaderboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Live rankings with score breakdown</p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
            bg-[rgba(57,255,20,0.1)] border border-[rgba(57,255,20,0.25)] text-[var(--neon-green)]
            hover:bg-[rgba(57,255,20,0.18)] transition-all disabled:opacity-50">
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Recompute
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs font-mono text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--neon-cyan)]" />Rubric /33</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[rgba(191,0,255,1)]" />Investment /33</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--neon-green)]" />Audience /33</span>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-32 rounded-2xl shimmer" />)}</div>
      ) : (
        <div className="space-y-3">
          {teams.map((team, idx) => {
            const agg = team.scoreAggregate;
            const rub = parseFloat(agg?.rubricScoreNormalized ?? "0");
            const inv = parseFloat(agg?.investmentScoreNormalized ?? "0");
            const aud = parseFloat(agg?.audienceScoreNormalized ?? "0");
            const total = parseFloat(String(team.finalScore ?? 0));

            return (
              <motion.div key={team.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="glass-card rounded-2xl p-5 border transition-all duration-200"
                style={{ borderColor: team.finalRank <= 3 ? rankColor(team.finalRank) + "40" : "rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-start gap-5">
                  {/* Rank */}
                  <div className="flex-shrink-0 w-12 text-center">
                    <span className="font-display text-2xl font-bold" style={{ color: rankColor(team.finalRank) }}>
                      {team.finalRank <= 3 ? ["🥇","🥈","🥉"][team.finalRank - 1] : `#${team.finalRank}`}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <h3 className="font-display font-bold text-foreground">
                          T{team.teamNumber} · {team.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{team.productIdea}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="font-mono text-xl font-bold" style={{ color: rankColor(team.finalRank) }}>
                          {total.toFixed(2)}
                        </span>
                        <p className="text-xs text-muted-foreground">/ 100</p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <ScoreBar value={rub} color="var(--neon-cyan)" />
                      <ScoreBar value={inv} color="rgba(191,0,255,1)" />
                      <ScoreBar value={aud} color="var(--neon-green)" />
                    </div>

                    <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users size={10} />{agg?.judgeCount ?? 0} judges
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign size={10} />₹{(agg?.totalInvestment ?? 0).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp size={10} />
                        {agg?.audienceLikes ?? 0}L · {agg?.audienceNeutrals ?? 0}N · {agg?.audienceDislikes ?? 0}D
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
