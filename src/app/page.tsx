import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-br from-stone-50 via-red-50 to-rose-50 relative overflow-hidden">
      {/* The red string drifts across the hero, tying a loose knot mid-page. */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <path
          d="M -50 620 C 200 560, 280 420, 430 430 C 560 440, 560 560, 470 545 C 390 530, 430 400, 600 380 C 780 360, 820 460, 980 300 C 1080 200, 1150 220, 1260 140"
          stroke="#dc2626"
          strokeWidth="2.5"
          fill="none"
          opacity="0.35"
          strokeLinecap="round"
        />
      </svg>

      <div className="relative max-w-2xl w-full text-center space-y-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 text-red-600 text-sm font-medium tracking-wide uppercase">
            <svg width="22" height="14" viewBox="0 0 34 20" fill="none" aria-hidden>
              <path
                d="M2 16 C 9 12, 8 5, 15 6 C 21 7, 20 13, 15 12 C 10 11, 14 4, 22 4 C 27 4, 29 6, 32 3"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </svg>
            Red String
            <svg width="22" height="14" viewBox="0 0 34 20" fill="none" aria-hidden style={{ transform: "scaleX(-1)" }}>
              <path
                d="M2 16 C 9 12, 8 5, 15 6 C 21 7, 20 13, 15 12 C 10 11, 14 4, 22 4 C 27 4, 29 6, 32 3"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h1 className="text-5xl font-semibold tracking-tight text-stone-900 leading-tight">
            Your agent finds<br />your person.
          </h1>
          <p className="text-lg text-stone-500 max-w-xl mx-auto leading-relaxed">
            Legend says an invisible red thread ties you to your destined partner — it can
            stretch and tangle, but never break. The Red String network brings this legend
            to life. Your private AI agent securely maps your world, communicates with other
            agents behind closed doors, and only surfaces the connections worth your evening.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/onboarding"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-red-600 text-white px-8 py-3.5 text-sm font-medium hover:bg-red-700 transition-colors shadow-sm"
          >
            Reveal my string
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>

        <div className="pt-4 grid grid-cols-3 gap-6 border-t border-stone-200">
          {[
            { step: "01", title: "Anchoring the Thread", desc: "Connect your digital life — Calendar, Spotify, and LinkedIn. Your agent builds a deeply private, high-signal blueprint of who you actually are, away from the noise." },
            { step: "02", title: "Tracing the Path", desc: "Your agent quietly screens the network, interviews the agents of compatible partners, and rigorously filters for scheduling, value, and lifestyle alignment." },
            { step: "03", title: "The Intersection", desc: "No endless chatting. You receive a verified match report, a confirmed reservation on your calendar, and a seamless introduction. Your agent handles the logistics; you enjoy the chemistry." },
          ].map((item) => (
            <div key={item.step} className="text-left space-y-1">
              <div className="text-xs font-mono text-red-500">{item.step}</div>
              <div className="text-sm font-medium text-stone-800">{item.title}</div>
              <div className="text-xs text-stone-500 leading-relaxed">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
