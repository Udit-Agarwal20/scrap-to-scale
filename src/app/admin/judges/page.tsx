"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Plus, Copy, Trash2, X, ExternalLink, CheckCircle, Clock, DollarSign } from "lucide-react";

type Judge = {
  id: string; name: string; title?: string; organization?: string;
  accessToken: string; remainingBudget: number; lastActiveAt?: string;
  scores?: { isSubmitted: boolean }[];
};

export default function JudgesPage() {
  const [judges, setJudges] = useState<Judge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", title: "", organization: "", budget: "100000" });
  const [saving, setSaving] = useState(false);
  const [newToken, setNewToken] = useState<{ token: string; link: string } | null>(null);

  const fetchJudges = async () => {
    const res = await fetch("/api/admin/judges");
    const data = await res.json();
    setJudges(data.data ?? []);
    setLoading(false);
  };
  useEffect(() => { fetchJudges(); }, []);

  const handleCreate = async () => {
    setSaving(true);
    const res = await fetch("/api/admin/judges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, budget: parseInt(form.budget) }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success("Judge created!");
      setShowForm(false);
      setNewToken({ token: data.data.accessToken, link: data.data.accessLink });
      fetchJudges();
    } else {
      toast.error(typeof data.error === "string" ? data.error : "Validation error");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove judge "${name}"?`)) return;
    const res = await fetch(`/api/admin/judges?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) { toast.success("Judge removed"); fetchJudges(); }
    else toast.error(data.error);
  };

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/judge/${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Access link copied!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Judges</h1>
          <p className="text-muted-foreground text-sm mt-1">{judges.length} judges registered</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
            bg-[rgba(191,0,255,0.1)] border border-[rgba(191,0,255,0.25)] text-[rgba(191,0,255,1)]
            hover:bg-[rgba(191,0,255,0.18)] transition-all duration-200">
          <Plus size={15} /> Add Judge
        </button>
      </div>

      {/* New token reveal */}
      <AnimatePresence>
        {newToken && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="glass-card rounded-2xl p-5 border border-[rgba(57,255,20,0.3)]"
          >
            <p className="text-xs font-mono text-[var(--neon-green)] uppercase tracking-widest mb-2">🔑 New Judge Access Link</p>
            <p className="text-muted-foreground text-xs mb-3">Share this link with the judge. It will only be shown once — save it now.</p>
            <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 border border-border/30">
              <code className="text-sm text-[var(--neon-cyan)] font-mono flex-1 truncate">{newToken.link}</code>
              <button onClick={() => { navigator.clipboard.writeText(newToken.link); toast.success("Copied!"); }}
                className="text-muted-foreground hover:text-foreground transition-colors">
                <Copy size={14} />
              </button>
            </div>
            <button onClick={() => setNewToken(null)} className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors">
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Judges list */}
      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-2xl shimmer" />)}</div>
      ) : (
        <div className="space-y-3">
          {judges.map((judge) => {
            const submitted = judge.scores?.filter((s) => s.isSubmitted).length ?? 0;
            const lastActive = judge.lastActiveAt
              ? new Date(judge.lastActiveAt).toLocaleTimeString()
              : "Never";

            return (
              <motion.div key={judge.id} layout
                className="glass-card rounded-2xl p-5 border border-border/30 hover:border-[rgba(191,0,255,0.2)] transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display font-bold text-foreground">{judge.name}</h3>
                      {submitted > 0 && <CheckCircle size={13} className="text-[var(--neon-green)]" />}
                    </div>
                    {(judge.title || judge.organization) && (
                      <p className="text-xs text-muted-foreground mb-2">
                        {judge.title}{judge.title && judge.organization ? " · " : ""}{judge.organization}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <CheckCircle size={10} />
                        {submitted} scores submitted
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <DollarSign size={10} />
                        ₹{judge.remainingBudget.toLocaleString()} remaining
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock size={10} />
                        {lastActive}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => copyLink(judge.accessToken)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground
                        border border-border/30 hover:text-foreground hover:bg-white/5 transition-all">
                      <Copy size={11} /> Link
                    </button>
                    <button onClick={() => handleDelete(judge.id, judge.name)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground
                        hover:text-red-400 hover:bg-red-500/10 transition-all">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create form modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="glass-card rounded-3xl p-6 w-full max-w-md border border-[rgba(191,0,255,0.2)]"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl font-bold">Add Judge</h2>
                <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4">
                {[
                  { key: "name", label: "Full Name", type: "text" },
                  { key: "email", label: "Email", type: "email" },
                  { key: "title", label: "Title (optional)", type: "text" },
                  { key: "organization", label: "Organization (optional)", type: "text" },
                  { key: "budget", label: "Investment Budget (₹)", type: "number" },
                ].map(({ key, label, type }) => (
                  <div key={key}>
                    <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1.5 block">{label}</label>
                    <input type={type} value={(form as any)[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-border/50
                        focus:outline-none focus:border-[rgba(191,0,255,0.4)] text-foreground transition-all" />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm text-muted-foreground border border-border/50 hover:bg-white/5 transition-all">
                  Cancel
                </button>
                <button onClick={handleCreate} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, rgba(191,0,255,0.8) 0%, rgba(100,0,200,0.8) 100%)", boxShadow: "0 0 20px rgba(191,0,255,0.2)" }}>
                  {saving ? "Creating..." : "Create Judge"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
