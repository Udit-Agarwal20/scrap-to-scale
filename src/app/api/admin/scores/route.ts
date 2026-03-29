import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { judgeScores, judges } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(["admin", "member"]);
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");

    if (teamId) {
      // Get all judge scores for a specific team (admin view)
      const scores = await db.query.judgeScores.findMany({
        where: eq(judgeScores.teamId, teamId),
        with: { judge: true },
      });
      return NextResponse.json({ success: true, data: scores });
    }

    // All submitted scores with judge info
    const allScores = await db.query.judgeScores.findMany({
      where: eq(judgeScores.isSubmitted, true),
      with: {
        judge: { columns: { accessToken: false } },
        team: { columns: { id: true, name: true, teamNumber: true } },
      },
    });

    return NextResponse.json({ success: true, data: allScores });
  } catch (err: any) {
    if (err.message === "Unauthorized" || err.message === "Forbidden") {
      return NextResponse.json({ success: false, error: err.message }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, error: "Failed to fetch scores" },
      { status: 500 }
    );
  }
}
