import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teams } from "@/db/schema";
import { asc } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const cookieStore = cookies();
  const token =
    cookieStore.get("judge_session")?.value ??
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload || payload.role !== "judge") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const allTeams = await db.query.teams.findMany({
    orderBy: [asc(teams.presentationOrder)],
    columns: {
      id: true,
      teamNumber: true,
      name: true,
      members: true,
      scrapItemReceived: true,
      productIdea: true,
      productDescription: true,
      websiteUrl: true,
      status: true,
      votingStatus: true,
      presentationOrder: true,
    },
  });

  return NextResponse.json({ success: true, data: allTeams });
}
