"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Settings, Save, ToggleLeft, ToggleRight } from "lucide-react";

type EventSettings = {
  eventName: string; organizerName: string; collegeName: string;
  totalJudgeBudget: number; audienceVotingDurationSec: number;
  isEventLive: boolean; leaderboardPublic: boolean;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [form, setForm] = useState<EventSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        setSettings(d.data);
        setForm(d.data);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.success) {
      setSettings(data.data);
      toast.success("Settings saved!");
    } else {
      toast.error("Failed to save settings");
    }
    setSaving(false);
  };

  const Field = ({
    label, field, type = "text", hint,
  }: { label: string; field: keyof EventSettings; type?: string; hint?: string }) => (
    <div>
      <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1.5 block">
        {label}
      </label>
      <input
        type={type}
        value={String((form as any)?.[field] ?? "")}
        onChange={(e) =>
          setForm((f) => ({
            ...f!,
            [field]: type === "number" ? parseInt(e.target.value) || 0 : e.target.value,
          }))
        }
        className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-border/50
          focus:outline-none focus:border-[rgba(0,245,255,0.4)] text-foreground transition-all"
      />
      {hint && <p className="text-xs text-muted-foreground/60 mt-1">{hint}</p>}
    </div>
  );

  const Toggle = ({
    label, field, desc,
  }: { label: string; field: keyof EventSettings; desc?: string }) => {
    const val = !!(form as any)?.[field];
    return (
      <div className="flex items-start justify-between gap-4 py-3 border-b border-border/20 last:border-0">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
        </div>
        <button
          onClick={() => setForm((f) => ({ ...f!, [field]: !val }))}
          className="flex-shrink-0 mt-0.5"
        >
          {val ? (
            <ToggleRight size={28} className="text-[var(--neon-cyan)]" />
          ) : (
            <ToggleLeft size={28} className="text-muted-foreground" />
          )}
        </button>
      </div>
    );
  };

  if (!form) {
    return <div className="h-64 rounded-2xl shimmer" />;
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="font-display text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure event parameters</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-6 border border-border/30 space-y-5">
        <h2 className="font-display font-bold text-lg text-foreground">Event Identity</h2>
        <Field label="Event Name" field="eventName" />
        <Field label="Organizer Name" field="organizerName" />
        <Field label="College Name" field="collegeName" />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="glass-card rounded-2xl p-6 border border-border/30 space-y-5">
        <h2 className="font-display font-bold text-lg text-foreground">Scoring Parameters</h2>
        <Field
          label="Judge Investment Budget (₹ per judge)"
          field="totalJudgeBudget"
          type="number"
          hint="Each judge gets this amount to invest across all teams"
        />
        <Field
          label="Audience Voting Duration (seconds)"
          field="audienceVotingDurationSec"
          type="number"
          hint="How long audience voting stays open for each team"
        />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="glass-card rounded-2xl p-6 border border-border/30">
        <h2 className="font-display font-bold text-lg text-foreground mb-2">Event Controls</h2>
        <Toggle
          label="Event Live"
          field="isEventLive"
          desc="When enabled, audience portal shows real-time voting state"
        />
        <Toggle
          label="Public Leaderboard"
          field="leaderboardPublic"
          desc="When enabled, anyone can view the /leaderboard page"
        />
      </motion.div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold
            text-[#0a0e1a] disabled:opacity-50 transition-all"
          style={{
            background: "linear-gradient(135deg, rgba(0,245,255,0.9) 0%, rgba(0,180,255,0.9) 100%)",
            boxShadow: saving ? "none" : "0 0 24px rgba(0,245,255,0.3)",
          }}>
          <Save size={14} />
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
