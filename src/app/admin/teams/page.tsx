"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Users, X, Check, Globe } from "lucide-react";

type Team = {
  id: string; teamNumber: number; name: string; members: string[];
  scrapItemReceived: string; productIdea: string; productDescription?: string;
  websiteUrl?: string; status: string; presentationOrder?: number;
};

const emptyForm = {
  teamNumber: "", name: "", members: "", scrapItemReceived: "",
  productIdea: "", productDescription: "", websiteUrl: "", presentationOrder: "",
};

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchTeams = async () => {
    const res = await fetch("/api/admin/teams");
    const data = await res.json();
    setTeams(data.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchTeams(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (t: Team) => {
    setEditing(t);
    setForm({
      teamNumber: String(t.teamNumber), name: t.name,
      members: t.members.join(", "),
      scrapItemReceived: t.scrapItemReceived, productIdea: t.productIdea,
      productDescription: t.productDescription ?? "", websiteUrl: t.websiteUrl ?? "",
      presentationOrder: String(t.presentationOrder ?? ""),
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const body = {
      ...(!editing ? {} : { id: editing.id }),
      teamNumber: parseInt(form.teamNumber),
      name: form.name,
      members: form.members.split(",").map((m) => m.trim()).filter(Boolean),
      scrapItemReceived: form.scrapItemReceived,
      productIdea: form.productIdea,
      productDescription: form.productDescription || undefined,
      websiteUrl: form.websiteUrl || undefined,
      presentationOrder: form.presentationOrder ? parseInt(form.presentationOrder) : undefined,
    };

    const res = await fetch("/api/admin/teams", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.success) {
      toast.success(editing ? "Team updated!" : "Team created!");
      setShowForm(false);
      fetchTeams();
    } else {
      toast.error(typeof data.error === "string" ? data.error : "Validation failed");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete team "${name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/teams?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) { toast.success("Team deleted"); fetchTeams(); }
    else toast.error(data.error);
  };

  const statusColors: Record<string, string> = {
    registered: "badge-registered",
    presenting: "badge-presenting",
    done: "badge-done",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Teams</h1>
          <p className="text-muted-foreground text-sm mt-1">{teams.length} teams registered</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
            bg-[rgba(0,245,255,0.1)] border border-[rgba(0,245,255,0.25)] text-[var(--neon-cyan)]
            hover:bg-[rgba(0,245,255,0.18)] transition-all duration-200">
          <Plus size={15} /> Add Team
        </button>
      </div>

      {/* Team grid */}
      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-24 rounded-2xl shimmer" />)}</div>
      ) : (
        <div className="space-y-3">
          {teams.map((team) => (
            <motion.div key={team.id} layout
              className="glass-card rounded-2xl p-5 border border-border/30 hover:border-[rgba(0,245,255,0.15)] transition-all duration-200">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[rgba(0,245,255,0.08)] border border-[rgba(0,245,255,0.15)]
                    flex items-center justify-center font-mono font-bold text-[var(--neon-cyan)] text-sm flex-shrink-0">
                    {team.teamNumber}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-display font-bold text-foreground">{team.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${statusColors[team.status] ?? "badge-registered"}`}>
                        {team.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      <span className="text-[rgba(255,107,0,0.8)] font-semibold">Scrap:</span> {team.scrapItemReceived}
                      {" → "}
                      <span className="text-foreground/80">{team.productIdea}</span>
                    </p>
                    <div className="flex items-center gap-1 flex-wrap">
                      <Users size={11} className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{team.members.join(", ")}</span>
                    </div>
                    {team.websiteUrl && (
                      <a href={team.websiteUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[var(--neon-cyan)] mt-1 hover:underline">
                        <Globe size={10} /> Website
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => openEdit(team)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground
                      hover:text-foreground hover:bg-white/10 transition-all duration-200">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDelete(team.id, team.name)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground
                      hover:text-red-400 hover:bg-red-500/10 transition-all duration-200">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Form modal */}
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
              className="glass-card rounded-3xl p-6 w-full max-w-lg border border-[rgba(0,245,255,0.15)] max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl font-bold">{editing ? "Edit Team" : "Add Team"}</h2>
                <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1.5 block">Team Number</label>
                    <input type="number" value={form.teamNumber} onChange={(e) => setForm({ ...form, teamNumber: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-border/50 focus:outline-none focus:border-[rgba(0,245,255,0.4)] text-foreground transition-all" />
                  </div>
                  <div>
                    <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1.5 block">Order</label>
                    <input type="number" value={form.presentationOrder} onChange={(e) => setForm({ ...form, presentationOrder: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-border/50 focus:outline-none focus:border-[rgba(0,245,255,0.4)] text-foreground transition-all" />
                  </div>
                </div>

                {[
                  { key: "name", label: "Team Name" },
                  { key: "members", label: "Members (comma-separated)" },
                  { key: "scrapItemReceived", label: "Scrap Item Received" },
                  { key: "productIdea", label: "Product Idea" },
                  { key: "productDescription", label: "Product Description (optional)", textarea: true },
                  { key: "websiteUrl", label: "Website URL (optional)" },
                ].map(({ key, label, textarea }) => (
                  <div key={key}>
                    <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1.5 block">{label}</label>
                    {textarea ? (
                      <textarea value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} rows={3}
                        className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-border/50 focus:outline-none focus:border-[rgba(0,245,255,0.4)] text-foreground transition-all resize-none" />
                    ) : (
                      <input type="text" value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-border/50 focus:outline-none focus:border-[rgba(0,245,255,0.4)] text-foreground transition-all" />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm text-muted-foreground border border-border/50 hover:bg-white/5 transition-all">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[#0a0e1a] transition-all disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, rgba(0,245,255,0.9) 0%, rgba(0,180,255,0.9) 100%)", boxShadow: "0 0 20px rgba(0,245,255,0.25)" }}>
                  {saving ? "Saving..." : (editing ? "Update Team" : "Create Team")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
