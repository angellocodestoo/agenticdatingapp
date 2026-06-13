import Link from "next/link";

export default function SafetyPage() {
  return (
    <main className="min-h-screen bg-stone-50 px-4 py-10">
      <article className="max-w-3xl mx-auto bg-white border border-stone-100 rounded-lg p-6 space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">Safety</p>
          <h1 className="text-3xl font-bold tracking-tight text-stone-950">Community Safety Standards</h1>
          <p className="text-sm text-stone-500 mt-2">Last updated: June 13, 2026</p>
        </div>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-stone-900">Core Standard</h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            Red String is built for consent, clarity, and slower, safer relationship decisions. Users
            should not harass, threaten, impersonate, manipulate, exploit, stalk, dox, or pressure other
            people.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-stone-900">Report And Block</h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            Match surfaces include report and block actions. Blocking removes the person from future agent
            runs and can disable relationship or household spaces tied to that person. Reports are stored
            for admin review.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-stone-900">What We Review</h2>
          <ul className="list-disc pl-5 text-sm text-stone-600 space-y-1">
            <li>Harassment or threats.</li>
            <li>Fraud, impersonation, or coercive behavior.</li>
            <li>Sexual pressure or non-consensual behavior.</li>
            <li>Spam, scams, or platform abuse.</li>
            <li>Content that appears unsafe for dating, relationship, or household workflows.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-stone-900">Emergency Limits</h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            Red String does not provide emergency response. If you believe you or someone else is in
            immediate danger, contact local emergency services or a trusted crisis resource.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-stone-900">Private Testing</h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            Before public launch, safety reports should be reviewed through the protected admin queue at
            `/admin/safety`, and escalation procedures should be tested with non-production accounts.
          </p>
        </section>

        <Link href="/support" className="inline-flex rounded-full bg-stone-900 text-white text-sm font-medium px-5 py-2 hover:bg-stone-700">
          Support
        </Link>
      </article>
    </main>
  );
}
