import Link from "next/link";

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-stone-50 px-4 py-10">
      <article className="max-w-3xl mx-auto bg-white border border-stone-100 rounded-lg p-6 space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">Support</p>
          <h1 className="text-3xl font-bold tracking-tight text-stone-950">Red String Support</h1>
          <p className="text-sm text-stone-500 mt-2">
            Help for account access, privacy controls, safety reports, and launch feedback.
          </p>
        </div>

        <section className="grid sm:grid-cols-2 gap-3">
          {[
            {
              title: "Account and data",
              body: "Export your data, delete your account, or create a saved account from Settings.",
              href: "/settings",
            },
            {
              title: "Safety",
              body: "Use in-app report and block tools for match concerns. If you are in immediate danger, contact local emergency services.",
              href: "/safety",
            },
            {
              title: "Privacy",
              body: "Review what Red String stores and how export/delete controls work.",
              href: "/privacy",
            },
            {
              title: "Terms",
              body: "Review product limits, responsible use, and launch-stage terms.",
              href: "/terms",
            },
          ].map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="rounded-lg border border-stone-100 bg-stone-50 p-4 hover:border-rose-100 hover:bg-rose-50"
            >
              <h2 className="text-sm font-semibold text-stone-900">{item.title}</h2>
              <p className="text-sm text-stone-500 mt-1 leading-relaxed">{item.body}</p>
            </Link>
          ))}
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-stone-900">Contact</h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            For launch support, use the support contact configured in the App Store or Google Play
            listing. During private testing, include your account email, device, browser, and the route
            where the issue happened.
          </p>
        </section>

        <section className="rounded-lg bg-amber-50 border border-amber-100 p-4">
          <h2 className="text-sm font-semibold text-amber-900">Safety note</h2>
          <p className="text-sm text-amber-800 mt-1 leading-relaxed">
            Red String is not an emergency service, crisis line, therapy provider, legal advisor, or law
            enforcement channel.
          </p>
        </section>
      </article>
    </main>
  );
}
