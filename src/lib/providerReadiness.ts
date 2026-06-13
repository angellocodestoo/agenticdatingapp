export type ProviderReadiness = {
  id: string;
  label: string;
  category: "ai" | "notifications" | "logistics" | "identity";
  status: "configured" | "mock" | "missing";
  requiredEnv: string[];
  optionalEnv?: string[];
  productionUse: string;
  fallback: string;
};

const has = (key: string) => Boolean(process.env[key]?.trim());
const all = (keys: string[]) => keys.every(has);

function provider(
  input: Omit<ProviderReadiness, "status"> & { mockWhenMissing?: boolean }
): ProviderReadiness {
  const configured = all(input.requiredEnv);
  return {
    ...input,
    status: configured ? "configured" : input.mockWhenMissing ? "mock" : "missing",
  };
}

export function getProviderReadiness(): ProviderReadiness[] {
  return [
    provider({
      id: "anthropic",
      label: "Anthropic Claude",
      category: "ai",
      requiredEnv: ["ANTHROPIC_API_KEY"],
      optionalEnv: ["ANTHROPIC_MODEL"],
      productionUse: "Persona generation and agent-to-agent conversation.",
      fallback: "Scripted local engine.",
      mockWhenMissing: true,
    }),
    provider({
      id: "spotify",
      label: "Spotify OAuth",
      category: "identity",
      requiredEnv: ["SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET"],
      optionalEnv: ["SPOTIFY_REDIRECT_URI"],
      productionUse: "Real listening signals for onboarding.",
      fallback: "Mock music profile.",
      mockWhenMissing: true,
    }),
    provider({
      id: "email",
      label: "Email notifications",
      category: "notifications",
      requiredEnv: ["RESEND_API_KEY"],
      optionalEnv: ["NOTIFICATION_FROM_EMAIL"],
      productionUse: "Account, invite, and relationship lifecycle email.",
      fallback: "Local mock notification provider.",
      mockWhenMissing: true,
    }),
    provider({
      id: "sms",
      label: "SMS and phone masking",
      category: "notifications",
      requiredEnv: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"],
      productionUse: "SMS reminders and masked warm-up call support.",
      fallback: "Mock phone numbers and no real outbound SMS.",
      mockWhenMissing: true,
    }),
    provider({
      id: "push",
      label: "Push notifications",
      category: "notifications",
      requiredEnv: ["PUSH_PROVIDER", "PUSH_API_KEY"],
      productionUse: "Native app notifications after store wrapper launch.",
      fallback: "In-app notification tray only.",
      mockWhenMissing: true,
    }),
    provider({
      id: "places",
      label: "Places provider",
      category: "logistics",
      requiredEnv: ["PLACES_PROVIDER", "PLACES_API_KEY"],
      productionUse: "Live venue search and date recommendations.",
      fallback: "Curated local mock venue recommendations.",
      mockWhenMissing: true,
    }),
    provider({
      id: "calendar",
      label: "Calendar availability",
      category: "logistics",
      requiredEnv: ["CALENDAR_PROVIDER", "CALENDAR_CLIENT_ID", "CALENDAR_CLIENT_SECRET"],
      productionUse: "Real availability windows for date and relationship planning.",
      fallback: "Deterministic mock availability windows.",
      mockWhenMissing: true,
    }),
  ];
}

export function getProviderReadinessSummary() {
  const providers = getProviderReadiness();
  return {
    configured: providers.filter((entry) => entry.status === "configured").length,
    mock: providers.filter((entry) => entry.status === "mock").length,
    missing: providers.filter((entry) => entry.status === "missing").length,
    providers,
  };
}
