import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import { requireUser } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/guardrails";
import { getProfile, updateProfile } from "@/lib/store";
import type { UserPhoto } from "@/lib/types";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
const MAX_PHOTOS = 6;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export async function GET() {
  const user = await requireUser();
  return NextResponse.json({ photos: getProfile(user.id).photos ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const limited = enforceRateLimit(
    req,
    "photo_upload",
    { limit: 20, windowMs: 60 * 60 * 1000 },
    user.id
  );
  if (limited) return limited;
  const contentType = req.headers.get("content-type") ?? "";

  // JSON body → management actions (make primary, delete handled below in DELETE).
  if (contentType.includes("application/json")) {
    const body = await req.json();
    if (body.action === "make_primary") {
      const profile = getProfile(user.id);
      const photos = profile.photos ?? [];
      const target = photos.find((p) => p.id === body.id);
      if (!target) return NextResponse.json({ error: "Photo not found" }, { status: 404 });
      updateProfile(user.id, {
        photos: [target, ...photos.filter((p) => p.id !== body.id)],
      });
      return NextResponse.json({ photos: getProfile(user.id).photos });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  // Multipart → upload.
  const form = await req.formData();
  const file = form.get("photo");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No photo in request" }, { status: 400 });
  }
  const ext = ALLOWED[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Use a JPEG, PNG, or WebP image" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Photo must be under 5MB" }, { status: 400 });
  }

  const profile = getProfile(user.id);
  const photos = profile.photos ?? [];
  if (photos.length >= MAX_PHOTOS) {
    return NextResponse.json({ error: `Maximum ${MAX_PHOTOS} photos` }, { status: 400 });
  }

  const id = `ph_${randomBytes(6).toString("hex")}`;
  const filename = `${user.id}_${id}${ext}`;
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), Buffer.from(await file.arrayBuffer()));

  const photo: UserPhoto = { id, filename, addedAt: Date.now() };
  updateProfile(user.id, { photos: [...photos, photo] });
  return NextResponse.json({ photos: getProfile(user.id).photos });
}

export async function DELETE(req: NextRequest) {
  const user = await requireUser();
  const id = new URL(req.url).searchParams.get("id");
  const profile = getProfile(user.id);
  const photos = profile.photos ?? [];
  const target = photos.find((p) => p.id === id);
  if (!target) return NextResponse.json({ error: "Photo not found" }, { status: 404 });

  try {
    fs.unlinkSync(path.join(UPLOAD_DIR, target.filename));
  } catch {
    // File already gone — still remove the record.
  }
  updateProfile(user.id, { photos: photos.filter((p) => p.id !== id) });
  return NextResponse.json({ photos: getProfile(user.id).photos });
}
