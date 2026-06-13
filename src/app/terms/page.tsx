export default function TermsPage() {
  return (
    <main className="min-h-screen bg-stone-50 px-4 py-10">
      <article className="max-w-3xl mx-auto bg-white border border-stone-100 rounded-lg p-6 space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">Launch policy</p>
          <h1 className="text-3xl font-bold tracking-tight text-stone-950">Terms of Service</h1>
          <p className="text-sm text-stone-500 mt-2">Last updated: June 13, 2026</p>
        </div>

        <p className="text-sm text-stone-600 leading-relaxed">
          Red String is a relationship coordination product. It can help organize dating, relationship,
          household, and legacy workflows, but it does not replace personal judgment, emergency services,
          therapy, legal advice, medical advice, financial advice, or professional counseling.
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-stone-900">Responsible Use</h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            You agree to provide accurate information, respect consent, avoid harassment or abuse, and
            use safety reporting tools honestly. Matches, recommendations, and prompts are suggestions,
            not guarantees.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-stone-900">Safety</h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            If you feel unsafe, contact local emergency services or trusted support. Red String safety
            tools can block, report, and review activity, but they are not emergency response systems.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-stone-900">Service Changes</h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            Features may change as the product moves from prototype to production. Provider integrations,
            mobile wrappers, and store distribution may require additional terms before launch.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-stone-900">Production Review</h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            These terms are a product placeholder and should be reviewed by qualified counsel before
            public App Store submission.
          </p>
        </section>
      </article>
    </main>
  );
}
