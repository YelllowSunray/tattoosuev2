"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getUserGeneratedTattoos, type TattooImage } from "@/lib/firebase-utils";
import { useAuth } from "@/lib/auth-context";
import AuthButton from "../components/AuthButton";

export default function HistoryPage() {
  const [images, setImages] = useState<TattooImage[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (authLoading) return;
      
      if (!user) {
        if (!cancelled) {
          setImages([]);
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        const imgs = await getUserGeneratedTattoos(user.uid);
        if (!cancelled) setImages(imgs);
      } catch (err) {
        console.error("Failed to load generated tattoos:", err);
        if (!cancelled) setImages([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return (
    <div className="min-h-screen bg-black text-white px-4 py-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-light tracking-tight">
              Previously Generated Tattoos
            </h1>
            <p className="text-xs sm:text-sm text-white/60">
              {user 
                ? "Your previously generated tattoos"
                : "Sign in to view your generated tattoos"}
            </p>
          </div>
          <div className="flex gap-2 items-center">
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
            <AuthButton />
          </div>
        </div>

        {loading || authLoading ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-white/20 border-t-white mb-4" />
              <p className="text-white/60 text-sm">Loading generated tattoos...</p>
            </div>
          </div>
        ) : !user ? (
          <div className="text-center min-h-[40vh] flex flex-col items-center justify-center space-y-3">
            <p className="text-white/70 text-sm">
              Please sign in to view your generated tattoos.
            </p>
            <AuthButton />
          </div>
        ) : images.length === 0 ? (
          <div className="text-center min-h-[40vh] flex flex-col items-center justify-center space-y-3">
            <p className="text-white/70 text-sm">
              You haven&apos;t generated any tattoos yet.
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
                  loading="lazy"
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


