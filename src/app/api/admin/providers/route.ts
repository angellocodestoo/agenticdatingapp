import { NextRequest, NextResponse } from "next/server";
import { getProviderReadinessSummary } from "@/lib/providerReadiness";

function authorized(req: NextRequest): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  return req.headers.get("x-admin-token") === expected;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Admin token required" }, { status: 401 });
  }

  return NextResponse.json(getProviderReadinessSummary());
}
