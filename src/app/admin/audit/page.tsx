"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ScrollText, RefreshCw, Filter, ChevronLeft, ChevronRight } from "lucide-react";

type Log = {
  id: string; action: string; actorName?: string; actorRole?: string;
  targetId?: string; targetType?: string; metadata?: Record<string, unknown>;
  ipAddress?: string; createdAt: string;
};

const ACTION_COLORS: Record<string, string> = {
  admin_login: "rgba(0,245,255,1)",
  judge_login: "rgba(191,0,255,1)",
  team_created: "rgba(57,255,20,1)",
  team_updated: "rgba(255,238,0,1)",
  team_deleted: "rgba(239,68,68,1)",
  judge_created: "rgba(191,0,255,1)",
  judge_score_submitted: "rgba(57,255,20,1)",
  judge_investment_submitted: "rgba(57,255,20,1)",
  audience_voting_opened: "rgba(0,245,255,1)",
  audience_voting_closed: "rgba(255,107,0,1)",
  audience_vote_cast: "rgba(255,238,0,1)",
  leaderboard_refresh: "rgba(57,255,20,1)",
  settings_updated: "rgba(255,107,0,1)",
};

export default function AuditPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "30" });
    if (action) params.set("action", action);
    const res = await fetch(`/api/admin/audit?${params}`);
    const data = await res.json();
    setLogs(data.data ?? []);
    setLoading(false);
  }, [page, action]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const actions = [
    "", "admin_login", "judge_login", "team_created", "team_updated", "team_deleted",
    "judge_created", "judge_score_submitted", "judge_investment_submitted",
    "audience_voting_opened", "audience_voting_closed", "audience_vote_cast",
    "leaderboard_refresh", "settings_updated",
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground text-sm mt-1">Full trail of all system actions</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl text-sm bg-white/5 border border-border/50 text-foreground
              focus:outline-none focus:border-[rgba(0,245,255,0.4)] transition-all">
            {actions.map((a) => (
              <option key={a} value={a} style={{ background: "#0f1624" }}>
                {a || "All Actions"}
              </option>
            ))}
          </select>
          <button onClick={fetchLogs}
            className="w-9 h-9 rounded-xl flex items-center justify-center
              bg-white/5 border border-border/50 text-muted-foreground hover:text-foreground transition-all">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(10)].map((_, i) => <div key={i} className="h-14 rounded-xl shimmer" />)}</div>
      ) : (
        <div className="space-y-2">
          {logs.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ScrollText size={36} className="mx-auto mb-3 opacity-30" />
              <p>No audit logs found</p>
            </div>
          ) : (
            logs.map((log, i) => {
              const color = ACTION_COLORS[log.action] ?? "rgba(148,163,184,1)";
              const time = new Date(log.createdAt);

              return (
                <motion.div key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="glass-card rounded-xl px-4 py-3 border border-border/20 hover:border-border/40 transition-all"
                >
                  <div className="flex items-center gap-4">
                    {/* Color dot */}
                    <span className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />

                    {/* Action */}
                    <span className="text-xs font-mono font-semibold w-52 flex-shrink-0" style={{ color }}>
                      {log.action.replace(/_/g, " ").toUpperCase()}
                    </span>

                    {/* Actor */}
                    <span className="text-sm text-foreground/80 flex-1 truncate">
                      {log.actorName ? (
                        <><span className="text-foreground font-medium">{log.actorName}</span>
                        <span className="text-muted-foreground"> · {log.actorRole}</span></>
                      ) : (
                        <span className="text-muted-foreground">system</span>
                      )}
                      {log.targetType && log.targetId && (
                        <span className="text-muted-foreground ml-2">→ {log.targetType}</span>
                      )}
                    </span>

                    {/* IP */}
                    {log.ipAddress && (
                      <span className="text-xs font-mono text-muted-foreground/60 hidden md:block">
                        {log.ipAddress}
                      </span>
                    )}

                    {/* Time */}
                    <span className="text-xs font-mono text-muted-foreground flex-shrink-0">
                      {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  </div>

                  {/* Metadata */}
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="mt-1.5 ml-6 pl-4 border-l border-border/30">
                      <code className="text-xs text-muted-foreground/70 font-mono">
                        {JSON.stringify(log.metadata).slice(0, 120)}
                        {JSON.stringify(log.metadata).length > 120 ? "…" : ""}
                      </code>
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between pt-2">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-muted-foreground
            border border-border/30 hover:text-foreground hover:bg-white/5 transition-all disabled:opacity-30">
          <ChevronLeft size={14} /> Prev
        </button>
        <span className="text-xs font-mono text-muted-foreground">Page {page}</span>
        <button onClick={() => setPage((p) => p + 1)} disabled={logs.length < 30}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-muted-foreground
            border border-border/30 hover:text-foreground hover:bg-white/5 transition-all disabled:opacity-30">
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
