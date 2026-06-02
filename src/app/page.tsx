import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-br from-stone-50 via-rose-50 to-amber-50">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 text-rose-500 text-sm font-medium tracking-wide uppercase">
            <span className="w-8 h-px bg-rose-300 inline-block" />
            Agentic Dating
            <span className="w-8 h-px bg-rose-300 inline-block" />
          </div>
          <h1 className="text-5xl font-semibold tracking-tight text-stone-900 leading-tight">
            Your agent finds<br />your person.
          </h1>
          <p className="text-lg text-stone-500 max-w-md mx-auto leading-relaxed">
            Too busy for dating apps that go nowhere? Your AI agent learns who you really are,
            talks to other agents, and only surfaces dates worth having.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/onboarding"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-rose-500 text-white px-8 py-3.5 text-sm font-medium hover:bg-rose-600 transition-colors shadow-sm"
          >
            Build my profile
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>

        <div className="pt-4 grid grid-cols-3 gap-6 border-t border-stone-200">
          {[
            { step: "01", title: "Connect your life", desc: "Calendar, Spotify, LinkedIn. Your agent builds your real profile." },
            { step: "02", title: "Agent goes out", desc: "Send your agent out. It evaluates everyone, runs conversations, and picks your best match." },
            { step: "03", title: "Date is set", desc: "You get a match report, a booked date, and a warm-up call — all done for you." },
          ].map((item) => (
            <div key={item.step} className="text-left space-y-1">
              <div className="text-xs font-mono text-rose-400">{item.step}</div>
              <div className="text-sm font-medium text-stone-800">{item.title}</div>
              <div className="text-xs text-stone-500 leading-relaxed">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
