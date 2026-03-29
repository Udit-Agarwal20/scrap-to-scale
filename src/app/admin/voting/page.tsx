"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Radio, Play, Square, Clock, Users, CheckCircle, Circle } from "lucide-react";

type Team = {
  id: string;
  teamNumber: number;
  name: string;
  productIdea: string;
  members: string[];
  status: string;
  votingStatus: string;
  votingOpenedAt?: string;
  scoreAggregate?: {
    audienceLikes: number;
    audienceNeutrals: number;
    audienceDislikes: number;
  };
};

function CountdownCircle({ seconds, total }: { seconds: number; total: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const progress = seconds / total;
  const offset = circ * (1 - progress);
  const hue = Math.round(progress * 120);

  return (
    <div className="relative flex items-center justify-center w-28 h-28">
      <svg className="absolute inset-0 w-full h-full -rotate-90 countdown-ring" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle
          cx="48" cy="48" r={r} fill="none"
          stroke={`hsl(${hue}, 100%, 55%)`}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s linear, stroke 1s ease" }}
        />
      </svg>
      <div className="text-center">
        <span className="font-mono text-2xl font-bold text-foreground">{seconds}</span>
        <p className="text-xs text-muted-foreground mt-0.5">sec</p>
      </div>
    </div>
  );
}

export default function VotingControlPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [settings, setSettings] = useState<{ votingDurationSec: number; isEventLive: boolean } | null>(null);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [operating, setOperating] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    const [teamsRes, votingRes] = await Promise.all([
      fetch("/api/admin/teams").then((r) => r.json()),
      fetch("/api/admin/voting").then((r) => r.json()),
    ]);
    setTeams(teamsRes.data ?? []);
    setSettings({
      votingDurationSec: votingRes.data?.votingDurationSec ?? 60,
      isEventLive: votingRes.data?.isEventLive ?? false,
    });
    const active = votingRes.data?.activeTeam;
    if (active && active.votingStatus === "open") {
      setActiveTeam(active);
      const elapsed = active.votingOpenedAt
        ? Math.floor((Date.now() - new Date(active.votingOpenedAt).getTime()) / 1000)
        : 0;
      const remaining = Math.max(0, (votingRes.data?.votingDurationSec ?? 60) - elapsed);
      setSecondsLeft(remaining);
    } else {
      setActiveTeam(null);
      setSecondsLeft(0);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-countdown
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (activeTeam && secondsLeft > 0) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            clearInterval(timerRef.current!);
            handleAutoClose(activeTeam.id);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeTeam?.id]);

  const handleAutoClose = async (teamId: string) => {
    await fetch(`/api/admin/voting?teamId=${teamId}`, { method: "DELETE" });
    toast.success("Voting window closed automatically");
    fetchData();
  };

  const openVoting = async (teamId: string) => {
    setOperating(true);
    try {
      const res = await fetch("/api/admin/voting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Audience voting opened!");
        await fetchData();
      } else {
        toast.error(data.error);
      }
    } finally {
      setOperating(false);
    }
  };

  const closeVoting = async () => {
    if (!activeTeam) return;
    setOperating(true);
    try {
      const res = await fetch(`/api/admin/voting?teamId=${activeTeam.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Voting closed. Scores computed.");
        await fetchData();
      } else {
        toast.error(data.error);
      }
    } finally {
      setOperating(false);
    }
  };

  const sortedTeams = [...teams].sort(
    (a, b) => (a.presentationOrder ?? 99) - (b.presentationOrder ?? 99)
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => <div key={i} className="h-20 rounded-2xl shimmer" />)}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Voting Control</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Open audience voting for one team at a time · {settings?.votingDurationSec}s window
        </p>
      </div>

      {/* Active voting panel */}
      <AnimatePresence>
        {activeTeam && (
          <motion.div
            key={activeTeam.id}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="glass-card rounded-3xl p-6 border-2 border-[rgba(57,255,20,0.3)]"
            style={{ boxShadow: "0 0 60px rgba(57,255,20,0.06)" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-[var(--neon-green)] animate-pulse" />
              <span className="text-xs font-mono text-[var(--neon-green)] uppercase tracking-widest font-semibold">
                Voting Live
              </span>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">
                  Team {activeTeam.teamNumber} — {activeTeam.name}
                </h2>
                <p className="text-muted-foreground text-sm mt-1">{activeTeam.productIdea}</p>
                <div className="flex items-center gap-3 mt-3 text-sm">
                  <span className="text-[var(--neon-green)]">
                    👍 {activeTeam.scoreAggregate?.audienceLikes ?? 0}
                  </span>
                  <span className="text-[var(--neon-yellow)] text-[rgba(255,238,0,1)]">
                    😐 {activeTeam.scoreAggregate?.audienceNeutrals ?? 0}
                  </span>
                  <span className="text-red-400">
                    👎 {activeTeam.scoreAggregate?.audienceDislikes ?? 0}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-center gap-3">
                <CountdownCircle seconds={secondsLeft} total={settings?.votingDurationSec ?? 60} />
                <button
                  onClick={closeVoting}
                  disabled={operating}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold
                    bg-red-500/15 border border-red-500/30 text-red-400
                    hover:bg-red-500/25 transition-all duration-200 disabled:opacity-50"
                >
                  <Square size={14} />
                  Stop Voting
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Teams list */}
      <div className="space-y-3">
        <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-widest px-1">
          Teams · Presentation Order
        </h2>
        {sortedTeams.map((team) => {
          const isDone = team.votingStatus === "closed" || team.status === "done";
          const isActive = team.id === activeTeam?.id;
          const canOpen = !isActive && !activeTeam;

          return (
            <motion.div
              key={team.id}
              layout
              className={`glass-card rounded-2xl p-4 border transition-all duration-300
                ${isActive ? "border-[rgba(57,255,20,0.3)]" : isDone ? "border-[rgba(57,255,20,0.15)]" : "border-border/30"}`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-mono font-bold flex-shrink-0
                      ${isActive ? "bg-[rgba(57,255,20,0.15)] text-[var(--neon-green)]" : isDone ? "bg-[rgba(57,255,20,0.08)] text-[var(--neon-green)]" : "bg-white/5 text-muted-foreground"}`}
                  >
                    {team.teamNumber}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{team.name}</span>
                      {isDone && <CheckCircle size={13} className="text-[var(--neon-green)]" />}
                      {isActive && <span className="badge-presenting text-xs px-2 py-0.5 rounded-full font-mono">LIVE</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{team.productIdea}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isDone && (
                    <div className="text-xs font-mono text-muted-foreground text-right hidden sm:block">
                      <span className="text-[var(--neon-green)]">👍{team.scoreAggregate?.audienceLikes ?? 0}</span>
                      {" "}
                      <span className="text-[rgba(255,238,0,0.8)]">😐{team.scoreAggregate?.audienceNeutrals ?? 0}</span>
                      {" "}
                      <span className="text-red-400">👎{team.scoreAggregate?.audienceDislikes ?? 0}</span>
                    </div>
                  )}
                  {canOpen && (
                    <button
                      onClick={() => openVoting(team.id)}
                      disabled={operating}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold
                        bg-[rgba(0,245,255,0.08)] border border-[rgba(0,245,255,0.25)] text-[var(--neon-cyan)]
                        hover:bg-[rgba(0,245,255,0.15)] transition-all duration-200 disabled:opacity-50 whitespace-nowrap"
                    >
                      <Play size={12} />
                      Open Vote
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
