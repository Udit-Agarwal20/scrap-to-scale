"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Trophy, ArrowRight } from "lucide-react";

export default function JudgeEntryPage() {
  const router = useRouter();
  const [token, setToken] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = token.trim();
    if (clean) router.push(`/judge/${clean}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-grid">
      <div
        className="absolute inset-0 opacity-10 blur-[120px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(191,0,255,0.6) 0%, transparent 60%)" }}
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass-card rounded-3xl p-8 w-full max-w-md border border-[rgba(191,0,255,0.15)]"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(191,0,255,0.12)", border: "1px solid rgba(191,0,255,0.3)" }}>
            <Trophy size={28} style={{ color: "rgba(191,0,255,1)" }} />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Judge Portal</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Enter your unique access token or use your direct link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2 block">
              Access Token
            </label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your judge access token…"
              className="w-full px-4 py-3 rounded-xl text-sm bg-white/5 border border-border/50
                focus:outline-none focus:border-[rgba(191,0,255,0.4)] text-foreground
                placeholder:text-muted-foreground/40 transition-all font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={!token.trim()}
            className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2
              text-white transition-all disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, rgba(191,0,255,0.8) 0%, rgba(100,0,200,0.8) 100%)",
              boxShadow: "0 0 20px rgba(191,0,255,0.2)",
            }}>
            Enter Judge Panel <ArrowRight size={14} />
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Use the direct link sent by the organizer for instant access.
        </p>
      </motion.div>
    </div>
  );
}
