import { NextResponse } from "next/server";
import { getLaunchReadiness } from "@/lib/config";
import { getDb } from "@/lib/db";
import { getNotificationProviderStatus } from "@/lib/notifications/providers";

export async function GET() {
  let database: "ok" | "error" = "ok";
  try {
    getDb().prepare("SELECT 1").get();
  } catch {
    database = "error";
  }

  const readiness = getLaunchReadiness();
  const ok = database === "ok";

  return NextResponse.json(
    {
      ok,
      status: ok ? (readiness.ready ? "ready" : "needs_configuration") : "database_error",
      checkedAt: new Date().toISOString(),
      service: "red-string",
      database,
      readiness,
      notifications: getNotificationProviderStatus(),
    },
    { status: ok ? 200 : 503 }
  );
}
