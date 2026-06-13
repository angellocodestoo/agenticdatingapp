import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getHouseholdInsightSummary } from "@/lib/store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;
  const result = getHouseholdInsightSummary(user.id, id);
  if (!result.summary) {
    return NextResponse.json(
      { error: result.error ?? "Could not load household insights" },
      { status: 400 }
    );
  }
  return NextResponse.json({ summary: result.summary });
}
