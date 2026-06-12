import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getNotifications, markAllNotificationsRead } from "@/lib/store";

export async function GET() {
  const user = await requireUser();
  const notifications = getNotifications(user.id);
  return NextResponse.json({
    notifications,
    unread: notifications.filter((n) => !n.read).length,
  });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const body = await req.json();
  if (body.action === "mark_all_read") {
    markAllNotificationsRead(user.id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
