import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getSettings, saveSettings, DEFAULT_SETTINGS } from "@/lib/store";

export async function GET() {
  const user = await requireUser();
  return NextResponse.json(getSettings(user.id));
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const body = await req.json();
  const current = getSettings(user.id);

  const threshold = Number(body.threshold ?? current.threshold);
  const poolSize = Number(body.poolSize ?? current.poolSize);
  const radiusMiles = Number(body.radiusMiles ?? current.radiusMiles);
  const rawPaused = body.paused ?? current.paused;
  const paused =
    typeof rawPaused === "string"
      ? rawPaused.toLowerCase() === "true"
      : Boolean(rawPaused);

  if (Number.isNaN(threshold) || threshold < 50 || threshold > 95) {
    return NextResponse.json(
      { error: "Threshold must be between 50 and 95" },
      { status: 400 }
    );
  }
  if (Number.isNaN(poolSize) || poolSize < 3 || poolSize > 12) {
    return NextResponse.json(
      { error: "Pool size must be between 3 and 12" },
      { status: 400 }
    );
  }

  if (Number.isNaN(radiusMiles) || radiusMiles < 2 || radiusMiles > 100) {
    return NextResponse.json(
      { error: "Radius must be between 2 and 100 miles" },
      { status: 400 }
    );
  }

  const saved = saveSettings(user.id, { threshold, poolSize, radiusMiles, paused });
  return NextResponse.json(saved);
}

export async function DELETE() {
  const user = await requireUser();
  return NextResponse.json(saveSettings(user.id, { ...DEFAULT_SETTINGS }));
}
