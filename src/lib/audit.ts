import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import type { AuditLog } from "@/db/schema";

type CreateAuditLogParams = {
  action: AuditLog["action"];
  actorId?: string;
  actorRole?: AuditLog["actorRole"];
  actorName?: string;
  targetId?: string;
  targetType?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
};

export async function createAuditLog(params: CreateAuditLogParams) {
  try {
    await db.insert(auditLogs).values(params);
  } catch (err) {
    // Audit log failure should never crash the main flow
    console.error("[AuditLog] Failed to write:", err);
  }
}
