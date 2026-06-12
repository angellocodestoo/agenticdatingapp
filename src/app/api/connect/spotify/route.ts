import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { requireUser } from "@/lib/auth";
import { spotifyConfigured, spotifyRedirectUri } from "@/lib/spotify";

/**
 * GET ?status=1 → whether real OAuth is configured.
 * GET           → redirect into Spotify's authorize flow.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  if (url.searchParams.get("status")) {
    return NextResponse.json({ configured: spotifyConfigured() });
  }

  if (!spotifyConfigured()) {
    return NextResponse.json(
      { error: "Spotify OAuth not configured. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET." },
      { status: 501 }
    );
  }

  await requireUser(); // ensure a session exists before we leave the site

  const state = randomBytes(16).toString("hex");
  const store = await cookies();
  store.set("spotify_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
    secure: process.env.NODE_ENV === "production",
  });

  const authorize = new URL("https://accounts.spotify.com/authorize");
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("client_id", process.env.SPOTIFY_CLIENT_ID!);
  authorize.searchParams.set("scope", "user-top-read");
  authorize.searchParams.set("redirect_uri", spotifyRedirectUri(req));
  authorize.searchParams.set("state", state);
  return NextResponse.redirect(authorize.toString());
}
