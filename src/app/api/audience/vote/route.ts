import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { audienceVotes, teams, eventSettings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateVoterFingerprint } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { computeTeamScore } from "@/lib/scoring";

// GET: check voting status + voter's existing vote for a team
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");

  if (!teamId) {
    return NextResponse.json(
      { success: false, error: "teamId required" },
      { status: 400 }
    );
  }

  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
  });

  if (!team) {
    return NextResponse.json({ success: false, error: "Team not found" }, { status: 404 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.ip ??
    "unknown";
  const ua = req.headers.get("user-agent") ?? "";
  const fingerprint = generateVoterFingerprint(ip, ua, teamId);

  const existingVote = await db.query.audienceVotes.findFirst({
    where: and(
      eq(audienceVotes.teamId, teamId),
      eq(audienceVotes.voterFingerprint, fingerprint)
    ),
  });

  const settings = await db.query.eventSettings.findFirst();
  const duration = settings?.audienceVotingDurationSec ?? 60;

  let secondsRemaining = 0;
  if (team.votingStatus === "open" && team.votingOpenedAt) {
    const elapsed = (Date.now() - new Date(team.votingOpenedAt).getTime()) / 1000;
    secondsRemaining = Math.max(0, duration - elapsed);
  }

  return NextResponse.json({
    success: true,
    data: {
      teamId,
      teamName: team.name,
      teamNumber: team.teamNumber,
      productIdea: team.productIdea,
      votingStatus: team.votingStatus,
      votingOpenedAt: team.votingOpenedAt,
      secondsRemaining: Math.floor(secondsRemaining),
      hasVoted: !!existingVote,
      myVote: existingVote?.vote ?? null,
    },
  });
}

// POST: cast audience vote
export async function POST(req: NextRequest) {
  try {
    const { teamId, vote } = await req.json();

    if (!teamId || !vote) {
      return NextResponse.json(
        { success: false, error: "teamId and vote required" },
        { status: 400 }
      );
    }

    if (!["like", "neutral", "dislike"].includes(vote)) {
      return NextResponse.json(
        { success: false, error: "vote must be like, neutral, or dislike" },
        { status: 400 }
      );
    }

    // Check team voting is open
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      return NextResponse.json({ success: false, error: "Team not found" }, { status: 404 });
    }

    if (team.votingStatus !== "open") {
      return NextResponse.json(
        { success: false, error: "Voting is not currently open for this team" },
        { status: 403 }
      );
    }

    // Check time window
    const settings = await db.query.eventSettings.findFirst();
    const duration = settings?.audienceVotingDurationSec ?? 60;
    if (team.votingOpenedAt) {
      const elapsed =
        (Date.now() - new Date(team.votingOpenedAt).getTime()) / 1000;
      if (elapsed > duration) {
        return NextResponse.json(
          { success: false, error: "Voting window has expired" },
          { status: 403 }
        );
      }
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.ip ??
      "unknown";
    const ua = req.headers.get("user-agent") ?? "";
    const fingerprint = generateVoterFingerprint(ip, ua, teamId);

    // Check duplicate
    const existing = await db.query.audienceVotes.findFirst({
      where: and(
        eq(audienceVotes.teamId, teamId),
        eq(audienceVotes.voterFingerprint, fingerprint)
      ),
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "You have already voted for this team" },
        { status: 409 }
      );
    }

    await db.insert(audienceVotes).values({
      teamId,
      voterFingerprint: fingerprint,
      vote,
    });

    // Update live score
    await computeTeamScore(teamId);

    await createAuditLog({
      action: "audience_vote_cast",
      targetId: teamId,
      targetType: "team",
      metadata: { vote, teamName: team.name },
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      data: { vote, teamId, message: "Vote recorded!" },
    });
  } catch (err: any) {
    if (err.code === "23505") {
      return NextResponse.json(
        { success: false, error: "You have already voted for this team" },
        { status: 409 }
      );
    }
    console.error("[Audience Vote]", err);
    return NextResponse.json(
      { success: false, error: "Failed to cast vote" },
      { status: 500 }
    );
  }
}
