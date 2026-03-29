import { NextRequest, NextResponse } from "next/server";
import { verifyJudgeToken, createToken } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { db } from "@/db";
import { judges } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { accessToken } = await req.json();

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: "Access token required" },
        { status: 400 }
      );
    }

    const judge = await verifyJudgeToken(accessToken);

    if (!judge) {
      return NextResponse.json(
        { success: false, error: "Invalid or inactive judge token" },
        { status: 401 }
      );
    }

    const token = await createToken({
      userId: judge.userId,
      role: "judge",
      judgeId: judge.id,
      name: judge.name,
    });

    // Update last active
    await db
      .update(judges)
      .set({ lastActiveAt: new Date() })
      .where(eq(judges.id, judge.id));

    await createAuditLog({
      action: "judge_login",
      actorId: judge.userId,
      actorRole: "judge",
      actorName: judge.name,
      metadata: { judgeId: judge.id },
      ipAddress: req.headers.get("x-forwarded-for") ?? req.ip,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        judgeId: judge.id,
        name: judge.name,
        title: judge.title,
        organization: judge.organization,
        remainingBudget: judge.remainingBudget,
      },
    });

    response.cookies.set("judge_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 12 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("[Judge Auth]", err);
    return NextResponse.json(
      { success: false, error: "Authentication failed" },
      { status: 500 }
    );
  }
}
