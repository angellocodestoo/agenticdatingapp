export type RuntimeCheck = {
  key: string;
  label: string;
  status: "configured" | "missing" | "mock" | "optional";
  detail: string;
};

const has = (key: string) => Boolean(process.env[key]?.trim());

export function getPublicOrigin(): string {
  return (
    process.env.APP_PUBLIC_ORIGIN?.trim() ??
    process.env.NEXT_PUBLIC_APP_URL?.trim() ??
    "http://localhost:3000"
  );
}

export function getRuntimeConfigReport(): RuntimeCheck[] {
  return [
    {
      key: "APP_PUBLIC_ORIGIN",
      label: "Public origin",
      status: has("APP_PUBLIC_ORIGIN") || has("NEXT_PUBLIC_APP_URL") ? "configured" : "missing",
      detail: "Needed for OAuth redirects, store metadata, and absolute notification links.",
    },
    {
      key: "REDSTRING_DB_FILE",
      label: "Database path",
      status: has("REDSTRING_DB_FILE") ? "configured" : "optional",
      detail: "Defaults to ./data/redstring.db when not set. Keep the file under ./data for clean deployment packaging.",
    },
    {
      key: "ADMIN_TOKEN",
      label: "Admin safety token",
      status: has("ADMIN_TOKEN") ? "configured" : "missing",
      detail: "Required before using admin safety review routes in production.",
    },
    {
      key: "CAPACITOR_SERVER_URL",
      label: "Native shell URL",
      status: has("CAPACITOR_SERVER_URL") ? "configured" : "missing",
      detail: "Required before syncing release iOS/Android shells to the deployed production origin.",
    },
    {
      key: "ANTHROPIC_API_KEY",
      label: "LLM engine",
      status: has("ANTHROPIC_API_KEY") ? "configured" : "mock",
      detail: "Without this, persona and agent flows use the scripted local engine.",
    },
    {
      key: "SPOTIFY_CLIENT_ID",
      label: "Spotify OAuth",
      status: has("SPOTIFY_CLIENT_ID") && has("SPOTIFY_CLIENT_SECRET") ? "configured" : "mock",
      detail: "Without this, onboarding falls back to mock listening signals.",
    },
    {
      key: "RESEND_API_KEY",
      label: "Email notifications",
      status: has("RESEND_API_KEY") ? "configured" : "mock",
      detail: "The notification provider will log locally until credentials are added.",
    },
    {
      key: "TWILIO_ACCOUNT_SID",
      label: "SMS and phone masking",
      status:
        has("TWILIO_ACCOUNT_SID") && has("TWILIO_AUTH_TOKEN") && has("TWILIO_FROM_NUMBER")
          ? "configured"
          : "mock",
      detail: "Needed for real SMS and masked-call production behavior.",
    },
    {
      key: "PLACES_PROVIDER",
      label: "Places provider",
      status: has("PLACES_PROVIDER") && has("PLACES_API_KEY") ? "configured" : "mock",
      detail: "Date venues use local mock data until a provider is configured.",
    },
    {
      key: "CALENDAR_PROVIDER",
      label: "Calendar provider",
      status: has("CALENDAR_PROVIDER") && has("CALENDAR_CLIENT_ID") ? "configured" : "mock",
      detail: "Availability uses deterministic mock windows until OAuth is added.",
    },
  ];
}

export function getLaunchReadiness() {
  const checks = getRuntimeConfigReport();
  const missing = checks.filter((check) => check.status === "missing");
  return {
    ready: missing.length === 0,
    missing: missing.map((check) => check.key),
    checks,
  };
}
