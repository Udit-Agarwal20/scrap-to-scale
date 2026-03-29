import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  decimal,
  jsonb,
  uuid,
  varchar,
  pgEnum,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "judge",
  "member",
  "audience",
]);

export const teamStatusEnum = pgEnum("team_status", [
  "registered",
  "presenting",
  "done",
]);

export const votingStatusEnum = pgEnum("voting_status", [
  "idle",
  "open",
  "closed",
]);

export const audienceVoteEnum = pgEnum("audience_vote", [
  "like",
  "neutral",
  "dislike",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "admin_login",
  "judge_login",
  "team_created",
  "team_updated",
  "team_deleted",
  "judge_created",
  "judge_score_submitted",
  "judge_investment_submitted",
  "audience_voting_opened",
  "audience_voting_closed",
  "audience_vote_cast",
  "leaderboard_refresh",
  "final_scores_computed",
  "event_reset",
  "settings_updated",
]);

// ─── Event Settings ───────────────────────────────────────────────────────────

export const eventSettings = pgTable("event_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  eventName: text("event_name").notNull().default("Scrap to Scale"),
  organizerName: text("organizer_name").notNull().default("Nex-Cell"),
  collegeName: text("college_name").notNull().default("Mirai School of Technology"),
  totalJudgeBudget: integer("total_judge_budget").notNull().default(100000),
  audienceVotingDurationSec: integer("audience_voting_duration_sec").notNull().default(60),
  isEventLive: boolean("is_event_live").notNull().default(false),
  leaderboardPublic: boolean("leaderboard_public").notNull().default(true),
  currentPresentingTeamId: uuid("current_presenting_team_id"),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash"),
    role: userRoleEnum("role").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
  },
  (t) => ({
    emailIdx: index("users_email_idx").on(t.email),
  })
);

// ─── Teams ────────────────────────────────────────────────────────────────────

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  teamNumber: integer("team_number").notNull().unique(),
  name: text("name").notNull(),
  members: jsonb("members").$type<string[]>().notNull().default([]),
  scrapItemReceived: text("scrap_item_received").notNull(),
  productIdea: text("product_idea").notNull(),
  productDescription: text("product_description"),
  websiteUrl: text("website_url"),
  prototypeNotes: text("prototype_notes"),
  status: teamStatusEnum("status").notNull().default("registered"),
  presentationOrder: integer("presentation_order"),
  votingStatus: votingStatusEnum("voting_status").notNull().default("idle"),
  votingOpenedAt: timestamp("voting_opened_at"),
  votingClosedAt: timestamp("voting_closed_at"),
  finalScore: decimal("final_score", { precision: 6, scale: 3 }),
  finalRank: integer("final_rank"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// ─── Judges ───────────────────────────────────────────────────────────────────

export const judges = pgTable("judges", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token").notNull().unique(),
  name: text("name").notNull(),
  title: text("title"),
  organization: text("organization"),
  remainingBudget: integer("remaining_budget").notNull().default(100000),
  hasCompletedAllScores: boolean("has_completed_all_scores")
    .notNull()
    .default(false),
  lastActiveAt: timestamp("last_active_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// ─── Judge Scores (Rubric) ────────────────────────────────────────────────────

export const judgeScores = pgTable(
  "judge_scores",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    judgeId: uuid("judge_id")
      .notNull()
      .references(() => judges.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    // Rubric dimensions (out of max points each)
    bigIdea: integer("big_idea").notNull().default(0),             // max 15
    productUsefulness: integer("product_usefulness").notNull().default(0),    // max 15
    repurposeEfficiency: integer("repurpose_efficiency").notNull().default(0),  // max 10
    pitchPerformance: integer("pitch_performance").notNull().default(0),      // max 20
    staticWebsite: integer("static_website").notNull().default(0),          // max 10
    feasibility: integer("feasibility").notNull().default(0),              // max 10
    teamSynergy: integer("team_synergy").notNull().default(0),            // max 10
    uniqueness: integer("uniqueness").notNull().default(0),              // max 10
    totalRubricScore: integer("total_rubric_score").notNull().default(0),   // max 100
    notes: text("notes"),
    isSubmitted: boolean("is_submitted").notNull().default(false),
    submittedAt: timestamp("submitted_at"),
    createdAt: timestamp("created_at").notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
  },
  (t) => ({
    uniqueJudgeTeam: unique("judge_scores_judge_team_unique").on(
      t.judgeId,
      t.teamId
    ),
    judgeIdx: index("judge_scores_judge_idx").on(t.judgeId),
    teamIdx: index("judge_scores_team_idx").on(t.teamId),
  })
);

// ─── Judge Investments ────────────────────────────────────────────────────────

export const judgeInvestments = pgTable(
  "judge_investments",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    judgeId: uuid("judge_id")
      .notNull()
      .references(() => judges.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull().default(0),
    isFinalized: boolean("is_finalized").notNull().default(false),
    updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
  },
  (t) => ({
    uniqueJudgeTeamInv: unique("judge_investments_judge_team_unique").on(
      t.judgeId,
      t.teamId
    ),
  })
);

// ─── Audience Votes ───────────────────────────────────────────────────────────

export const audienceVotes = pgTable(
  "audience_votes",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    voterFingerprint: text("voter_fingerprint").notNull(),
    vote: audienceVoteEnum("vote").notNull(),
    castedAt: timestamp("casted_at").notNull().default(sql`now()`),
  },
  (t) => ({
    uniqueVoterTeam: unique("audience_votes_voter_team_unique").on(
      t.teamId,
      t.voterFingerprint
    ),
    teamIdx: index("audience_votes_team_idx").on(t.teamId),
  })
);

// ─── Computed Scores (Aggregate) ──────────────────────────────────────────────

export const teamScoreAggregates = pgTable("team_score_aggregates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" })
    .unique(),
  avgRubricScore: decimal("avg_rubric_score", { precision: 6, scale: 3 }),
  rubricScoreNormalized: decimal("rubric_score_normalized", {
    precision: 6,
    scale: 3,
  }), // out of 33.33
  totalInvestment: integer("total_investment").notNull().default(0),
  investmentScoreNormalized: decimal("investment_score_normalized", {
    precision: 6,
    scale: 3,
  }), // out of 33.33
  audienceLikes: integer("audience_likes").notNull().default(0),
  audienceNeutrals: integer("audience_neutrals").notNull().default(0),
  audienceDislikes: integer("audience_dislikes").notNull().default(0),
  audienceScoreNormalized: decimal("audience_score_normalized", {
    precision: 6,
    scale: 3,
  }), // out of 33.33
  finalScore: decimal("final_score", { precision: 6, scale: 3 }),
  judgeCount: integer("judge_count").notNull().default(0),
  lastComputedAt: timestamp("last_computed_at").notNull().default(sql`now()`),
});

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    action: auditActionEnum("action").notNull(),
    actorId: uuid("actor_id"),
    actorRole: userRoleEnum("actor_role"),
    actorName: text("actor_name"),
    targetId: text("target_id"),
    targetType: text("target_type"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").notNull().default(sql`now()`),
  },
  (t) => ({
    createdAtIdx: index("audit_logs_created_at_idx").on(t.createdAt),
    actionIdx: index("audit_logs_action_idx").on(t.action),
  })
);

// ─── Admin Sessions ───────────────────────────────────────────────────────────

export const adminSessions = pgTable("admin_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ one }) => ({
  judge: one(judges, { fields: [users.id], references: [judges.userId] }),
}));

export const judgesRelations = relations(judges, ({ one, many }) => ({
  user: one(users, { fields: [judges.userId], references: [users.id] }),
  scores: many(judgeScores),
  investments: many(judgeInvestments),
}));

export const teamsRelations = relations(teams, ({ many, one }) => ({
  judgeScores: many(judgeScores),
  investments: many(judgeInvestments),
  audienceVotes: many(audienceVotes),
  scoreAggregate: one(teamScoreAggregates, {
    fields: [teams.id],
    references: [teamScoreAggregates.teamId],
  }),
}));

export const judgeScoresRelations = relations(judgeScores, ({ one }) => ({
  judge: one(judges, { fields: [judgeScores.judgeId], references: [judges.id] }),
  team: one(teams, { fields: [judgeScores.teamId], references: [teams.id] }),
}));

export const judgeInvestmentsRelations = relations(judgeInvestments, ({ one }) => ({
  judge: one(judges, {
    fields: [judgeInvestments.judgeId],
    references: [judges.id],
  }),
  team: one(teams, {
    fields: [judgeInvestments.teamId],
    references: [teams.id],
  }),
}));

export const audienceVotesRelations = relations(audienceVotes, ({ one }) => ({
  team: one(teams, {
    fields: [audienceVotes.teamId],
    references: [teams.id],
  }),
}));

export const teamScoreAggregatesRelations = relations(
  teamScoreAggregates,
  ({ one }) => ({
    team: one(teams, {
      fields: [teamScoreAggregates.teamId],
      references: [teams.id],
    }),
  })
);

// ─── Type Exports ─────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type Judge = typeof judges.$inferSelect;
export type NewJudge = typeof judges.$inferInsert;
export type JudgeScore = typeof judgeScores.$inferSelect;
export type JudgeInvestment = typeof judgeInvestments.$inferInsert;
export type AudienceVote = typeof audienceVotes.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type TeamScoreAggregate = typeof teamScoreAggregates.$inferSelect;
export type EventSettings = typeof eventSettings.$inferSelect;
