"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";

interface EstimationResult {
  fileName: string;
  url?: string;
  status: string;
  price?: number;
  duration?: number;
  reasoning?: string;
  message?: string;
  error?: string;
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimationProgress, setEstimationProgress] = useState<string>("");
  const [estimationResults, setEstimationResults] = useState<EstimationResult[]>([]);
  const [estimationError, setEstimationError] = useState<string | null>(null);
  const [forceReestimate, setForceReestimate] = useState(false);
  const [firestoreWarning, setFirestoreWarning] = useState<string | null>(null);
  const [firestoreApiUrl, setFirestoreApiUrl] = useState<string | null>(null);
  const [startFromFileName, setStartFromFileName] = useState<string>("tessellation_back");

  // Watch Firebase auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      console.error("Login error", err);
      let message = "Unable to log in. Please check your details.";
      if (err?.code === "auth/invalid-credential" || err?.code === "auth/wrong-password") {
        message = "Wrong email or password.";
      } else if (err?.code === "auth/user-not-found") {
        message = "No user found with that email.";
      }
      setAuthError(message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleEstimateAll = async (startFrom?: string) => {
    setIsEstimating(true);
    setEstimationError(null);
    setEstimationProgress("Loading tattoos...");
    setEstimationResults([]);
    setFirestoreWarning(null);
    setFirestoreApiUrl(null);

    try {
      // First, get all tattoos
      const tattoosResponse = await fetch("/api/get-tattoos", {
        method: "GET",
      });

      let tattoos: any[] = [];
      if (tattoosResponse.ok) {
        const tattoosData = await tattoosResponse.json();
        tattoos = tattoosData.tattoos || [];
      } else {
        // Fallback: fetch from the estimate endpoint to get tattoo list
        const fallbackResponse = await fetch("/api/estimate-tattoo", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            processAll: false, // Just to get the list
            listOnly: true,
          }),
        });
        // If that doesn't work, we'll process sequentially
      }

      // If startFrom is provided, filter tattoos to start from that file
      if (startFrom) {
        const startIndex = tattoos.findIndex((t) => t.fileName === startFrom || t.fileName.startsWith(startFrom));
        if (startIndex === -1) {
          throw new Error(`Tattoo with fileName starting with "${startFrom}" not found`);
        }
        tattoos = tattoos.slice(startIndex);
        setEstimationProgress(`Starting from ${startFrom}: ${tattoos.length} tattoos to process`);
      }

      // If we can't get the list, process all at once (fallback)
      if (tattoos.length === 0) {
        const response = await fetch("/api/estimate-tattoo", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            processAll: !startFrom,
            startFrom: startFrom,
            forceReestimate: forceReestimate,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to estimate tattoos");
        }

        setEstimationProgress(
          `Processed ${data.processed} tattoos${data.errors > 0 ? ` (${data.errors} errors)` : ""}`
        );
        setEstimationResults(data.results || []);
        
        if (data.warning) {
          setFirestoreWarning(data.warning);
        }
        
        if (data.firestoreApiUrl) {
          setFirestoreApiUrl(data.firestoreApiUrl);
        }
        
        if (data.errors && data.errors.length > 0) {
          setEstimationError(`${data.errors.length} tattoos failed to process. Check results below.`);
        }
        setIsEstimating(false);
        return;
      }

      // Process tattoos sequentially and show results as they come in
      let processed = 0;
      let errors = 0;

      for (const tattoo of tattoos) {
        try {
          setEstimationProgress(
            `Processing ${processed + 1} of ${tattoos.length}: ${tattoo.fileName}...`
          );

          const response = await fetch("/api/estimate-tattoo", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              fileName: tattoo.fileName,
              forceReestimate: forceReestimate,
            }),
          });

          const data = await response.json();

          if (response.ok && data.results && data.results.length > 0) {
            const result = data.results[0];
            // Add result to the list immediately
            setEstimationResults((prev) => [...prev, result]);
            processed++;

            if (data.warning) {
              setFirestoreWarning(data.warning);
            }
            
            if (data.firestoreApiUrl) {
              setFirestoreApiUrl(data.firestoreApiUrl);
            }
          } else {
            // Error for this tattoo
            setEstimationResults((prev) => [
              ...prev,
              {
                fileName: tattoo.fileName,
                url: tattoo.url,
                status: "error",
                error: data.error || "Failed to estimate",
              },
            ]);
            errors++;
          }
        } catch (error) {
          console.error(`Error processing ${tattoo.fileName}:`, error);
          setEstimationResults((prev) => [
            ...prev,
            {
              fileName: tattoo.fileName,
              url: tattoo.url,
              status: "error",
              error: error instanceof Error ? error.message : "Unknown error",
            },
          ]);
          errors++;
        }
      }

      setEstimationProgress(
        `Completed: ${processed} processed${errors > 0 ? `, ${errors} errors` : ""}`
      );

      if (errors > 0) {
        setEstimationError(`${errors} tattoos failed to process.`);
      }
    } catch (error) {
      console.error("Estimation error:", error);
      setEstimationError(
        error instanceof Error ? error.message : "Failed to estimate tattoos"
      );
    } finally {
      setIsEstimating(false);
    }
  };

  // While checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-white/20 border-t-white mb-4" />
          <p className="text-white/60 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // If not logged in, show login screen
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <div className="w-full max-w-sm border border-white/10 bg-black/60 p-6 space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-light text-white tracking-tight">
              Admin Panel
            </h1>
            <p className="text-xs text-white/50">
              Sign in to access admin functions.
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs text-white/60">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-black border border-white/20 text-white outline-none focus:border-white"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-white/60">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-black border border-white/20 text-white outline-none focus:border-white"
                required
              />
            </div>
            {authError && (
              <p className="text-xs text-red-400">{authError}</p>
            )}
            <button
              type="submit"
              className="w-full py-2 text-sm bg-white text-black hover:bg-white/90 transition-colors"
            >
              Sign In
            </button>
          </form>
          <div className="text-center">
            <Link
              href="/"
              className="text-xs text-white/60 hover:text-white transition-colors"
            >
              ← Back to Gallery
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Admin panel
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-light tracking-tight mb-2">
              Admin Panel
            </h1>
            <p className="text-sm text-white/60">
              Manage tattoo price and duration estimates
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Gallery
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Estimation Section */}
        <div className="border border-white/10 bg-black/60 p-6 space-y-6 mb-8">
          <div>
            <h2 className="text-xl font-light mb-4">Estimate All Tattoos</h2>
            <p className="text-sm text-white/60 mb-4">
              Use Vertex AI to estimate the price and duration for all tattoos in the gallery.
              This process may take several minutes depending on the number of tattoos.
            </p>

            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={forceReestimate}
                  onChange={(e) => setForceReestimate(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-white/80">
                  Force re-estimation (skip existing estimates)
                </span>
              </label>
            </div>

            <div className="flex flex-col gap-4 mb-4">
              <div className="flex items-center gap-4">
                <label className="text-sm text-white/80 min-w-[120px]">
                  Start From File:
                </label>
                <input
                  type="text"
                  value={startFromFileName}
                  onChange={(e) => setStartFromFileName(e.target.value)}
                  placeholder="e.g., tessellation_back"
                  className="flex-1 px-3 py-2 text-sm bg-black border border-white/20 text-white outline-none focus:border-white"
                />
                <button
                  onClick={() => handleEstimateAll(startFromFileName || undefined)}
                  disabled={isEstimating || !startFromFileName}
                  className="px-4 py-2 bg-white/20 text-white hover:bg-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-white/20"
                >
                  Start From
                </button>
              </div>
            </div>

            <button
              onClick={() => handleEstimateAll()}
              disabled={isEstimating}
              className="px-6 py-3 bg-white text-black hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEstimating ? "Estimating..." : "Estimate All Tattoos"}
            </button>
          </div>

          {/* Progress */}
          {isEstimating && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />
                <p className="text-sm text-white/80">{estimationProgress}</p>
              </div>
            </div>
          )}

          {/* Firestore Warning */}
          {firestoreWarning && (
            <div className="p-4 bg-yellow-500/20 border border-yellow-500/50">
              <p className="text-sm text-yellow-400 font-medium mb-2">⚠️ Firestore Warning</p>
              <p className="text-sm text-yellow-300 mb-3">{firestoreWarning}</p>
              <div className="space-y-2">
                <a
                  href={firestoreApiUrl || 
                    `https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'tattoosuev2'}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-yellow-400 underline hover:text-yellow-300 transition-colors inline-block"
                >
                  Enable Firestore API →
                </a>
                <p className="text-xs text-yellow-400/70 mt-2">
                  After enabling, wait a few minutes for it to propagate, then refresh and run the estimation again.
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {estimationError && (
            <div className="p-4 bg-red-500/20 border border-red-500/50">
              <p className="text-sm text-red-400">{estimationError}</p>
            </div>
          )}

          {/* Success Message */}
          {!isEstimating && estimationResults.length > 0 && (
            <div className="p-4 bg-green-500/20 border border-green-500/50">
              <p className="text-sm text-green-400">
                Estimation completed! {estimationResults.filter((r) => r.status === "success").length} tattoos processed successfully.
              </p>
            </div>
          )}
        </div>

        {/* Results Grid */}
        {estimationResults.length > 0 && (
          <div className="border border-white/10 bg-black/60 p-6">
            <h2 className="text-xl font-light mb-4">Estimation Results</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {estimationResults.map((result, idx) => (
                <div
                  key={idx}
                  className="border border-white/10 bg-black/40 p-4 space-y-3 hover:border-white/20 transition-colors"
                >
                  {/* Image */}
                  {result.url && (
                    <div className="aspect-square overflow-hidden bg-black/60 border border-white/10">
                      <img
                        src={result.url}
                        alt={result.fileName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  {/* File Name */}
                  <div className="text-xs font-mono text-white/60 truncate">
                    {result.fileName}
                  </div>

                  {/* Status and Price */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-block px-2 py-1 text-xs ${
                        result.status === "success"
                          ? "bg-green-500/20 text-green-400"
                          : result.status === "skipped"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {result.status}
                    </span>
                    {result.price !== undefined && (
                      <div className="text-right">
                        <div className="text-lg font-light text-white">
                          €{result.price.toFixed(2)}
                        </div>
                        {result.duration !== undefined && (
                          <div className="text-xs text-white/60">
                            {result.duration.toFixed(1)} hrs
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Reasoning */}
                  {(result.reasoning || result.message || result.error) && (
                    <div className="text-xs text-white/60 line-clamp-2">
                      {result.reasoning || result.message || result.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

