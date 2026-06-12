"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AppNotification } from "@/lib/types";

const LINKS: Array<{ href: string; label: string }> = [
  { href: "/onboarding", label: "Profile" },
  { href: "/persona", label: "Persona" },
  { href: "/agent-run", label: "Agent" },
  { href: "/history", label: "Dates" },
  { href: "/insights", label: "Insights" },
  { href: "/settings", label: "Settings" },
];

type AuthUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  isGuest: boolean;
};

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const NOTIF_ICON: Record<AppNotification["type"], string> = {
  match_found: "💘",
  proposal_accepted: "📅",
  call_reminder: "📞",
  feedback_request: "🔁",
  agent_update: "🤖",
};

export default function AppNav() {
  const pathname = usePathname();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        setNotifications(data.notifications ?? []);
        setUnread(data.unread ?? 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    fetch("/api/auth")
      .then((r) => r.json())
      .then((data) => setUser(data.user))
      .catch(() => {});
    const interval = setInterval(refresh, 20000);
    return () => clearInterval(interval);
  }, [refresh, pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function openPanel() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_all_read" }),
      });
      setUnread(0);
    }
  }

  // The landing page has its own hero design; keep nav off it.
  if (pathname === "/") return null;

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-stone-100">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-1.5 font-bold text-red-600 tracking-tight">
          <svg width="18" height="18" viewBox="0 0 34 34" fill="none" aria-hidden="true">
            <path
              d="M3 26 C 10 20, 8 12, 15 13 C 21 14, 20 21, 15 20 C 10 19, 13 11, 20 9 C 26 7, 29 10, 31 7"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
          Red String
        </Link>
        <nav className="flex items-center gap-1 text-sm overflow-x-auto">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                pathname.startsWith(l.href)
                  ? "bg-rose-50 text-rose-600 font-medium"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3" ref={panelRef}>
          <div className="relative">
            <button
              onClick={openPanel}
              className="relative w-9 h-9 rounded-full hover:bg-stone-100 flex items-center justify-center text-lg"
              aria-label="Notifications"
            >
              🔔
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
            {open && (
              <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-2xl shadow-xl border border-stone-100 py-2">
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-stone-400 text-center">
                    No notifications yet. Run your agent!
                  </p>
                ) : (
                  notifications.map((n) => (
                    <Link
                      key={n.id}
                      href={n.href ?? "#"}
                      onClick={() => setOpen(false)}
                      className={`block px-4 py-3 hover:bg-stone-50 ${
                        n.read ? "" : "bg-rose-50/50"
                      }`}
                    >
                      <div className="flex gap-2.5">
                        <span className="text-lg flex-shrink-0">{NOTIF_ICON[n.type]}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-stone-800 leading-snug">
                            {n.title}
                          </p>
                          <p className="text-xs text-stone-500 mt-0.5 leading-snug">{n.body}</p>
                          <p className="text-[11px] text-stone-400 mt-1">{timeAgo(n.createdAt)}</p>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>
          {user &&
            (user.isGuest ? (
              <Link
                href="/login"
                className="text-xs px-3 py-1.5 rounded-full bg-stone-900 text-white hover:bg-stone-700 whitespace-nowrap"
              >
                Save account
              </Link>
            ) : (
              <span
                className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 text-xs font-bold flex items-center justify-center"
                title={user.email ?? ""}
              >
                {(user.displayName ?? user.email ?? "?").slice(0, 1).toUpperCase()}
              </span>
            ))}
        </div>
      </div>
    </header>
  );
}
