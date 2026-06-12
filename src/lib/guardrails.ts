import { NextRequest, NextResponse } from "next/server";

declare global {
  var __redstringRateLimits:
    | Map<string, { count: number; resetAt: number }>
    | undefined;
}

type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

const BLOCKED_TEXT_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bchild\s*(?:porn|sexual|sex)\b/i, label: "sexual content involving minors" },
  { pattern: /\bunderage\s*(?:sex|sexual|hookup|dating)\b/i, label: "sexual content involving minors" },
  { pattern: /\b(?:rape|rapist)\b/i, label: "sexual violence" },
  { pattern: /\bkill\s+yourself\b/i, label: "self-harm harassment" },
  { pattern: /\b(?:dox|doxx|swat)\b/i, label: "targeted abuse" },
];

function bucket() {
  if (!globalThis.__redstringRateLimits) {
    globalThis.__redstringRateLimits = new Map();
  }
  return globalThis.__redstringRateLimits;
}

function clientKey(req: NextRequest, userId?: string): string {
  if (userId) return `user:${userId}`;
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip");
  return `ip:${forwarded || realIp || "unknown"}`;
}

export function enforceRateLimit(
  req: NextRequest,
  scope: string,
  options: RateLimitOptions,
  userId?: string
): NextResponse | null {
  const key = `${scope}:${clientKey(req, userId)}`;
  const now = Date.now();
  const limits = bucket();
  const current = limits.get(key);

  if (!current || current.resetAt <= now) {
    limits.set(key, { count: 1, resetAt: now + options.windowMs });
    return null;
  }

  if (current.count >= options.limit) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return NextResponse.json(
      { error: "Too many requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  current.count += 1;
  limits.set(key, current);
  return null;
}

export function moderateText(text: unknown): { ok: true } | { ok: false; error: string } {
  const value = String(text ?? "");
  for (const { pattern, label } of BLOCKED_TEXT_PATTERNS) {
    if (pattern.test(value)) {
      return { ok: false, error: `This text appears to include ${label}. Please revise it.` };
    }
  }
  return { ok: true };
}
