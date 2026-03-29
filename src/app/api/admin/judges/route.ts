import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, judges } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { z } from "zod";

const JudgeSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  title: z.string().optional(),
  organization: z.string().optional(),
  budget: z.number().int().min(1000).default(100000),
});

export async function GET() {
  try {
    const allJudges = await db.query.judges.findMany({
      with: {
        user: { columns: { passwordHash: false } },
        scores: { columns: { id: true, teamId: true, isSubmitted: true } },
        investments: { columns: { id: true, teamId: true, amount: true } },
      },
    });
    return NextResponse.json({ success: true, data: allJudges });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch judges" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(["admin"]);
    const body = await req.json();
    const parsed = JudgeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, title, organization, budget } = parsed.data;
    const tempPassword = nanoid(12);
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    const accessToken = nanoid(40);

    const [user] = await db
      .insert(users)
      .values({
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: "judge",
      })
      .returning();

    const [judge] = await db
      .insert(judges)
      .values({
        userId: user.id,
        name,
        title,
        organization,
        accessToken,
        remainingBudget: budget,
      })
      .returning();

    await createAuditLog({
      action: "judge_created",
      actorId: session.userId,
      actorRole: "admin",
      actorName: session.name,
      targetId: judge.id,
      targetType: "judge",
      metadata: { judgeName: name, organization },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          ...judge,
          accessToken,
          accessLink: `${process.env.NEXT_PUBLIC_APP_URL}/judge/${accessToken}`,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    if (err.message === "Unauthorized") {
      return NextResponse.json({ success: false, error: err.message }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, error: "Failed to create judge" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAuth(["admin"]);
    const { searchParams } = new URL(req.url);
    const judgeId = searchParams.get("id");

    if (!judgeId) {
      return NextResponse.json(
        { success: false, error: "Judge ID required" },
        { status: 400 }
      );
    }

    const judge = await db.query.judges.findFirst({
      where: eq(judges.id, judgeId),
    });

    if (!judge) {
      return NextResponse.json(
        { success: false, error: "Judge not found" },
        { status: 404 }
      );
    }

    await db.delete(users).where(eq(users.id, judge.userId));

    return NextResponse.json({ success: true, data: { id: judgeId } });
  } catch (err: any) {
    if (err.message === "Unauthorized") {
      return NextResponse.json({ success: false, error: err.message }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, error: "Failed to delete judge" },
      { status: 500 }
    );
  }
}
