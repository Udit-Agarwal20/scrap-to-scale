"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Zap, Eye, EyeOff, Lock, Mail } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Welcome back, Admin.");
        router.push("/admin");
      } else {
        toast.error(data.error ?? "Login failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-grid">
      {/* Ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-10 blur-[120px] pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(0,245,255,0.6) 0%, transparent 70%)" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <div className="glass-card rounded-3xl p-8 border border-[rgba(0,245,255,0.1)]">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "rgba(0,245,255,0.12)", border: "1px solid rgba(0,245,255,0.3)" }}
            >
              <Zap size={32} className="text-[var(--neon-cyan)]" />
            </div>
            <h1 className="font-display text-2xl font-bold gradient-text-cyan-purple">
              Admin Access
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Scrap to Scale · Nex-Cell</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2 block">
                Email
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm bg-white/5 border border-border/50
                    focus:outline-none focus:border-[rgba(0,245,255,0.4)] focus:ring-1 focus:ring-[rgba(0,245,255,0.2)]
                    text-foreground placeholder:text-muted-foreground/50 transition-all"
                  placeholder="admin@nexcell.com"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2 block">
                Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-12 py-3 rounded-xl text-sm bg-white/5 border border-border/50
                    focus:outline-none focus:border-[rgba(0,245,255,0.4)] focus:ring-1 focus:ring-[rgba(0,245,255,0.2)]
                    text-foreground placeholder:text-muted-foreground/50 transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300 mt-2
                disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
              style={{
                background: loading
                  ? "rgba(0,245,255,0.1)"
                  : "linear-gradient(135deg, rgba(0,245,255,0.9) 0%, rgba(0,180,255,0.9) 100%)",
                color: loading ? "var(--neon-cyan)" : "#0a0e1a",
                boxShadow: loading ? "none" : "0 0 24px rgba(0,245,255,0.3)",
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" />
                  </svg>
                  Authenticating...
                </span>
              ) : (
                "Enter Admin Panel"
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
