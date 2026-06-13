import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getRelationshipInsightSummary } from "@/lib/store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;
  const result = getRelationshipInsightSummary(user.id, id);
  if (!result.summary) {
    return NextResponse.json(
      { error: result.error ?? "Could not load relationship insights" },
      { status: 400 }
    );
  }
  return NextResponse.json({ summary: result.summary });
}
