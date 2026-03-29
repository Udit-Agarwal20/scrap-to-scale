import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teams, eventSettings } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { computeTeamScore, computeAllTeamRankings } from "@/lib/scoring";

// GET: current voting state
export async function GET() {
  const settings = await db.query.eventSettings.findFirst();
  const activeTeam = settings?.currentPresentingTeamId
    ? await db.query.teams.findFirst({
        where: eq(teams.id, settings.currentPresentingTeamId),
      })
    : null;

  return NextResponse.json({
    success: true,
    data: {
      isEventLive: settings?.isEventLive ?? false,
      activeTeam,
      votingDurationSec: settings?.audienceVotingDurationSec ?? 60,
    },
  });
}

// POST: open voting for a team
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(["admin"]);
    const { teamId } = await req.json();

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
      return NextResponse.json(
        { success: false, error: "Team not found" },
        { status: 404 }
      );
    }

    // Close any currently open voting
    await db
      .update(teams)
      .set({
        votingStatus: "closed",
        votingClosedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(teams.votingStatus, "open"), ne(teams.id, teamId)));

    // Open voting for target team
    const now = new Date();
    await db
      .update(teams)
      .set({
        votingStatus: "open",
        votingOpenedAt: now,
        status: "presenting",
        updatedAt: now,
      })
      .where(eq(teams.id, teamId));

    // Update event settings
    await db
      .update(eventSettings)
      .set({
        currentPresentingTeamId: teamId,
        isEventLive: true,
        updatedAt: now,
      });

    await createAuditLog({
      action: "audience_voting_opened",
      actorId: session.userId,
      actorRole: "admin",
      actorName: session.name,
      targetId: teamId,
      targetType: "team",
      metadata: { teamName: team.name, openedAt: now.toISOString() },
    });

    return NextResponse.json({
      success: true,
      data: { teamId, openedAt: now.toISOString() },
    });
  } catch (err: any) {
    if (err.message === "Unauthorized") {
      return NextResponse.json({ success: false, error: err.message }, { status: 401 });
    }
    console.error("[Voting Open]", err);
    return NextResponse.json(
      { success: false, error: "Failed to open voting" },
      { status: 500 }
    );
  }
}

// DELETE: close voting for current team (manual or auto-timeout)
export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth(["admin"]);
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");

    if (!teamId) {
      return NextResponse.json(
        { success: false, error: "teamId required" },
        { status: 400 }
      );
    }

    const now = new Date();

    await db
      .update(teams)
      .set({
        votingStatus: "closed",
        votingClosedAt: now,
        status: "done",
        updatedAt: now,
      })
      .where(eq(teams.id, teamId));

    await db
      .update(eventSettings)
      .set({ currentPresentingTeamId: null, updatedAt: now });

    // Recompute scores
    await computeTeamScore(teamId);
    await computeAllTeamRankings();

    await createAuditLog({
      action: "audience_voting_closed",
      actorId: session.userId,
      actorRole: "admin",
      actorName: session.name,
      targetId: teamId,
      targetType: "team",
      metadata: { closedAt: now.toISOString() },
    });

    return NextResponse.json({
      success: true,
      data: { teamId, closedAt: now.toISOString() },
    });
  } catch (err: any) {
    if (err.message === "Unauthorized") {
      return NextResponse.json({ success: false, error: err.message }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, error: "Failed to close voting" },
      { status: 500 }
    );
  }
}
