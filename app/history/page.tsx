"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAllTattooImages, type TattooImage } from "@/lib/firebase-utils";

export default function HistoryPage() {
  const [images, setImages] = useState<TattooImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const imgs = await getAllTattooImages("generated");
        if (!cancelled) setImages(imgs);
      } catch (err) {
        console.error("Failed to load generated tattoos:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white px-4 py-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-light tracking-tight">
              Previously Generated Tattoos
            </h1>
            <p className="text-xs sm:text-sm text-white/60">
              These are tattoos generated via the AI on this site.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/"
              className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-1 rounded-full"
            >
              ← Back to gallery
            </Link>
            <Link
              href="/generate"
              className="text-xs sm:text-sm text-black bg-white border border-white/30 px-3 py-1 rounded-full hover:bg-zinc-200"
            >
              Generate more
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-white/20 border-t-white mb-4" />
              <p className="text-white/60 text-sm">Loading generated tattoos...</p>
            </div>
          </div>
        ) : images.length === 0 ? (
          <div className="text-center min-h-[40vh] flex flex-col items-center justify-center space-y-3">
            <p className="text-white/70 text-sm">
              You haven&apos;t saved any generated tattoos yet.
            </p>
            <Link
              href="/generate"
              className="text-xs sm:text-sm text-black bg-white border border-white/30 px-4 py-2 rounded-full hover:bg-zinc-200"
            >
              Generate your first design
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {images.map((img) => (
              <div
                key={img.fileName}
                className="border border-white/10 bg-black/70 p-2 flex items-center justify-center"
              >
                <img
                  src={img.url}
                  alt={img.fileName}
                  className="w-full h-auto object-contain"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


