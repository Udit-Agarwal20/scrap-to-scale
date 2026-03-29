import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { judgeInvestments, judges, eventSettings } from "@/db/schema";
import { eq, and, sum } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { computeAllTeamRankings } from "@/lib/scoring";
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

// GET: current investment allocations
export async function GET(req: NextRequest) {
  const session = await getJudgeSession(req);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const judge = await db.query.judges.findFirst({
    where: eq(judges.id, session.judgeId!),
  });

  const investments = await db.query.judgeInvestments.findMany({
    where: eq(judgeInvestments.judgeId, session.judgeId!),
    with: {
      team: {
        columns: {
          id: true,
          name: true,
          teamNumber: true,
          productIdea: true,
        },
      },
    },
  });

  const settings = await db.query.eventSettings.findFirst();

  return NextResponse.json({
    success: true,
    data: {
      investments,
      remainingBudget: judge?.remainingBudget ?? 0,
      totalBudget: settings?.totalJudgeBudget ?? 100000,
      isFinalized: investments.some((i) => i.isFinalized),
    },
  });
}

// POST: update investment allocation
export async function POST(req: NextRequest) {
  const session = await getJudgeSession(req);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { allocations, finalize = false } = body as {
      allocations: { teamId: string; amount: number }[];
      finalize?: boolean;
    };

    if (!allocations || !Array.isArray(allocations)) {
      return NextResponse.json(
        { success: false, error: "allocations array required" },
        { status: 400 }
      );
    }

    const settings = await db.query.eventSettings.findFirst();
    const totalBudget = settings?.totalJudgeBudget ?? 100000;

    // Check for already-finalized
    const existing = await db.query.judgeInvestments.findMany({
      where: eq(judgeInvestments.judgeId, session.judgeId!),
    });
    if (existing.some((i) => i.isFinalized)) {
      return NextResponse.json(
        { success: false, error: "Investment already finalized and locked" },
        { status: 409 }
      );
    }

    // Validate total
    const total = allocations.reduce((sum, a) => sum + (a.amount ?? 0), 0);
    if (total > totalBudget) {
      return NextResponse.json(
        {
          success: false,
          error: `Total allocation ₹${total.toLocaleString()} exceeds budget ₹${totalBudget.toLocaleString()}`,
        },
        { status: 400 }
      );
    }

    // Upsert each allocation
    for (const alloc of allocations) {
      const existingAlloc = existing.find((e) => e.teamId === alloc.teamId);
      if (existingAlloc) {
        await db
          .update(judgeInvestments)
          .set({
            amount: alloc.amount,
            isFinalized: finalize,
            updatedAt: new Date(),
          })
          .where(eq(judgeInvestments.id, existingAlloc.id));
      } else {
        await db.insert(judgeInvestments).values({
          judgeId: session.judgeId!,
          teamId: alloc.teamId,
          amount: alloc.amount,
          isFinalized: finalize,
        });
      }
    }

    // Update remaining budget
    await db
      .update(judges)
      .set({
        remainingBudget: totalBudget - total,
        lastActiveAt: new Date(),
      })
      .where(eq(judges.id, session.judgeId!));

    if (finalize) {
      await computeAllTeamRankings();
      await createAuditLog({
        action: "judge_investment_submitted",
        actorId: session.userId,
        actorRole: "judge",
        actorName: session.name,
        metadata: { judgeId: session.judgeId, total, allocations },
      });
    }

    return NextResponse.json({
      success: true,
      data: { total, remaining: totalBudget - total, finalized: finalize },
    });
  } catch (err) {
    console.error("[Judge Invest]", err);
    return NextResponse.json(
      { success: false, error: "Failed to save investment" },
      { status: 500 }
    );
  }
}
