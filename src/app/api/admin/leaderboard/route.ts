import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { computeAllTeamRankings } from "@/lib/scoring";
import { createAuditLog } from "@/lib/audit";
import { db } from "@/db";
import { teams } from "@/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  try {
    const allTeams = await db.query.teams.findMany({
      orderBy: [asc(teams.finalRank)],
      with: { scoreAggregate: true },
    });

    return NextResponse.json({ success: true, data: allTeams });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(["admin"]);
    const rankings = await computeAllTeamRankings();

    await createAuditLog({
      action: "leaderboard_refresh",
      actorId: session.userId,
      actorRole: "admin",
      actorName: session.name,
      metadata: { teamsRanked: rankings.length },
    });

    return NextResponse.json({ success: true, data: rankings });
  } catch (err: any) {
    if (err.message === "Unauthorized") {
      return NextResponse.json({ success: false, error: err.message }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, error: "Failed to refresh leaderboard" },
      { status: 500 }
    );
  }
}
