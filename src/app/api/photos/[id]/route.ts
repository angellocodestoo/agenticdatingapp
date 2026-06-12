import { NextRequest } from "next/server";
import path from "node:path";
import fs from "node:fs";
import { requireUser } from "@/lib/auth";
import { getProfile } from "@/lib/store";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

/** Serves the current user's own photos. Photos are private to their owner. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;
  const photo = (getProfile(user.id).photos ?? []).find((p) => p.id === id);
  if (!photo) return new Response("Not found", { status: 404 });

  const filePath = path.join(UPLOAD_DIR, photo.filename);
  if (!fs.existsSync(filePath)) return new Response("Not found", { status: 404 });

  const ext = path.extname(photo.filename);
  return new Response(new Uint8Array(fs.readFileSync(filePath)), {
    headers: {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
