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
const MIN_DIMENSION = 240;
const MAX_DIMENSION = 6000;
const ALLOWED: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

function readPngSize(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 24 || buffer.toString("hex", 0, 8) !== "89504e470d0a1a0a") return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function readJpegSize(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc3) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

function readWebpSize(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 30 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = buffer.toString("ascii", 12, 16);
  if (chunk === "VP8X" && buffer.length >= 30) {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }
  if (chunk === "VP8 " && buffer.length >= 30) {
    return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === "VP8L" && buffer.length >= 25) {
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
}

function imageSize(type: string, buffer: Buffer): { width: number; height: number } | null {
  if (type === "image/png") return readPngSize(buffer);
  if (type === "image/jpeg") return readJpegSize(buffer);
  if (type === "image/webp") return readWebpSize(buffer);
  return null;
}

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
  const bytes = Buffer.from(await file.arrayBuffer());
  const size = imageSize(file.type, bytes);
  if (!size) {
    return NextResponse.json({ error: "That image file could not be read" }, { status: 400 });
  }
  if (
    size.width < MIN_DIMENSION ||
    size.height < MIN_DIMENSION ||
    size.width > MAX_DIMENSION ||
    size.height > MAX_DIMENSION
  ) {
    return NextResponse.json(
      { error: `Photo dimensions must be between ${MIN_DIMENSION}px and ${MAX_DIMENSION}px` },
      { status: 400 }
    );
  }
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), bytes);

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
