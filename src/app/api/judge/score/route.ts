import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { judgeScores, judges, teams } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { validateRubricScores, computeTeamScore } from "@/lib/scoring";
import { cookies } from "next/headers";

async function getJudgeSession(req: NextRequest) {
  const cookieStore = cookies();
  const token =
    cookieStore.get("judge_session")?.value ??
    req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || payload.role !== "judge" || !payload.judgeId) return null;
  return payload;
}

// GET: fetch judge's scores for all teams
export async function GET(req: NextRequest) {
  const session = await getJudgeSession(req);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");

  if (teamId) {
    const score = await db.query.judgeScores.findFirst({
      where: and(
        eq(judgeScores.judgeId, session.judgeId!),
        eq(judgeScores.teamId, teamId)
      ),
    });

    // Check if all judges have submitted for this team — only then reveal peer scores
    const allJudgesCount = await db
      .select({ c: count() })
      .from(judges);
    const submittedCount = await db
      .select({ c: count() })
      .from(judgeScores)
      .where(
        and(eq(judgeScores.teamId, teamId), eq(judgeScores.isSubmitted, true))
      );

    const allSubmitted =
      submittedCount[0].c >= allJudgesCount[0].c && allJudgesCount[0].c > 0;

    let peerScores = null;
    if (allSubmitted) {
      peerScores = await db.query.judgeScores.findMany({
        where: and(
          eq(judgeScores.teamId, teamId),
          eq(judgeScores.isSubmitted, true)
        ),
        with: { judge: { columns: { id: true, name: true } } },
      });
    }

    return NextResponse.json({
      success: true,
      data: { myScore: score, peerScores, allSubmitted },
    });
  }

  const scores = await db.query.judgeScores.findMany({
    where: eq(judgeScores.judgeId, session.judgeId!),
    with: {
      team: {
        columns: {
          id: true,
          name: true,
          teamNumber: true,
          productIdea: true,
          status: true,
        },
      },
    },
  });

  return NextResponse.json({ success: true, data: scores });
}

// POST: save or submit rubric score
export async function POST(req: NextRequest) {
  const session = await getJudgeSession(req);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      teamId,
      bigIdea,
      productUsefulness,
      repurposeEfficiency,
      pitchPerformance,
      staticWebsite,
      feasibility,
      teamSynergy,
      uniqueness,
      notes,
      submit = false,
    } = body;

    if (!teamId) {
      return NextResponse.json(
        { success: false, error: "teamId required" },
        { status: 400 }
      );
    }

    const scoreValues = {
      bigIdea,
      productUsefulness,
      repurposeEfficiency,
      pitchPerformance,
      staticWebsite,
      feasibility,
      teamSynergy,
      uniqueness,
    };

    if (submit) {
      const validation = validateRubricScores(scoreValues);
      if (!validation.valid) {
        return NextResponse.json(
          { success: false, error: "Invalid scores", details: validation.errors },
          { status: 400 }
        );
      }
    }

    const total = Object.values(scoreValues).reduce(
      (sum, v) => sum + (v ?? 0),
      0
    );

    const existing = await db.query.judgeScores.findFirst({
      where: and(
        eq(judgeScores.judgeId, session.judgeId!),
        eq(judgeScores.teamId, teamId)
      ),
    });

    let score;
    if (existing) {
      if (existing.isSubmitted) {
        return NextResponse.json(
          { success: false, error: "Score already submitted and locked" },
          { status: 409 }
        );
      }
      const [updated] = await db
        .update(judgeScores)
        .set({
          ...scoreValues,
          totalRubricScore: total,
          notes,
          isSubmitted: submit,
          submittedAt: submit ? new Date() : undefined,
          updatedAt: new Date(),
        })
        .where(eq(judgeScores.id, existing.id))
        .returning();
      score = updated;
    } else {
      const [created] = await db
        .insert(judgeScores)
        .values({
          judgeId: session.judgeId!,
          teamId,
          ...scoreValues,
          totalRubricScore: total,
          notes,
          isSubmitted: submit,
          submittedAt: submit ? new Date() : undefined,
        })
        .returning();
      score = created;
    }

    if (submit) {
      await computeTeamScore(teamId);

      await createAuditLog({
        action: "judge_score_submitted",
        actorId: session.userId,
        actorRole: "judge",
        actorName: session.name,
        targetId: teamId,
        targetType: "team",
        metadata: { judgeId: session.judgeId, total, teamId },
      });
    }

    return NextResponse.json({ success: true, data: score });
  } catch (err) {
    console.error("[Judge Score]", err);
    return NextResponse.json(
      { success: false, error: "Failed to save score" },
      { status: 500 }
    );
  }
}
