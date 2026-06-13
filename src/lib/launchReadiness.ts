import { getRuntimeConfigReport } from "@/lib/config";
import { getNotificationProviderStatus } from "@/lib/notifications/providers";

export type LaunchReadinessItem = {
  id: string;
  label: string;
  status: "ready" | "needs_config" | "mock" | "manual_review";
  detail: string;
};

export type LaunchReadinessSection = {
  id: string;
  label: string;
  items: LaunchReadinessItem[];
};

const shippedArtifacts = new Set([
  "src/app/manifest.ts",
  "public/icons/icon-192.png",
  "public/icons/icon-512.png",
  "public/icons/icon-1024.png",
  "docs/screenshots/01-landing.png",
  "src/app/privacy/page.tsx",
  "src/app/terms/page.tsx",
  "src/app/api/privacy/route.ts",
  "docs/native-wrapper-decision.md",
  "docs/deployment-guide.md",
  "docs/app-store-readiness.md",
]);

function exists(relativePath: string): boolean {
  return shippedArtifacts.has(relativePath);
}

function item(
  id: string,
  label: string,
  status: LaunchReadinessItem["status"],
  detail: string
): LaunchReadinessItem {
  return { id, label, status, detail };
}

export function getLaunchReadinessReport(): {
  generatedAt: string;
  summary: {
    ready: number;
    needsConfig: number;
    mock: number;
    manualReview: number;
  };
  sections: LaunchReadinessSection[];
} {
  const config = getRuntimeConfigReport();
  const configByKey = new Map(config.map((entry) => [entry.key, entry]));
  const notifications = getNotificationProviderStatus();

  const sections: LaunchReadinessSection[] = [
    {
      id: "app_store_assets",
      label: "App Store Assets",
      items: [
        item(
          "manifest",
          "Install manifest",
          exists("src/app/manifest.ts") ? "ready" : "needs_config",
          "PWA manifest is present and linked from app metadata."
        ),
        item(
          "icons",
          "App icons",
          exists("public/icons/icon-192.png") &&
            exists("public/icons/icon-512.png") &&
            exists("public/icons/icon-1024.png")
            ? "ready"
            : "needs_config",
          "Requires 192, 512, and 1024 PNG icons."
        ),
        item(
          "screenshots",
          "Store screenshots",
          exists("docs/screenshots/01-landing.png") ? "manual_review" : "needs_config",
          "Existing product screenshots can seed listings, but final iOS/Android store frames still need manual capture."
        ),
      ],
    },
    {
      id: "trust",
      label: "Trust And Policy",
      items: [
        item(
          "privacy",
          "Privacy policy",
          exists("src/app/privacy/page.tsx") ? "manual_review" : "needs_config",
          "Route exists; legal counsel should review before public submission."
        ),
        item(
          "terms",
          "Terms of service",
          exists("src/app/terms/page.tsx") ? "manual_review" : "needs_config",
          "Route exists; legal counsel should review before public submission."
        ),
        item(
          "privacy_controls",
          "Export and deletion",
          exists("src/app/api/privacy/route.ts") ? "ready" : "needs_config",
          "Users can export data and delete accounts from Settings."
        ),
        item(
          "admin_safety",
          "Admin safety review",
          configByKey.get("ADMIN_TOKEN")?.status === "configured" ? "ready" : "needs_config",
          "Admin report review route and screen exist; set ADMIN_TOKEN before production."
        ),
      ],
    },
    {
      id: "providers",
      label: "Provider Readiness",
      items: [
        item(
          "llm",
          "LLM engine",
          configByKey.get("ANTHROPIC_API_KEY")?.status === "configured" ? "ready" : "mock",
          "Scripted engine remains available until Anthropic credentials are configured."
        ),
        item(
          "email",
          "Email notifications",
          notifications.email === "configured" ? "ready" : "mock",
          "Notification seam exists; configure RESEND_API_KEY for real email."
        ),
        item(
          "sms",
          "SMS and phone masking",
          notifications.sms === "configured" ? "ready" : "mock",
          "Configure Twilio credentials for real SMS and masked-call behavior."
        ),
        item(
          "places",
          "Places provider",
          configByKey.get("PLACES_PROVIDER")?.status === "configured" ? "ready" : "mock",
          "Venue recommendations use local mock data until places credentials are set."
        ),
        item(
          "calendar",
          "Calendar provider",
          configByKey.get("CALENDAR_PROVIDER")?.status === "configured" ? "ready" : "mock",
          "Availability uses deterministic mock windows until calendar OAuth is set."
        ),
      ],
    },
    {
      id: "native",
      label: "Native Store Path",
      items: [
        item(
          "wrapper_decision",
          "Native wrapper decision",
          exists("docs/native-wrapper-decision.md") ? "manual_review" : "needs_config",
          "Decision doc should be reviewed before creating the iOS/Android shell."
        ),
        item(
          "deployment",
          "Deployment guide",
          exists("docs/deployment-guide.md") ? "manual_review" : "needs_config",
          "Deployment guide exists; production host and secrets still need to be chosen."
        ),
        item(
          "store_checklist",
          "Store checklist",
          exists("docs/app-store-readiness.md") ? "manual_review" : "needs_config",
          "Checklist tracks the remaining manual submission work."
        ),
      ],
    },
  ];

  const items = sections.flatMap((section) => section.items);
  return {
    generatedAt: new Date().toISOString(),
    summary: {
      ready: items.filter((entry) => entry.status === "ready").length,
      needsConfig: items.filter((entry) => entry.status === "needs_config").length,
      mock: items.filter((entry) => entry.status === "mock").length,
      manualReview: items.filter((entry) => entry.status === "manual_review").length,
    },
    sections,
  };
}
