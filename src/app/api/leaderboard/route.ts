import { NextResponse } from "next/server";
import { db } from "@/db";
import { teams, eventSettings } from "@/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  try {
    const settings = await db.query.eventSettings.findFirst();

    if (!settings?.leaderboardPublic) {
      return NextResponse.json(
        { success: false, error: "Leaderboard is not yet public" },
        { status: 403 }
      );
    }

    const allTeams = await db.query.teams.findMany({
      orderBy: [asc(teams.finalRank)],
      with: { scoreAggregate: true },
      columns: {
        id: true,
        teamNumber: true,
        name: true,
        productIdea: true,
        members: true,
        scrapItemReceived: true,
        status: true,
        finalScore: true,
        finalRank: true,
      },
    });

    const leaderboard = allTeams.map((t) => ({
      rank: t.finalRank ?? 999,
      teamId: t.id,
      teamNumber: t.teamNumber,
      name: t.name,
      productIdea: t.productIdea,
      members: t.members,
      finalScore: parseFloat(String(t.finalScore ?? 0)),
      rubricComponent: parseFloat(
        String(t.scoreAggregate?.rubricScoreNormalized ?? 0)
      ),
      investmentComponent: parseFloat(
        String(t.scoreAggregate?.investmentScoreNormalized ?? 0)
      ),
      audienceComponent: parseFloat(
        String(t.scoreAggregate?.audienceScoreNormalized ?? 0)
      ),
      totalInvestment: t.scoreAggregate?.totalInvestment ?? 0,
      audienceLikes: t.scoreAggregate?.audienceLikes ?? 0,
      audienceNeutrals: t.scoreAggregate?.audienceNeutrals ?? 0,
      audienceDislikes: t.scoreAggregate?.audienceDislikes ?? 0,
      judgeCount: t.scoreAggregate?.judgeCount ?? 0,
      status: t.status,
    }));

    return NextResponse.json({
      success: true,
      data: {
        leaderboard,
        eventName: settings.eventName,
        isEventLive: settings.isEventLive,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[Leaderboard]", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
