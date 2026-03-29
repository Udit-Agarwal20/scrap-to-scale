"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Radio, ThumbsUp, ThumbsDown, Minus, CheckCircle, Clock, Zap, Users } from "lucide-react";

type ActiveState = {
  id: string; teamNumber: number; name: string; productIdea: string;
  productDescription?: string; members: string[]; scrapItemReceived: string;
  votingStatus: string; votingOpenedAt?: string;
  secondsRemaining: number; hasVoted: boolean; myVote?: string | null;
};

type VoteOption = "like" | "neutral" | "dislike";

const VOTE_CONFIG = [
  {
    key: "like" as VoteOption,
    icon: ThumbsUp,
    label: "Like it!",
    color: "var(--neon-green)",
    bg: "rgba(57,255,20,0.1)",
    border: "rgba(57,255,20,0.4)",
    glow: "rgba(57,255,20,0.2)",
  },
  {
    key: "neutral" as VoteOption,
    icon: Minus,
    label: "Neutral",
    color: "rgba(255,238,0,1)",
    bg: "rgba(255,238,0,0.1)",
    border: "rgba(255,238,0,0.4)",
    glow: "rgba(255,238,0,0.2)",
  },
  {
    key: "dislike" as VoteOption,
    icon: ThumbsDown,
    label: "Not Quite",
    color: "rgba(239,68,68,1)",
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.4)",
    glow: "rgba(239,68,68,0.2)",
  },
];

function CountdownRing({ seconds, total }: { seconds: number; total: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const pct = seconds / total;
  const offset = circ * (1 - pct);
  const hue = Math.round(pct * 120);
  const urgent = seconds <= 10;

  return (
    <div className={`relative inline-flex items-center justify-center ${urgent ? "animate-neon-pulse" : ""}`}>
      <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90 countdown-ring">
        <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
        <circle
          cx="64" cy="64" r={r} fill="none"
          stroke={`hsl(${hue},100%,${urgent ? 60 : 55}%)`}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s linear, stroke 1s ease" }}
        />
      </svg>
      <div className="absolute text-center">
        <span className={`font-mono text-3xl font-bold ${urgent ? "text-red-400" : "text-foreground"}`}>{seconds}</span>
        <p className="text-xs text-muted-foreground mt-0.5">sec left</p>
      </div>
    </div>
  );
}

export default function AudiencePage() {
  const [activeTeam, setActiveTeam] = useState<ActiveState | null>(null);
  const [isEventLive, setIsEventLive] = useState(false);
  const [votingDuration, setVotingDuration] = useState(60);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [myVote, setMyVote] = useState<VoteOption | null>(null);
  const [voting, setVoting] = useState(false);
  const [votingExpired, setVotingExpired] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = useCallback(async () => {
    const res = await fetch("/api/audience/status");
    const data = await res.json();
    if (!data.success) return;

    setIsEventLive(data.data.isEventLive);
    setVotingDuration(data.data.votingDurationSec ?? 60);

    const team = data.data.activeTeam;
    if (team) {
      setActiveTeam(team);
      setHasVoted(team.hasVoted);
      setMyVote(team.myVote ?? null);
      const secs = Math.floor(team.secondsRemaining);
      setSecondsLeft(secs);
      setVotingExpired(secs === 0 && team.votingStatus === "open");
    } else {
      setActiveTeam(null);
      setSecondsLeft(0);
      setVotingExpired(false);
    }
  }, []);

  // Poll every 3 seconds for real-time state
  useEffect(() => {
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchStatus]);

  // Local countdown
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (activeTeam?.votingStatus === "open" && secondsLeft > 0) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            clearInterval(timerRef.current!);
            setVotingExpired(true);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeTeam?.id, activeTeam?.votingStatus]);

  const castVote = async (vote: VoteOption) => {
    if (!activeTeam || hasVoted || votingExpired || voting) return;
    setVoting(true);
    const res = await fetch("/api/audience/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId: activeTeam.id, vote }),
    });
    const data = await res.json();
    if (data.success) {
      setHasVoted(true);
      setMyVote(vote);
      toast.success("Vote cast! 🎉");
    } else {
      toast.error(data.error ?? "Failed to cast vote");
    }
    setVoting(false);
  };

  // ─── STATES ───────────────────────────────────────────────────────────────

  if (!isEventLive) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-grid">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 rounded-full bg-[rgba(0,245,255,0.06)] border border-[rgba(0,245,255,0.12)]
            flex items-center justify-center mx-auto mb-6">
            <Zap size={36} className="text-muted-foreground/40" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-3">
            Event Not Started
          </h1>
          <p className="text-muted-foreground">
            Sit tight — audience voting opens when a team starts presenting.
          </p>
          <div className="flex items-center justify-center gap-2 mt-6 text-xs font-mono text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse" />
            Waiting for admin to open the event…
          </div>
        </motion.div>
      </div>
    );
  }

  if (!activeTeam) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-grid">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 rounded-full bg-[rgba(0,245,255,0.06)] border border-[rgba(0,245,255,0.12)]
            flex items-center justify-center mx-auto mb-6">
            <Radio size={36} className="text-muted-foreground/40" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-3">
            Between Teams
          </h1>
          <p className="text-muted-foreground">
            No team is currently presenting. Voting will open soon!
          </p>
          <div className="flex items-center justify-center gap-2 mt-6 text-xs font-mono text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--neon-green)] animate-pulse" />
            Live · Refreshing automatically
          </div>
        </motion.div>
      </div>
    );
  }

  const isOpen = activeTeam.votingStatus === "open" && !votingExpired;

  return (
    <div className="min-h-screen bg-grid px-4 py-8">
      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] opacity-15 blur-[100px]"
          style={{ background: "radial-gradient(ellipse, rgba(0,245,255,0.5) 0%, transparent 70%)" }} />
      </div>

      <div className="relative z-10 max-w-lg mx-auto">
        {/* Live badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 mb-6"
        >
          {isOpen ? (
            <>
              <span className="w-2 h-2 rounded-full bg-[var(--neon-green)] animate-pulse" />
              <span className="text-xs font-mono text-[var(--neon-green)] uppercase tracking-widest">Voting Open</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-muted-foreground" />
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                {votingExpired ? "Voting Closed" : "Voting Not Open"}
              </span>
            </>
          )}
        </motion.div>

        {/* Team card */}
        <motion.div
          key={activeTeam.id}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-3xl p-6 border border-[rgba(0,245,255,0.12)] mb-6"
          style={{ boxShadow: isOpen ? "0 0 60px rgba(0,245,255,0.06)" : "none" }}
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-xs font-mono text-muted-foreground mb-1">
                Team {activeTeam.teamNumber} · Now Presenting
              </p>
              <h2 className="font-display text-2xl font-bold text-foreground">{activeTeam.name}</h2>
              <p className="text-[var(--neon-cyan)] text-sm mt-1">{activeTeam.productIdea}</p>
            </div>
            {isOpen && <CountdownRing seconds={secondsLeft} total={votingDuration} />}
          </div>

          {activeTeam.productDescription && (
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">{activeTeam.productDescription}</p>
          )}

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users size={11} /> {activeTeam.members.join(", ")}
            </span>
            <span className="text-[rgba(255,107,0,0.8)]">
              Scrap: {activeTeam.scrapItemReceived}
            </span>
          </div>
        </motion.div>

        {/* Vote section */}
        <AnimatePresence mode="wait">
          {hasVoted ? (
            <motion.div
              key="voted"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="glass-card rounded-3xl p-8 text-center border border-[rgba(57,255,20,0.2)]"
            >
              <CheckCircle size={48} className="text-[var(--neon-green)] mx-auto mb-3" />
              <h3 className="font-display text-xl font-bold text-foreground mb-1">Vote Recorded!</h3>
              <p className="text-muted-foreground text-sm">
                You voted{" "}
                <span style={{ color: VOTE_CONFIG.find((v) => v.key === myVote)?.color ?? "inherit" }}
                  className="font-semibold capitalize"
                >
                  {myVote}
                </span>
                {" "}for {activeTeam.name}
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                Audience voting ends when the countdown reaches zero.
              </p>
            </motion.div>
          ) : votingExpired ? (
            <motion.div
              key="expired"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="glass-card rounded-3xl p-8 text-center border border-border/20"
            >
              <Clock size={48} className="text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="font-display text-xl font-bold text-foreground mb-1">Voting Closed</h3>
              <p className="text-muted-foreground text-sm">The 60-second window has ended.</p>
            </motion.div>
          ) : !isOpen ? (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="glass-card rounded-3xl p-8 text-center border border-border/20"
            >
              <Radio size={48} className="text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="font-display text-xl font-bold text-foreground mb-1">Not Open Yet</h3>
              <p className="text-muted-foreground text-sm">Voting will open soon. Stay ready!</p>
            </motion.div>
          ) : (
            <motion.div
              key="voting"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-3xl p-6 border border-[rgba(0,245,255,0.1)]"
            >
              <p className="text-center text-sm font-semibold text-foreground mb-5">
                What do you think of this pitch?
              </p>
              <div className="grid grid-cols-3 gap-3">
                {VOTE_CONFIG.map((v) => (
                  <motion.button
                    key={v.key}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => castVote(v.key)}
                    disabled={voting}
                    className="vote-btn flex flex-col items-center justify-center gap-2 py-5 rounded-2xl
                      border-2 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                    style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = v.border;
                      (e.currentTarget as HTMLButtonElement).style.background = v.bg;
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 24px ${v.glow}`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)";
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.03)";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = "";
                    }}
                  >
                    <v.icon size={28} style={{ color: v.color }} />
                    <span className="text-xs font-semibold" style={{ color: v.color }}>{v.label}</span>
                  </motion.button>
                ))}
              </div>
              <p className="text-center text-xs text-muted-foreground mt-4">
                One vote per team. Choose wisely!
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Event branding */}
        <p className="text-center text-xs text-muted-foreground font-mono mt-8">
          Scrap to Scale · <span className="text-[var(--neon-cyan)]">Nex-Cell</span>
        </p>
      </div>
    </div>
  );
}
