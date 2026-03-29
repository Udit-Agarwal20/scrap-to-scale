import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users, adminSessions, judges } from "@/db/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "scrap-to-scale-jwt-secret-change-in-prod"
);

export type SessionPayload = {
  userId: string;
  role: "admin" | "judge" | "member" | "audience";
  judgeId?: string;
  name: string;
};

// ─── Token Creation ───────────────────────────────────────────────────────────

export async function createToken(payload: SessionPayload, expiresIn = "24h") {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

// ─── Session Helpers ──────────────────────────────────────────────────────────

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAuth(
  allowedRoles?: SessionPayload["role"][]
): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    throw new Error("Forbidden");
  }
  return session;
}

// ─── Judge Token Verification ─────────────────────────────────────────────────

export async function verifyJudgeToken(accessToken: string) {
  const judge = await db.query.judges.findFirst({
    where: eq(judges.accessToken, accessToken),
    with: { user: true },
  });

  if (!judge || !judge.user.isActive) return null;
  return judge;
}

// ─── Admin Login ──────────────────────────────────────────────────────────────

export async function createAdminSession(userId: string) {
  const { SignJWT } = await import("jose");
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("8h")
    .sign(JWT_SECRET);

  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

  await db.insert(adminSessions).values({
    userId,
    token,
    expiresAt,
  });

  return token;
}

// ─── Voter Fingerprint ────────────────────────────────────────────────────────

export function generateVoterFingerprint(
  ip: string,
  userAgent: string,
  teamId: string
): string {
  // Simple hash for demo; use a proper fingerprinting library in production
  const raw = `${ip}-${userAgent}-${teamId}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `fp_${Math.abs(hash).toString(36)}`;
}
