import Link from "next/link";

const rows = [
  {
    category: "Account information",
    examples: "Email, display name, session identifiers",
    purpose: "Account access, authentication, support",
  },
  {
    category: "Profile and preferences",
    examples: "Age, location, values, interests, dealbreakers, notes, photos",
    purpose: "Persona building, matching, personalization",
  },
  {
    category: "Relationship activity",
    examples: "Matches, date feedback, plans, check-ins, household tasks, legacy chapters",
    purpose: "Product functionality and user-controlled memory",
  },
  {
    category: "Safety data",
    examples: "Reports, blocks, reasons, notes",
    purpose: "Safety filtering and admin review",
  },
  {
    category: "Analytics",
    examples: "Server-side product events",
    purpose: "Reliability, funnel understanding, product improvement",
  },
];

export default function DataSafetyPage() {
  return (
    <main className="min-h-screen bg-stone-50 px-4 py-10">
      <article className="max-w-4xl mx-auto bg-white border border-stone-100 rounded-lg p-6 space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">Store disclosure</p>
          <h1 className="text-3xl font-bold tracking-tight text-stone-950">Data Safety Summary</h1>
          <p className="text-sm text-stone-500 mt-2">Last updated: June 13, 2026</p>
        </div>

        <p className="text-sm text-stone-600 leading-relaxed">
          This page summarizes the product data categories Red String expects to disclose during store
          submission. Final answers should be reviewed against the deployed build, configured providers,
          and legal guidance.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-stone-100">
            <thead className="bg-stone-50 text-stone-500">
              <tr>
                <th className="text-left font-medium p-3 border-b border-stone-100">Category</th>
                <th className="text-left font-medium p-3 border-b border-stone-100">Examples</th>
                <th className="text-left font-medium p-3 border-b border-stone-100">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.category} className="border-b border-stone-100 last:border-b-0">
                  <td className="p-3 font-medium text-stone-800">{row.category}</td>
                  <td className="p-3 text-stone-600">{row.examples}</td>
                  <td className="p-3 text-stone-600">{row.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="grid sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-stone-100 bg-stone-50 p-4">
            <h2 className="text-sm font-semibold text-stone-900">User controls</h2>
            <p className="text-sm text-stone-500 mt-1">Export and account deletion are available in Settings.</p>
          </div>
          <div className="rounded-lg border border-stone-100 bg-stone-50 p-4">
            <h2 className="text-sm font-semibold text-stone-900">Sharing</h2>
            <p className="text-sm text-stone-500 mt-1">User content is used for product functionality, not sold.</p>
          </div>
          <div className="rounded-lg border border-stone-100 bg-stone-50 p-4">
            <h2 className="text-sm font-semibold text-stone-900">Providers</h2>
            <p className="text-sm text-stone-500 mt-1">Provider disclosures must be updated when real integrations are enabled.</p>
          </div>
        </section>

        <Link href="/privacy" className="inline-flex rounded-full bg-stone-900 text-white text-sm font-medium px-5 py-2 hover:bg-stone-700">
          Privacy Policy
        </Link>
      </article>
    </main>
  );
}
