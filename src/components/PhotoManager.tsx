"use client";

import { useState, useEffect, useRef } from "react";
import type { UserPhoto } from "@/lib/types";

export default function PhotoManager() {
  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/photos")
      .then((r) => r.json())
      .then((d) => setPhotos(d.photos ?? []));
  }, []);

  async function upload(file: File) {
    setError(null);
    setBusy(true);
    const form = new FormData();
    form.append("photo", file);
    const res = await fetch("/api/photos", { method: "POST", body: form });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Upload failed");
      return;
    }
    setPhotos(data.photos);
  }

  async function remove(id: string) {
    const res = await fetch(`/api/photos?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) setPhotos(data.photos);
  }

  async function makePrimary(id: string) {
    const res = await fetch("/api/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "make_primary", id }),
    });
    const data = await res.json();
    if (res.ok) setPhotos(data.photos);
  }

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-medium text-stone-400 uppercase tracking-wide">Photos</h2>
        <span className="text-xs text-stone-400">{photos.length}/6 · first is your main photo</span>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {photos.map((p, i) => (
          <div
            key={p.id}
            className="relative aspect-square rounded-2xl overflow-hidden border border-stone-200 bg-stone-50 group"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/photos/${p.id}`}
              alt={`Photo ${i + 1}`}
              className="w-full h-full object-cover"
            />
            {i === 0 && (
              <span className="absolute top-1.5 left-1.5 text-[10px] font-bold uppercase tracking-wide bg-rose-500 text-white px-2 py-0.5 rounded-full">
                Main
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 p-1.5 flex gap-1 justify-end bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              {i !== 0 && (
                <button
                  onClick={() => makePrimary(p.id)}
                  className="text-[10px] font-medium bg-white/90 text-stone-700 rounded-full px-2 py-1"
                >
                  Make main
                </button>
              )}
              <button
                onClick={() => remove(p.id)}
                className="text-[10px] font-medium bg-white/90 text-red-500 rounded-full px-2 py-1"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        {photos.length < 6 && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="aspect-square rounded-2xl border-2 border-dashed border-stone-200 text-stone-400 hover:border-rose-300 hover:text-rose-400 transition-colors flex flex-col items-center justify-center gap-1 disabled:opacity-50"
          >
            {busy ? (
              <span className="w-5 h-5 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin" />
            ) : (
              <>
                <span className="text-2xl leading-none">+</span>
                <span className="text-[11px]">Add photo</span>
              </>
            )}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
    </section>
  );
}
