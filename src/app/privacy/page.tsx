import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-stone-50 px-4 py-10">
      <article className="max-w-3xl mx-auto bg-white border border-stone-100 rounded-lg p-6 space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">Launch policy</p>
          <h1 className="text-3xl font-bold tracking-tight text-stone-950">Privacy Policy</h1>
          <p className="text-sm text-stone-500 mt-2">Last updated: June 13, 2026</p>
        </div>

        <p className="text-sm text-stone-600 leading-relaxed">
          Red String stores the information you provide so your relationship agent can build a persona,
          screen matches, coordinate relationship and household workflows, and preserve legacy records.
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-stone-900">Data We Collect</h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            This includes profile basics, connected-source summaries, notes, photos, agent activity,
            match decisions, relationship and household records, safety reports, analytics events, and
            legacy chapters or anniversaries you create.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-stone-900">How We Use Data</h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            We use your data to operate the product, personalize recommendations, support safety review,
            improve reliability, and provide export or deletion controls. We do not sell personal data.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-stone-900">Your Controls</h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            You can export your data or delete your account from Settings. Deleting your account removes
            your local profile, sessions, relationship records, household records, notifications, safety
            events, analytics events, and legacy data.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-stone-900">Production Review</h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            This launch policy is a product placeholder and should be reviewed by qualified counsel
            before public App Store submission.
          </p>
        </section>

        <Link href="/settings" className="inline-flex rounded-full bg-stone-900 text-white text-sm font-medium px-5 py-2 hover:bg-stone-700">
          Privacy controls
        </Link>
      </article>
    </main>
  );
}
