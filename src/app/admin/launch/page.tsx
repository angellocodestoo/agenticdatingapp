"use client";

import { useState } from "react";

type LaunchItem = {
  id: string;
  label: string;
  status: "ready" | "needs_config" | "mock" | "manual_review";
  detail: string;
};

type LaunchSection = {
  id: string;
  label: string;
  items: LaunchItem[];
};

type LaunchReport = {
  generatedAt: string;
  summary: {
    ready: number;
    needsConfig: number;
    mock: number;
    manualReview: number;
  };
  sections: LaunchSection[];
};

const statusLabel: Record<LaunchItem["status"], string> = {
  ready: "Ready",
  needs_config: "Needs config",
  mock: "Mock",
  manual_review: "Review",
};

const statusClass: Record<LaunchItem["status"], string> = {
  ready: "bg-emerald-50 text-emerald-700 border-emerald-100",
  needs_config: "bg-red-50 text-red-700 border-red-100",
  mock: "bg-amber-50 text-amber-700 border-amber-100",
  manual_review: "bg-stone-50 text-stone-600 border-stone-200",
};

export default function AdminLaunchPage() {
  const [token, setToken] = useState("");
  const [report, setReport] = useState<LaunchReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    const res = await fetch("/api/admin/launch", {
      headers: { "x-admin-token": token },
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not load launch readiness");
      return;
    }
    setReport(data);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50 px-4 py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">Operations</p>
          <h1 className="text-2xl font-bold tracking-tight">Launch readiness</h1>
          <p className="text-sm text-stone-500 mt-1">
            A plain-language view of what is ready for App Store work, what is mocked, and what still needs review.
          </p>
        </div>

        <section className="bg-white border border-stone-100 rounded-lg p-5 space-y-3">
          <label className="text-sm font-medium text-stone-700">Admin token</label>
          <div className="grid sm:grid-cols-[1fr_auto] gap-2">
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ADMIN_TOKEN"
              className="min-w-0 rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
            />
            <button
              onClick={load}
              className="rounded-full bg-stone-900 text-white text-sm font-medium px-5 py-2 hover:bg-stone-700"
            >
              Load checklist
            </button>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </section>

        {report && (
          <>
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Ready", value: report.summary.ready },
                { label: "Needs config", value: report.summary.needsConfig },
                { label: "Mocked", value: report.summary.mock },
                { label: "Manual review", value: report.summary.manualReview },
              ].map((item) => (
                <div key={item.label} className="bg-white border border-stone-100 rounded-lg p-4">
                  <p className="text-2xl font-bold text-stone-900">{item.value}</p>
                  <p className="text-xs text-stone-400">{item.label}</p>
                </div>
              ))}
            </section>

            <section className="grid lg:grid-cols-2 gap-4">
              {report.sections.map((section) => (
                <div key={section.id} className="bg-white border border-stone-100 rounded-lg p-5 space-y-3">
                  <h2 className="text-sm font-semibold text-stone-800">{section.label}</h2>
                  <div className="space-y-2">
                    {section.items.map((item) => (
                      <div key={item.id} className="rounded-lg border border-stone-100 p-3 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-medium text-stone-800">{item.label}</p>
                          <span className={`text-xs rounded-full border px-2.5 py-1 ${statusClass[item.status]}`}>
                            {statusLabel[item.status]}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 leading-relaxed">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
