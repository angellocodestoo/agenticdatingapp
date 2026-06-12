import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { getProfile, updateProfile } from "@/lib/store";
import { spotifyRedirectUri } from "@/lib/spotify";

type SpotifyArtist = { name: string; genres: string[] };

/** Rough mood read from genre mix — good enough for the persona builder. */
function deriveMood(genres: string[]): string {
  const g = genres.join(" ").toLowerCase();
  const calm = /(ambient|classical|jazz|acoustic|lo-fi|folk)/.test(g);
  const energetic = /(edm|house|techno|hip hop|rap|punk|metal|dance)/.test(g);
  const introspective = /(indie|singer-songwriter|alternative|shoegaze|soul)/.test(g);
  if (calm && energetic) return "wide-ranging — calm focus with high-energy peaks";
  if (calm) return "calm & focused";
  if (energetic) return "high-energy & social";
  if (introspective) return "introspective with upbeat moments";
  return "eclectic & curious";
}

export async function GET(req: NextRequest) {
  const user = await requireUser();
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const store = await cookies();
  const expected = store.get("spotify_oauth_state")?.value;
  store.delete("spotify_oauth_state");

  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/onboarding?spotify_error=${encodeURIComponent(reason)}`, url.origin));

  if (!code || !state || state !== expected) {
    return fail("Spotify connection was cancelled or invalid — try again.");
  }

  // Exchange the code for an access token.
  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: spotifyRedirectUri(req),
    }),
  });
  if (!tokenRes.ok) return fail("Spotify token exchange failed.");
  const { access_token } = await tokenRes.json();

  const topRes = await fetch(
    "https://api.spotify.com/v1/me/top/artists?limit=10&time_range=medium_term",
    { headers: { Authorization: `Bearer ${access_token}` } }
  );
  if (!topRes.ok) return fail("Could not read your top artists.");
  const top = (await topRes.json()) as { items: SpotifyArtist[] };

  const topArtists = top.items.map((a) => a.name).slice(0, 8);
  const genreCounts = new Map<string, number>();
  for (const a of top.items) {
    for (const g of a.genres) genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1);
  }
  const topGenres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([g]) => g);

  const profile = getProfile(user.id);
  updateProfile(user.id, {
    spotifyData: {
      topArtists,
      topGenres,
      listeningMood: deriveMood(topGenres),
      fetchedAt: Date.now(),
    },
    connectedSources: profile.connectedSources.includes("spotify")
      ? profile.connectedSources
      : [...profile.connectedSources, "spotify"],
  });

  return NextResponse.redirect(new URL("/onboarding?spotify=connected", url.origin));
}
