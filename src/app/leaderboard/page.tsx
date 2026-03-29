"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, RefreshCw, TrendingUp, Users, DollarSign, ThumbsUp, BarChart3 } from "lucide-react";

type Entry = {
  rank: number; teamId: string; teamNumber: number; name: string;
  productIdea: string; members: string[]; finalScore: number;
  rubricComponent: number; investmentComponent: number; audienceComponent: number;
  totalInvestment: number; audienceLikes: number; audienceNeutrals: number;
  audienceDislikes: number; judgeCount: number; status: string;
};

const MEDAL = ["🥇", "🥈", "🥉"];
const RANK_COLORS = [
  { text: "#FFD700", glow: "rgba(255,215,0,0.3)", border: "rgba(255,215,0,0.2)" },
  { text: "#C0C0C0", glow: "rgba(192,192,192,0.2)", border: "rgba(192,192,192,0.15)" },
  { text: "#CD7F32", glow: "rgba(205,127,50,0.2)", border: "rgba(205,127,50,0.15)" },
];

function ScoreBar({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono" style={{ color }}>{value.toFixed(1)}</span>
      </div>
      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, (value / 33.33) * 100)}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [eventName, setEventName] = useState("Scrap to Scale");
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    const res = await fetch("/api/leaderboard");
    const data = await res.json();
    if (data.success) {
      setEntries(data.data.leaderboard ?? []);
      setEventName(data.data.eventName ?? "Scrap to Scale");
      setIsLive(data.data.isEventLive ?? false);
      setLastUpdated(data.data.lastUpdated);
    } else {
      setError(data.error ?? "Leaderboard not available");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 15000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  return (
    <div className="min-h-screen bg-grid px-4 py-10">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] opacity-10 blur-[120px]"
          style={{ background: "radial-gradient(circle, rgba(255,215,0,0.5) 0%, transparent 70%)" }} />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground mb-3">
            {isLive ? (
              <><span className="w-1.5 h-1.5 rounded-full bg-[var(--neon-green)] animate-pulse" />LIVE · Updates every 15s</>
            ) : (
              <><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />Final Results</>
            )}
          </div>
          <div className="flex items-center justify-center gap-3 mb-2">
            <Trophy size={32} className="text-[#FFD700]" style={{ filter: "drop-shadow(0 0 12px rgba(255,215,0,0.6))" }} />
            <h1 className="font-display text-4xl md:text-5xl font-bold gradient-text-cyan-purple">
              Leaderboard
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">{eventName} · Nex-Cell · Mirai SoT</p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground/60 mt-2 font-mono">
              Last updated {new Date(lastUpdated).toLocaleTimeString()}
            </p>
          )}
        </motion.div>

        {loading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-24 rounded-2xl shimmer" />)}</div>
        ) : error ? (
          <div className="text-center py-16">
            <BarChart3 size={40} className="mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground">{error}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry, idx) => {
              const rankStyle = RANK_COLORS[entry.rank - 1] ?? { text: "rgba(148,163,184,0.8)", glow: "transparent", border: "rgba(255,255,255,0.06)" };
              const isExpanded = expanded === entry.teamId;
              const totalVotes = entry.audienceLikes + entry.audienceNeutrals + entry.audienceDislikes;

              return (
                <motion.div
                  key={entry.teamId}
                  layout
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="glass-card rounded-2xl border overflow-hidden cursor-pointer"
                  style={{
                    borderColor: rankStyle.border,
                    boxShadow: entry.rank <= 3 ? `0 0 40px ${rankStyle.glow}` : "none",
                  }}
                  onClick={() => setExpanded(isExpanded ? null : entry.teamId)}
                >
                  {/* Main row */}
                  <div className="flex items-center gap-5 p-5">
                    {/* Rank */}
                    <div className="flex-shrink-0 w-12 text-center">
                      {entry.rank <= 3 ? (
                        <span className="text-2xl">{MEDAL[entry.rank - 1]}</span>
                      ) : (
                        <span className="font-mono text-xl font-bold" style={{ color: rankStyle.text }}>
                          #{entry.rank}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <h3 className="font-display font-bold text-foreground text-lg leading-tight">
                          {entry.name}
                        </h3>
                        <span className="text-xs font-mono text-muted-foreground">T{entry.teamNumber}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">{entry.productIdea}</p>
                    </div>

                    {/* Score */}
                    <div className="text-right flex-shrink-0">
                      <span className="font-mono text-2xl font-bold" style={{ color: rankStyle.text }}>
                        {entry.finalScore.toFixed(2)}
                      </span>
                      <p className="text-xs text-muted-foreground">/ 100</p>
                    </div>
                  </div>

                  {/* Expanded breakdown */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="border-t border-border/30 overflow-hidden"
                      >
                        <div className="px-5 py-4 space-y-4">
                          {/* Score bars */}
                          <div className="space-y-2.5">
                            <ScoreBar value={entry.rubricComponent} color="var(--neon-cyan)" label="Judge Rubric" />
                            <ScoreBar value={entry.investmentComponent} color="rgba(191,0,255,1)" label="Judge Investment" />
                            <ScoreBar value={entry.audienceComponent} color="var(--neon-green)" label="Audience Votes" />
                          </div>

                          {/* Stats */}
                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2 border-t border-border/20">
                            <span className="flex items-center gap-1.5">
                              <Users size={11} />
                              {entry.members.join(", ")}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <DollarSign size={11} />
                              ₹{entry.totalInvestment.toLocaleString()} raised
                            </span>
                            <span className="flex items-center gap-1.5">
                              <ThumbsUp size={11} />
                              {entry.audienceLikes}L · {entry.audienceNeutrals}N · {entry.audienceDislikes}D
                              {totalVotes > 0 && ` (${totalVotes} total)`}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}

            {entries.length === 0 && (
              <div className="text-center py-16">
                <Trophy size={40} className="mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground">Rankings will appear as teams present.</p>
              </div>
            )}
          </div>
        )}

        <p className="text-center text-xs font-mono text-muted-foreground mt-8">
          Final Score = Rubric /3 + Investment /3 + Audience /3
        </p>
      </div>
    </div>
  );
}
