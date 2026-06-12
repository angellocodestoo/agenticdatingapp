import type { NextRequest } from "next/server";

export function spotifyConfigured(): boolean {
  return Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

export function spotifyRedirectUri(req: NextRequest): string {
  return (
    process.env.SPOTIFY_REDIRECT_URI ??
    `${new URL(req.url).origin}/api/connect/spotify/callback`
  );
}
