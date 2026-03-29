import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teams, teamScoreAggregates } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const TeamSchema = z.object({
  teamNumber: z.number().int().min(1),
  name: z.string().min(1).max(100),
  members: z.array(z.string().min(1)).min(1).max(10),
  scrapItemReceived: z.string().min(1),
  productIdea: z.string().min(1),
  productDescription: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  prototypeNotes: z.string().optional(),
  presentationOrder: z.number().int().optional(),
});

export async function GET() {
  try {
    const allTeams = await db.query.teams.findMany({
      orderBy: [asc(teams.presentationOrder), asc(teams.teamNumber)],
      with: { scoreAggregate: true },
    });
    return NextResponse.json({ success: true, data: allTeams });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch teams" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(["admin", "member"]);
    const body = await req.json();
    const parsed = TeamSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const [team] = await db.insert(teams).values(parsed.data).returning();
    await db.insert(teamScoreAggregates).values({ teamId: team.id });

    await createAuditLog({
      action: "team_created",
      actorId: session.userId,
      actorRole: session.role,
      actorName: session.name,
      targetId: team.id,
      targetType: "team",
      metadata: { teamName: team.name, teamNumber: team.teamNumber },
    });

    return NextResponse.json({ success: true, data: team }, { status: 201 });
  } catch (err: any) {
    if (err.message === "Unauthorized" || err.message === "Forbidden") {
      return NextResponse.json({ success: false, error: err.message }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, error: "Failed to create team" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth(["admin", "member"]);
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Team ID required" },
        { status: 400 }
      );
    }

    const [team] = await db
      .update(teams)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(teams.id, id))
      .returning();

    await createAuditLog({
      action: "team_updated",
      actorId: session.userId,
      actorRole: session.role,
      actorName: session.name,
      targetId: id,
      targetType: "team",
      metadata: { updates },
    });

    return NextResponse.json({ success: true, data: team });
  } catch (err: any) {
    if (err.message === "Unauthorized" || err.message === "Forbidden") {
      return NextResponse.json({ success: false, error: err.message }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, error: "Failed to update team" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth(["admin"]);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Team ID required" },
        { status: 400 }
      );
    }

    await db.delete(teams).where(eq(teams.id, id));

    await createAuditLog({
      action: "team_deleted",
      actorId: session.userId,
      actorRole: session.role,
      actorName: session.name,
      targetId: id,
      targetType: "team",
    });

    return NextResponse.json({ success: true, data: { id } });
  } catch (err: any) {
    if (err.message === "Unauthorized") {
      return NextResponse.json({ success: false, error: err.message }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, error: "Failed to delete team" },
      { status: 500 }
    );
  }
}
