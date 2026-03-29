// ─── API Response Wrapper ─────────────────────────────────────────────────────

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: number };

// ─── Team Types ───────────────────────────────────────────────────────────────

export type TeamStatus = "registered" | "presenting" | "done";
export type VotingStatus = "idle" | "open" | "closed";

export type TeamSummary = {
  id: string;
  teamNumber: number;
  name: string;
  members: string[];
  scrapItemReceived: string;
  productIdea: string;
  productDescription?: string | null;
  websiteUrl?: string | null;
  status: TeamStatus;
  votingStatus: VotingStatus;
  votingOpenedAt?: string | null;
  presentationOrder?: number | null;
  finalScore?: string | null;
  finalRank?: number | null;
};

export type TeamWithScores = TeamSummary & {
  scoreAggregate?: {
    avgRubricScore?: string | null;
    rubricScoreNormalized?: string | null;
    investmentScoreNormalized?: string | null;
    audienceScoreNormalized?: string | null;
    totalInvestment: number;
    audienceLikes: number;
    audienceNeutrals: number;
    audienceDislikes: number;
    finalScore?: string | null;
    judgeCount: number;
    lastComputedAt: string;
  } | null;
};

// ─── Judge Types ──────────────────────────────────────────────────────────────

export type JudgeSummary = {
  id: string;
  name: string;
  title?: string | null;
  organization?: string | null;
  accessToken: string;
  remainingBudget: number;
  hasCompletedAllScores: boolean;
  lastActiveAt?: string | null;
};

export type RubricScorePayload = {
  teamId: string;
  bigIdea: number;
  productUsefulness: number;
  repurposeEfficiency: number;
  pitchPerformance: number;
  staticWebsite: number;
  feasibility: number;
  teamSynergy: number;
  uniqueness: number;
  notes?: string;
};

export type InvestmentPayload = {
  allocations: { teamId: string; amount: number }[];
};

// ─── Audience Types ───────────────────────────────────────────────────────────

export type AudienceVoteType = "like" | "neutral" | "dislike";

export type ActiveVotingState = {
  teamId: string;
  teamName: string;
  teamNumber: number;
  productIdea: string;
  votingOpenedAt: string;
  secondsRemaining: number;
  hasVoted: boolean;
};

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export type LeaderboardEntry = {
  rank: number;
  teamId: string;
  teamNumber: number;
  name: string;
  productIdea: string;
  finalScore: number;
  rubricComponent: number;
  investmentComponent: number;
  audienceComponent: number;
  totalInvestment: number;
  judgeCount: number;
};

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

export type DashboardStats = {
  totalTeams: number;
  teamsPresented: number;
  activeJudges: number;
  totalVotesCast: number;
  currentTeam?: TeamSummary | null;
  isEventLive: boolean;
};

// ─── Audit Log ────────────────────────────────────────────────────────────────

export type AuditLogEntry = {
  id: string;
  action: string;
  actorName?: string | null;
  actorRole?: string | null;
  targetId?: string | null;
  targetType?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  createdAt: string;
};
