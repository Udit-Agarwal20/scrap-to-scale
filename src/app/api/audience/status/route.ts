import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teams, eventSettings, audienceVotes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateVoterFingerprint } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const settings = await db.query.eventSettings.findFirst();

    if (!settings?.isEventLive) {
      return NextResponse.json({
        success: true,
        data: { isEventLive: false, activeTeam: null },
      });
    }

    const activeTeamId = settings.currentPresentingTeamId;
    if (!activeTeamId) {
      return NextResponse.json({
        success: true,
        data: { isEventLive: true, activeTeam: null },
      });
    }

    const team = await db.query.teams.findFirst({
      where: eq(teams.id, activeTeamId),
    });

    if (!team) {
      return NextResponse.json({
        success: true,
        data: { isEventLive: true, activeTeam: null },
      });
    }

    const duration = settings.audienceVotingDurationSec;
    let secondsRemaining = 0;
    if (team.votingStatus === "open" && team.votingOpenedAt) {
      const elapsed =
        (Date.now() - new Date(team.votingOpenedAt).getTime()) / 1000;
      secondsRemaining = Math.max(0, duration - elapsed);
    }

    // Check if this viewer has voted
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.ip ??
      "unknown";
    const ua = req.headers.get("user-agent") ?? "";
    const fingerprint = generateVoterFingerprint(ip, ua, activeTeamId);

    const existingVote = await db.query.audienceVotes.findFirst({
      where: and(
        eq(audienceVotes.teamId, activeTeamId),
        eq(audienceVotes.voterFingerprint, fingerprint)
      ),
    });

    return NextResponse.json({
      success: true,
      data: {
        isEventLive: true,
        activeTeam: {
          id: team.id,
          teamNumber: team.teamNumber,
          name: team.name,
          productIdea: team.productIdea,
          productDescription: team.productDescription,
          members: team.members,
          scrapItemReceived: team.scrapItemReceived,
          votingStatus: team.votingStatus,
          votingOpenedAt: team.votingOpenedAt,
          secondsRemaining: Math.floor(secondsRemaining),
          hasVoted: !!existingVote,
          myVote: existingVote?.vote ?? null,
        },
        votingDurationSec: duration,
      },
    });
  } catch (err) {
    console.error("[Audience Status]", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch status" },
      { status: 500 }
    );
  }
}
