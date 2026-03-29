/**
 * Scoring Engine for Scrap to Scale
 *
 * Final Score = (Rubric Score / 3) + (Investment Score / 3) + (Audience Score / 3)
 * Each component is normalized to a 0–100 range before being divided by 3.
 * Final score is out of 100.
 */

import { db } from "@/db";
import {
  judgeScores,
  judgeInvestments,
  audienceVotes,
  teamScoreAggregates,
  teams,
} from "@/db/schema";
import { eq, and, sql, avg, sum } from "drizzle-orm";

export const RUBRIC_MAX = 100; // sum of all rubric max values

export const RUBRIC_DIMENSIONS = {
  bigIdea: { label: "Big Idea / Creativity", max: 15 },
  productUsefulness: { label: "Product Usefulness & Function", max: 15 },
  repurposeEfficiency: { label: "Repurpose Efficiency & Sustainability", max: 10 },
  pitchPerformance: {
    label: "Pitch Performance / Storytelling / Confidence",
    max: 20,
  },
  staticWebsite: { label: "Static Website", max: 10 },
  feasibility: { label: "Feasibility & Marketability", max: 10 },
  teamSynergy: { label: "Team Synergy", max: 10 },
  uniqueness: { label: "Uniqueness / Wow Factor", max: 10 },
} as const;

export type RubricDimensionKey = keyof typeof RUBRIC_DIMENSIONS;

// ─── Audience Score Calculation ───────────────────────────────────────────────

export function computeAudienceScore(
  likes: number,
  neutrals: number,
  dislikes: number
): number {
  const total = likes + neutrals + dislikes;
  if (total === 0) return 0;

  // Weighted: like=1, neutral=0.5, dislike=0
  const weighted = (likes * 1 + neutrals * 0.5 + dislikes * 0) / total;
  return Math.round(weighted * 100 * 100) / 100; // 0–100
}

// ─── Rubric Validation ────────────────────────────────────────────────────────

export function validateRubricScores(scores: Record<string, number>): {
  valid: boolean;
  errors: string[];
  total: number;
} {
  const errors: string[] = [];
  let total = 0;

  for (const [key, config] of Object.entries(RUBRIC_DIMENSIONS)) {
    const val = scores[key] ?? 0;
    if (val < 0 || val > config.max) {
      errors.push(`${config.label}: must be 0–${config.max}, got ${val}`);
    }
    total += Math.min(Math.max(val, 0), config.max);
  }

  return { valid: errors.length === 0, errors, total };
}

// ─── Team Score Aggregation ───────────────────────────────────────────────────

export async function computeTeamScore(teamId: string) {
  // 1. Average rubric score from submitted judge scores
  const rubricResult = await db
    .select({
      avgScore: avg(judgeScores.totalRubricScore),
      judgeCount: sql<number>`count(*)`,
    })
    .from(judgeScores)
    .where(
      and(eq(judgeScores.teamId, teamId), eq(judgeScores.isSubmitted, true))
    );

  const avgRubric = parseFloat(rubricResult[0]?.avgScore ?? "0");
  const judgeCount = parseInt(String(rubricResult[0]?.judgeCount ?? "0"));

  // 2. Total investment for this team (all judges)
  const investResult = await db
    .select({ totalInv: sum(judgeInvestments.amount) })
    .from(judgeInvestments)
    .where(eq(judgeInvestments.teamId, teamId));

  const totalInvestment = parseInt(String(investResult[0]?.totalInv ?? "0"));

  // 3. Audience votes breakdown
  const audienceResult = await db
    .select({
      vote: audienceVotes.vote,
      count: sql<number>`count(*)`,
    })
    .from(audienceVotes)
    .where(eq(audienceVotes.teamId, teamId))
    .groupBy(audienceVotes.vote);

  const voteMap: Record<string, number> = {};
  for (const r of audienceResult) {
    voteMap[r.vote] = parseInt(String(r.count));
  }

  const likes = voteMap["like"] ?? 0;
  const neutrals = voteMap["neutral"] ?? 0;
  const dislikes = voteMap["dislike"] ?? 0;

  // 4. Normalize each component to 0–100
  const rubricNormalized = (avgRubric / RUBRIC_MAX) * 100;
  const audienceScore = computeAudienceScore(likes, neutrals, dislikes);

  // Investment score: normalized relative to max possible (will re-normalize across all teams later)
  // Stored as raw total here; final normalization happens in computeAllTeamRankings
  const finalScore =
    rubricNormalized / 3 + audienceScore / 3;
  // Investment component added in computeAllTeamRankings for proper normalization

  await db
    .update(teamScoreAggregates)
    .set({
      avgRubricScore: String(avgRubric),
      rubricScoreNormalized: String(rubricNormalized / 3),
      totalInvestment,
      audienceLikes: likes,
      audienceNeutrals: neutrals,
      audienceDislikes: dislikes,
      audienceScoreNormalized: String(audienceScore / 3),
      judgeCount,
      lastComputedAt: new Date(),
    })
    .where(eq(teamScoreAggregates.teamId, teamId));

  return { rubricNormalized, totalInvestment, audienceScore, judgeCount };
}

// ─── Full Rankings with Investment Normalization ──────────────────────────────

export async function computeAllTeamRankings() {
  const allTeams = await db.query.teams.findMany({
    with: { scoreAggregate: true },
  });

  // Find max investment to normalize
  const maxInvestment = Math.max(
    1,
    ...allTeams.map((t) => t.scoreAggregate?.totalInvestment ?? 0)
  );

  const withScores = allTeams.map((team) => {
    const agg = team.scoreAggregate;
    if (!agg) return { teamId: team.id, finalScore: 0 };

    const rubricComponent = parseFloat(String(agg.rubricScoreNormalized ?? 0));
    const investmentNormalized =
      ((agg.totalInvestment ?? 0) / maxInvestment) * 100;
    const investmentComponent = investmentNormalized / 3;
    const audienceComponent = parseFloat(
      String(agg.audienceScoreNormalized ?? 0)
    );

    const finalScore = rubricComponent + investmentComponent + audienceComponent;

    return {
      teamId: team.id,
      finalScore: Math.round(finalScore * 1000) / 1000,
      investmentScoreNormalized: investmentComponent,
    };
  });

  // Sort by final score
  withScores.sort((a, b) => b.finalScore - a.finalScore);

  // Assign ranks and persist
  for (let i = 0; i < withScores.length; i++) {
    const { teamId, finalScore, investmentScoreNormalized } = withScores[i];

    await db
      .update(teamScoreAggregates)
      .set({
        investmentScoreNormalized: String(investmentScoreNormalized),
        finalScore: String(finalScore),
        lastComputedAt: new Date(),
      })
      .where(eq(teamScoreAggregates.teamId, teamId));

    await db
      .update(teams)
      .set({
        finalScore: String(finalScore),
        finalRank: i + 1,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, teamId));
  }

  return withScores;
}
