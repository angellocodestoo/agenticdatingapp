import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  claimAccount,
  createSession,
  deleteSession,
  findUserByEmail,
  getCurrentUser,
  requireUser,
  verifyPassword,
} from "@/lib/auth";
import { trackEvent } from "@/lib/store";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      isGuest: !user.email,
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const action = body.action as string;

  if (action === "signup") {
    const email = String(body.email ?? "").toLowerCase().trim();
    const password = String(body.password ?? "");
    const displayName = body.displayName ? String(body.displayName) : undefined;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }
    if (findUserByEmail(email)) {
      return NextResponse.json({ error: "That email is already registered" }, { status: 409 });
    }
    // Claim the current guest account so onboarding progress carries over.
    const user = await requireUser();
    if (user.email) {
      return NextResponse.json({ error: "Already signed in" }, { status: 400 });
    }
    claimAccount(user.id, email, password, displayName);
    trackEvent(user.id, "signup_completed", { hasDisplayName: Boolean(displayName) });
    return NextResponse.json({
      user: { id: user.id, email, displayName: displayName ?? null, isGuest: false },
    });
  }

  if (action === "login") {
    const email = String(body.email ?? "").toLowerCase().trim();
    const password = String(body.password ?? "");
    const found = findUserByEmail(email);
    if (!found?.passwordHash || !verifyPassword(password, found.passwordHash)) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    const store = await cookies();
    const existing = store.get(SESSION_COOKIE)?.value;
    if (existing) deleteSession(existing);
    const token = createSession(found.id);
    store.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 90,
      secure: process.env.NODE_ENV === "production",
    });
    trackEvent(found.id, "login_completed");
    return NextResponse.json({
      user: { id: found.id, email: found.email, displayName: found.displayName, isGuest: false },
    });
  }

  if (action === "logout") {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (token) deleteSession(token);
    store.delete(SESSION_COOKIE);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
