"use client";

import { useState } from "react";

type SafetyReview = {
  event: {
    id: string;
    userId: string;
    candidateId: string;
    action: "block" | "report";
    reason?: string;
    notes?: string;
    createdAt: number;
  };
  status: "open" | "reviewed" | "action_taken";
  reviewedBy?: string;
  reviewedAt?: number;
  notes?: string;
};

export default function AdminSafetyPage() {
  const [token, setToken] = useState("");
  const [reports, setReports] = useState<SafetyReview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    setError(null);
    const res = await fetch("/api/admin/safety", {
      headers: { "x-admin-token": token },
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not load reports");
      return;
    }
    setReports(data.reports ?? []);
    setLoaded(true);
  }

  async function review(id: string, status: SafetyReview["status"]) {
    const res = await fetch("/api/admin/safety", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ safetyEventId: id, status, reviewedBy: "admin" }),
    });
    if (res.ok) load();
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50 px-4 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">Operations</p>
          <h1 className="text-2xl font-bold tracking-tight">Safety review</h1>
          <p className="text-sm text-stone-500 mt-1">
            Review reports and blocks before launch operations scale up.
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
              Load queue
            </button>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </section>

        <section className="space-y-3">
          {!loaded ? (
            <p className="text-sm text-stone-500">Enter the admin token to load safety reports.</p>
          ) : reports.length === 0 ? (
            <div className="bg-white border border-stone-100 rounded-lg p-6 text-center">
              <p className="text-sm text-stone-500">No safety events in the queue.</p>
            </div>
          ) : (
            reports.map((report) => (
              <div key={report.event.id} className="bg-white border border-stone-100 rounded-lg p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-stone-800 capitalize">{report.event.action}</p>
                    <p className="text-xs text-stone-400">
                      {new Date(report.event.createdAt).toLocaleString()} - {report.status}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => review(report.event.id, "reviewed")}
                      className="rounded-full border border-stone-200 px-3 py-1.5 text-xs text-stone-600 hover:border-stone-300"
                    >
                      Mark reviewed
                    </button>
                    <button
                      onClick={() => review(report.event.id, "action_taken")}
                      className="rounded-full bg-rose-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-600"
                    >
                      Action taken
                    </button>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3 text-xs text-stone-500">
                  <p>User: {report.event.userId}</p>
                  <p>Candidate: {report.event.candidateId}</p>
                </div>
                {report.event.reason && <p className="text-sm text-stone-600">Reason: {report.event.reason}</p>}
                {report.event.notes && <p className="text-sm text-stone-600">Notes: {report.event.notes}</p>}
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
