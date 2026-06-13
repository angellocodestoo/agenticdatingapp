"use client";

import { useState } from "react";

type ProviderReadiness = {
  id: string;
  label: string;
  category: "ai" | "notifications" | "logistics" | "identity";
  status: "configured" | "mock" | "missing";
  requiredEnv: string[];
  optionalEnv?: string[];
  productionUse: string;
  fallback: string;
};

type ProviderReport = {
  configured: number;
  mock: number;
  missing: number;
  providers: ProviderReadiness[];
};

const statusClass: Record<ProviderReadiness["status"], string> = {
  configured: "bg-emerald-50 text-emerald-700 border-emerald-100",
  mock: "bg-amber-50 text-amber-700 border-amber-100",
  missing: "bg-red-50 text-red-700 border-red-100",
};

export default function AdminProvidersPage() {
  const [token, setToken] = useState("");
  const [report, setReport] = useState<ProviderReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    const res = await fetch("/api/admin/providers", {
      headers: { "x-admin-token": token },
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not load provider readiness");
      return;
    }
    setReport(data);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50 px-4 py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">Operations</p>
          <h1 className="text-2xl font-bold tracking-tight">Provider readiness</h1>
          <p className="text-sm text-stone-500 mt-1">
            Credential-by-credential activation status for AI, notifications, places, calendar, and identity providers.
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
              Load providers
            </button>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </section>

        {report && (
          <>
            <section className="grid grid-cols-3 gap-3">
              {[
                { label: "Configured", value: report.configured },
                { label: "Mocked", value: report.mock },
                { label: "Missing", value: report.missing },
              ].map((item) => (
                <div key={item.label} className="bg-white border border-stone-100 rounded-lg p-4">
                  <p className="text-2xl font-bold text-stone-900">{item.value}</p>
                  <p className="text-xs text-stone-400">{item.label}</p>
                </div>
              ))}
            </section>

            <section className="grid lg:grid-cols-2 gap-4">
              {report.providers.map((provider) => (
                <div key={provider.id} className="bg-white border border-stone-100 rounded-lg p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-stone-900">{provider.label}</h2>
                      <p className="text-xs text-stone-400 capitalize">{provider.category}</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-xs ${statusClass[provider.status]}`}>
                      {provider.status}
                    </span>
                  </div>
                  <p className="text-sm text-stone-600 leading-relaxed">{provider.productionUse}</p>
                  <p className="text-xs text-stone-400">Fallback: {provider.fallback}</p>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-stone-500">Required env</p>
                    <div className="flex flex-wrap gap-1.5">
                      {provider.requiredEnv.map((env) => (
                        <span key={env} className="rounded-full bg-stone-50 border border-stone-100 px-2.5 py-1 text-xs text-stone-600">
                          {env}
                        </span>
                      ))}
                    </div>
                  </div>
                  {provider.optionalEnv && provider.optionalEnv.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-stone-500">Optional env</p>
                      <div className="flex flex-wrap gap-1.5">
                        {provider.optionalEnv.map((env) => (
                          <span key={env} className="rounded-full bg-stone-50 border border-stone-100 px-2.5 py-1 text-xs text-stone-500">
                            {env}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
