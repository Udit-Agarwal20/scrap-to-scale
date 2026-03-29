"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Zap, Trophy, Users, Radio } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  }),
};

const portals = [
  {
    href: "/admin",
    label: "Admin Panel",
    sublabel: "Event Control",
    icon: Zap,
    color: "cyan",
    glow: "rgba(0,245,255,0.15)",
    border: "rgba(0,245,255,0.3)",
    desc: "Manage teams, judges, voting sessions & live scoreboard",
  },
  {
    href: "/judge",
    label: "Judge Portal",
    sublabel: "Score & Invest",
    icon: Trophy,
    color: "purple",
    glow: "rgba(191,0,255,0.15)",
    border: "rgba(191,0,255,0.3)",
    desc: "Rate teams on rubric and allocate your investment budget",
  },
  {
    href: "/audience",
    label: "Audience Vote",
    sublabel: "Live Voting",
    icon: Radio,
    color: "green",
    glow: "rgba(57,255,20,0.15)",
    border: "rgba(57,255,20,0.3)",
    desc: "Cast your like, neutral or dislike vote for live teams",
  },
  {
    href: "/member",
    label: "Member View",
    sublabel: "Organizer Monitoring",
    icon: Users,
    color: "orange",
    glow: "rgba(255,107,0,0.15)",
    border: "rgba(255,107,0,0.3)",
    desc: "Monitor event progress, scores and team performance",
  },
  {
    href: "/leaderboard",
    label: "Leaderboard",
    sublabel: "Live Rankings",
    icon: Trophy,
    color: "yellow",
    glow: "rgba(255,238,0,0.15)",
    border: "rgba(255,238,0,0.3)",
    desc: "Real-time public rankings and score breakdown",
  },
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen bg-grid overflow-hidden flex flex-col">
      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-20 blur-[120px]"
          style={{ background: "radial-gradient(circle, rgba(0,245,255,0.4) 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full opacity-15 blur-[100px]"
          style={{ background: "radial-gradient(circle, rgba(191,0,255,0.5) 0%, transparent 70%)" }}
        />
        <div
          className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full opacity-10 blur-[80px]"
          style={{ background: "radial-gradient(circle, rgba(57,255,20,0.4) 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative z-10 flex flex-col flex-1 px-6 py-12 max-w-7xl mx-auto w-full">
        {/* Header */}
        <motion.div
          className="text-center mb-16 mt-8"
          initial="hidden"
          animate="show"
        >
          <motion.div
            custom={0}
            variants={fadeUp}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono font-semibold mb-6 glass-card"
            style={{ color: "var(--neon-cyan)", borderColor: "rgba(0,245,255,0.2)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--neon-green)] animate-pulse" />
            LIVE EVENT · NEX-CELL × MIRAI SOT
          </motion.div>

          <motion.h1
            custom={1}
            variants={fadeUp}
            className="font-display text-6xl md:text-8xl font-bold leading-none tracking-tight mb-4"
          >
            <span className="gradient-text-cyan-purple">SCRAP</span>
            <br />
            <span className="text-foreground/90">TO</span>{" "}
            <span className="gradient-text-green-cyan">SCALE</span>
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadeUp}
            className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto font-body leading-relaxed"
          >
            Teams receive junk. They build the future.
            <br />
            Score them. Fund them. Crown them.
          </motion.p>
        </motion.div>

        {/* Portal grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12"
          initial="hidden"
          animate="show"
        >
          {portals.map((portal, i) => (
            <motion.div key={portal.href} custom={i + 3} variants={fadeUp}>
              <Link href={portal.href} className="block group">
                <div
                  className="glass-card rounded-2xl p-6 h-full transition-all duration-300 group-hover:scale-[1.02] group-hover:translate-y-[-2px]"
                  style={{
                    borderColor: "rgba(255,255,255,0.06)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = portal.border;
                    (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 32px ${portal.glow}, 0 8px 32px rgba(0,0,0,0.5)`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.06)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "";
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{ background: portal.glow, border: `1px solid ${portal.border}` }}
                    >
                      <portal.icon
                        size={20}
                        style={{ color: portal.border.replace("0.3)", "1)") }}
                      />
                    </div>
                    <ArrowRight
                      size={16}
                      className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all duration-200 mt-1"
                    />
                  </div>

                  <p className="text-xs font-mono text-muted-foreground mb-1 uppercase tracking-widest">
                    {portal.sublabel}
                  </p>
                  <h2 className="font-display text-xl font-bold text-foreground mb-2">
                    {portal.label}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {portal.desc}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 1, duration: 1 } }}
          className="text-center text-xs text-muted-foreground font-mono"
        >
          Organized by{" "}
          <span className="neon-text-cyan font-semibold">Nex-Cell</span>
          {" · "}
          <span className="text-foreground/60">Mirai School of Technology</span>
        </motion.div>
      </div>
    </main>
  );
}
