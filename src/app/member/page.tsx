"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Users, UserCheck, Activity, Trophy, Radio, CheckCircle,
  Clock, DollarSign, ThumbsUp, TrendingUp, RefreshCw,
} from "lucide-react";

type TeamEntry = {
  id: string; teamNumber: number; name: string; members: string[];
  scrapItemReceived: string; productIdea: string; status: string;
  votingStatus: string; finalScore?: string; finalRank?: number;
  scoreAggregate?: {
    avgRubricScore?: string; totalInvestment?: number;
    audienceLikes?: number; audienceNeutrals?: number; audienceDislikes?: number;
    judgeCount?: number; finalScore?: string;
  };
};

type JudgeEntry = {
  id: string; name: string; title?: string; organization?: string;
  remainingBudget: number; lastActiveAt?: string;
  scores?: { isSubmitted: boolean; teamId: string }[];
};

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <div className="glass-card rounded-2xl p-4 border border-border/20">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">{label}</p>
        <Icon size={14} style={{ color }} />
      </div>
      <p className="font-display text-2xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

export default function MemberPage() {
  const [teams, setTeams] = useState<TeamEntry[]>([]);
  const [judges, setJudges] = useState<JudgeEntry[]>([]);
  const [voting, setVoting] = useState<{ isEventLive: boolean; activeTeam: any | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchAll = useCallback(async () => {
    const [t, j, v] = await Promise.all([
      fetch("/api/admin/teams").then((r) => r.json()),
      fetch("/api/admin/judges").then((r) => r.json()),
      fetch("/api/admin/voting").then((r) => r.json()),
    ]);
    setTeams(t.data ?? []);
    setJudges(j.data ?? []);
    setVoting({ isEventLive: v.data?.isEventLive ?? false, activeTeam: v.data?.activeTeam ?? null });
    setLoading(false);
    setLastRefresh(new Date());
  }, []);

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 10000);
    return () => clearInterval(iv);
  }, [fetchAll]);

  const totalVotes = teams.reduce((acc, t) =>
    acc + (t.scoreAggregate?.audienceLikes ?? 0) +
    (t.scoreAggregate?.audienceNeutrals ?? 0) +
    (t.scoreAggregate?.audienceDislikes ?? 0), 0
  );
  const submittedScores = judges.reduce((acc, j) =>
    acc + (j.scores?.filter((s) => s.isSubmitted).length ?? 0), 0
  );
  const teamsDone = teams.filter((t) => t.status === "done").length;

  if (loading) {
    return (
      <div className="min-h-screen bg-grid px-4 py-10">
        <div className="max-w-6xl mx-auto space-y-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-20 rounded-2xl shimmer" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-grid px-4 py-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold gradient-text-cyan-purple">Organizer View</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Scrap to Scale · Live Monitoring Dashboard
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">
              {lastRefresh.toLocaleTimeString()}
            </span>
            <button onClick={fetchAll}
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-border/30
                text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
              <RefreshCw size={12} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Teams" value={teams.length} icon={Users} color="var(--neon-cyan)" />
          <StatCard label="Presented" value={teamsDone} icon={CheckCircle} color="var(--neon-green)" />
          <StatCard label="Judges" value={judges.length} icon={UserCheck} color="rgba(191,0,255,1)" />
          <StatCard label="Scores" value={submittedScores} icon={Activity} color="rgba(255,238,0,1)" />
          <StatCard label="Votes" value={totalVotes} icon={ThumbsUp} color="rgba(255,107,0,1)" />
          <StatCard
            label="Status"
            value={voting?.isEventLive ? "LIVE" : "IDLE"}
            icon={Radio}
            color={voting?.isEventLive ? "var(--neon-green)" : "rgba(100,116,139,1)"}
          />
        </div>

        {/* Active team banner */}
        {voting?.activeTeam && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-2xl p-5 border-2 border-[rgba(57,255,20,0.3)]"
            style={{ boxShadow: "0 0 40px rgba(57,255,20,0.05)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-[var(--neon-green)] animate-pulse" />
              <span className="text-xs font-mono text-[var(--neon-green)] uppercase tracking-widest">Currently Presenting</span>
            </div>
            <h2 className="font-display text-xl font-bold">
              Team {voting.activeTeam.teamNumber} — {voting.activeTeam.name}
            </h2>
            <p className="text-muted-foreground text-sm">{voting.activeTeam.productIdea}</p>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Teams table */}
          <div>
            <h2 className="font-display font-bold text-lg mb-3">Teams Progress</h2>
            <div className="space-y-2">
              {teams
                .sort((a, b) => (a.presentationOrder ?? 99) - (b.presentationOrder ?? 99))
                .map((team) => {
                  const votes = (team.scoreAggregate?.audienceLikes ?? 0) +
                    (team.scoreAggregate?.audienceNeutrals ?? 0) +
                    (team.scoreAggregate?.audienceDislikes ?? 0);

                  return (
                    <div key={team.id}
                      className="glass-card rounded-xl px-4 py-3 border border-border/20 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-muted-foreground w-5">T{team.teamNumber}</span>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{team.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{team.productIdea}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs flex-shrink-0">
                        {team.status === "done" && <CheckCircle size={12} className="text-[var(--neon-green)]" />}
                        {team.votingStatus === "open" && (
                          <span className="badge-presenting px-2 py-0.5 rounded-full font-mono text-[10px]">LIVE</span>
                        )}
                        <span className="font-mono text-muted-foreground">{votes}v</span>
                        {team.finalScore && (
                          <span className="font-mono font-bold text-[var(--neon-cyan)]">
                            {parseFloat(String(team.finalScore)).toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Judges table */}
          <div>
            <h2 className="font-display font-bold text-lg mb-3">Judges Activity</h2>
            <div className="space-y-2">
              {judges.map((judge) => {
                const submitted = judge.scores?.filter((s) => s.isSubmitted).length ?? 0;
                const total = teams.length;
                const pct = total > 0 ? (submitted / total) * 100 : 0;

                return (
                  <div key={judge.id}
                    className="glass-card rounded-xl px-4 py-3 border border-border/20">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{judge.name}</p>
                        {judge.title && <p className="text-xs text-muted-foreground">{judge.title}</p>}
                      </div>
                      <div className="text-right text-xs">
                        <p className="font-mono text-[var(--neon-green)]">₹{judge.remainingBudget.toLocaleString()}</p>
                        <p className="text-muted-foreground">{submitted}/{total} scored</p>
                      </div>
                    </div>
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: "var(--neon-cyan)" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mini leaderboard */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={16} className="text-[#FFD700]" />
            <h2 className="font-display font-bold text-lg">Current Rankings</h2>
          </div>
          <div className="space-y-2">
            {teams
              .filter((t) => t.finalRank)
              .sort((a, b) => (a.finalRank ?? 99) - (b.finalRank ?? 99))
              .map((team) => (
                <div key={team.id}
                  className="glass-card rounded-xl px-4 py-3 border border-border/20 flex items-center gap-4">
                  <span className="font-display font-bold text-lg w-8 text-center" style={{
                    color: team.finalRank === 1 ? "#FFD700" : team.finalRank === 2 ? "#C0C0C0" : team.finalRank === 3 ? "#CD7F32" : "rgba(148,163,184,0.8)"
                  }}>
                    {team.finalRank && team.finalRank <= 3 ? ["🥇", "🥈", "🥉"][team.finalRank - 1] : `#${team.finalRank}`}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{team.name}</p>
                    <p className="text-xs text-muted-foreground">{team.productIdea}</p>
                  </div>
                  <span className="font-mono font-bold text-[var(--neon-cyan)]">
                    {parseFloat(String(team.finalScore ?? 0)).toFixed(2)}
                  </span>
                </div>
              ))}
            {teams.filter((t) => t.finalRank).length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-8">Rankings will appear after teams are scored.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
