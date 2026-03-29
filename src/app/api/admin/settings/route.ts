import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { eventSettings } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

export async function GET() {
  const settings = await db.query.eventSettings.findFirst();
  return NextResponse.json({ success: true, data: settings });
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth(["admin"]);
    const body = await req.json();

    const allowed = [
      "eventName",
      "organizerName",
      "collegeName",
      "totalJudgeBudget",
      "audienceVotingDurationSec",
      "isEventLive",
      "leaderboardPublic",
    ];

    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    const existing = await db.query.eventSettings.findFirst();
    if (!existing) {
      const [created] = await db.insert(eventSettings).values(updates as any).returning();
      return NextResponse.json({ success: true, data: created });
    }

    const [updated] = await db
      .update(eventSettings)
      .set({ ...updates, updatedAt: new Date() })
      .returning();

    await createAuditLog({
      action: "settings_updated",
      actorId: session.userId,
      actorRole: "admin",
      actorName: session.name,
      metadata: { changes: updates },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    if (err.message === "Unauthorized") {
      return NextResponse.json({ success: false, error: err.message }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
