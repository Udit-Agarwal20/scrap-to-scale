"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, UserCheck, Radio, Vote, Activity, Trophy, TrendingUp, Clock } from "lucide-react";
import Link from "next/link";

type DashStats = {
  teams: any[];
  judges: any[];
  isEventLive: boolean;
  currentTeam: any | null;
};

function StatCard({
  label, value, icon: Icon, color, delay,
}: {
  label: string; value: string | number; icon: any; color: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card rounded-2xl p-5 border"
      style={{ borderColor: color.replace("1)", "0.15)") }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-2">{label}</p>
          <p className="text-3xl font-display font-bold" style={{ color }}>{value}</p>
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: color.replace("1)", "0.12)"), border: `1px solid ${color.replace("1)", "0.3)")}` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
      </div>
    </motion.div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/teams").then((r) => r.json()),
      fetch("/api/admin/judges").then((r) => r.json()),
      fetch("/api/admin/voting").then((r) => r.json()),
    ]).then(([teams, judges, voting]) => {
      setData({
        teams: teams.data ?? [],
        judges: judges.data ?? [],
        isEventLive: voting.data?.isEventLive ?? false,
        currentTeam: voting.data?.activeTeam ?? null,
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-2xl shimmer" />
        ))}
      </div>
    );
  }

  const teamsDone = data?.teams.filter((t) => t.status === "done").length ?? 0;
  const totalVotes = data?.teams.reduce(
    (acc: number, t: any) =>
      acc + (t.scoreAggregate?.audienceLikes ?? 0) +
      (t.scoreAggregate?.audienceNeutrals ?? 0) +
      (t.scoreAggregate?.audienceDislikes ?? 0),
    0
  ) ?? 0;
  const scoresSubmitted = data?.judges.reduce(
    (acc: number, j: any) => acc + (j.scores?.filter((s: any) => s.isSubmitted).length ?? 0),
    0
  ) ?? 0;

  const stats = [
    { label: "Total Teams", value: data?.teams.length ?? 0, icon: Users, color: "rgba(0,245,255,1)", delay: 0 },
    { label: "Teams Presented", value: teamsDone, icon: Trophy, color: "rgba(57,255,20,1)", delay: 0.05 },
    { label: "Active Judges", value: data?.judges.length ?? 0, icon: UserCheck, color: "rgba(191,0,255,1)", delay: 0.1 },
    { label: "Audience Votes", value: totalVotes, icon: Vote, color: "rgba(255,107,0,1)", delay: 0.15 },
    { label: "Scores Submitted", value: scoresSubmitted, icon: Activity, color: "rgba(255,238,0,1)", delay: 0.2 },
    {
      label: "Event Status",
      value: data?.isEventLive ? "LIVE" : "PAUSED",
      icon: Radio,
      color: data?.isEventLive ? "rgba(57,255,20,1)" : "rgba(100,116,139,1)",
      delay: 0.25,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="font-display text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Scrap to Scale · Nex-Cell · Mirai School of Technology
        </p>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Current presenting team */}
      {data?.currentTeam && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card rounded-2xl p-6 border border-[rgba(0,245,255,0.2)]"
          style={{ boxShadow: "0 0 40px rgba(0,245,255,0.06)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-[var(--neon-green)] animate-pulse" />
            <span className="text-xs font-mono text-[var(--neon-green)] uppercase tracking-widest">
              Currently Presenting
            </span>
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground">
            Team {data.currentTeam.teamNumber} — {data.currentTeam.name}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">{data.currentTeam.productIdea}</p>

          <div className="flex gap-3 mt-4">
            <Link
              href="/admin/voting"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                text-[var(--neon-cyan)] border border-[rgba(0,245,255,0.3)] hover:bg-[rgba(0,245,255,0.1)]
                transition-all duration-200"
            >
              <Radio size={14} />
              Manage Voting
            </Link>
          </div>
        </motion.div>
      )}

      {/* Quick links */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
      >
        {[
          { href: "/admin/teams", label: "Manage Teams", icon: Users },
          { href: "/admin/judges", label: "Manage Judges", icon: UserCheck },
          { href: "/admin/voting", label: "Voting Control", icon: Radio },
          { href: "/admin/leaderboard", label: "Live Leaderboard", icon: Trophy },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="glass-card rounded-xl p-4 border border-border/30 hover:border-[rgba(0,245,255,0.2)]
              flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground
              transition-all duration-200 hover:bg-white/5 group"
          >
            <link.icon size={16} className="group-hover:text-[var(--neon-cyan)] transition-colors" />
            {link.label}
          </Link>
        ))}
      </motion.div>
    </div>
  );
}
