import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { enforceRateLimit, moderateText } from "@/lib/guardrails";
import {
  createLegacyAnniversary,
  createLegacyChapter,
  getHouseholdsForUser,
  getLegacyAnniversaries,
  getLegacyChapters,
  getLegacyInsightSummary,
  getProfile,
} from "@/lib/store";
import type { LegacyAnniversaryKind, LegacyChapterStatus, LegacyChapterType } from "@/lib/types";

const CHAPTER_TYPES = new Set([
  "dating_era",
  "engagement",
  "wedding",
  "first_home",
  "family",
  "career_pivot",
  "move",
  "caregiving",
  "empty_nest",
  "retirement",
  "renewal",
  "custom",
]);
const CHAPTER_STATUSES = new Set(["active", "completed", "archived"]);
const ANNIVERSARY_KINDS = new Set([
  "first_date",
  "commitment",
  "engagement",
  "wedding",
  "renewal",
  "family",
  "custom",
]);

const text = (value: unknown, max = 240) => {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized.slice(0, max) : undefined;
};

const list = (value: unknown, maxItems = 5): string[] =>
  Array.isArray(value)
    ? value
        .map((item) => text(item, 160))
        .filter((item): item is string => Boolean(item))
        .slice(0, maxItems)
    : [];

export async function GET() {
  const user = await requireUser();
  const households = getHouseholdsForUser(user.id).map((entry) => {
    const partnerUserId = entry.household.partnerUserIds.find((id) => id !== user.id);
    const partnerName = partnerUserId ? getProfile(partnerUserId).persona?.displayName : undefined;
    return {
      ...entry,
      partnerName: partnerName ?? "Your partner",
      chapters: getLegacyChapters(user.id, entry.household.id).chapters ?? [],
      anniversaries: getLegacyAnniversaries(user.id, entry.household.id).anniversaries ?? [],
      legacyInsights: getLegacyInsightSummary(user.id, entry.household.id).summary ?? null,
    };
  });
  return NextResponse.json({ households });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const limited = enforceRateLimit(
    req,
    "legacy",
    { limit: 50, windowMs: 60 * 60 * 1000 },
    user.id
  );
  if (limited) return limited;

  const body = await req.json();
  const householdId = String(body.householdId ?? "");
  const mode = String(body.mode ?? "chapter");
  if (!householdId) {
    return NextResponse.json({ error: "householdId required" }, { status: 400 });
  }

  if (mode === "anniversary") {
    const title = text(body.title, 160);
    const date = text(body.date, 40);
    const ritual = text(body.ritual, 400);
    const reflectionPrompt = text(body.reflectionPrompt, 400);
    const check = moderateText(`${title ?? ""}\n${ritual ?? ""}\n${reflectionPrompt ?? ""}`);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
    if (!title || !date) {
      return NextResponse.json({ error: "Title and date required" }, { status: 400 });
    }
    const rawKind = String(body.kind ?? "custom");
    const result = createLegacyAnniversary(user.id, householdId, {
      kind: ANNIVERSARY_KINDS.has(rawKind) ? (rawKind as LegacyAnniversaryKind) : "custom",
      date,
      title,
      ritual,
      reflectionPrompt,
    });
    if (!result.anniversary) {
      return NextResponse.json(
        { error: result.error ?? "Could not save anniversary" },
        { status: 400 }
      );
    }
    return NextResponse.json({ anniversary: result.anniversary });
  }

  const title = text(body.title, 160);
  const gratitude = text(body.gratitude, 500);
  const highlights = list(body.highlights);
  const lessons = list(body.lessons);
  const check = moderateText(`${title ?? ""}\n${gratitude ?? ""}\n${highlights.join("\n")}\n${lessons.join("\n")}`);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
  if (!title) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }
  const rawType = String(body.type ?? "custom");
  const rawStatus = String(body.status ?? "active");
  const result = createLegacyChapter(user.id, householdId, {
    type: CHAPTER_TYPES.has(rawType) ? (rawType as LegacyChapterType) : "custom",
    status: CHAPTER_STATUSES.has(rawStatus) ? (rawStatus as LegacyChapterStatus) : "active",
    title,
    startedAt: text(body.startedAt, 40),
    endedAt: text(body.endedAt, 40),
    highlights,
    lessons,
    gratitude,
  });
  if (!result.chapter) {
    return NextResponse.json({ error: result.error ?? "Could not save chapter" }, { status: 400 });
  }
  return NextResponse.json({ chapter: result.chapter });
}
