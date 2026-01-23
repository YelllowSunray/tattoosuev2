"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import AuthButton from "../components/AuthButton";
import PurchaseCredits from "../components/PurchaseCredits";

interface CreditsData {
  credits: number;
  totalPurchased: number;
  totalSpent: number;
}

export default function CreditsPage() {
  const { user, loading: authLoading } = useAuth();
  const [creditsData, setCreditsData] = useState<CreditsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const fetchCredits = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/users/credits", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setCreditsData(data);
      }
    } catch (error) {
      console.error("Error fetching credits:", error);
    } finally {
      setLoading(false);
    }
  };

  // Check for Stripe redirect success/cancel
  useEffect(() => {
    if (typeof window !== "undefined" && user) {
      const params = new URLSearchParams(window.location.search);
      if (params.get("success") === "true") {
        const credits = params.get("credits");
        setMessage(`Successfully purchased ${credits} credits! Your balance has been updated.`);
        // Refresh credits
        fetchCredits();
        // Clean URL
        window.history.replaceState({}, "", "/credits");
      } else if (params.get("canceled") === "true") {
        setMessage("Payment was canceled.");
        window.history.replaceState({}, "", "/credits");
      }
    }
  }, [user]);

  useEffect(() => {
    fetchCredits();
    
    // Refresh credits every 30 seconds
    const interval = setInterval(fetchCredits, 30000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="relative border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-3 flex items-center justify-between gap-4">
          <div className="flex-1 flex justify-start gap-2">
            <Link
              href="/"
              className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-1.5 rounded-full transition-colors"
            >
              ← Back to gallery
            </Link>
            <Link
              href="/generate"
              className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-1.5 rounded-full transition-colors"
            >
              Generate
            </Link>
            <Link
              href="/customers"
              className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-1.5 rounded-full transition-colors"
            >
              Customers
            </Link>
            <Link
              href="/history"
              className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-1.5 rounded-full transition-colors"
            >
              History
            </Link>
          </div>
          <div className="flex-1 flex justify-end">
            <div className="flex items-center gap-2">
              <Link
                href="/credits"
                className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-1.5 rounded-full transition-colors"
              >
                Credits
              </Link>
              <AuthButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-12 py-10">
        {authLoading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-2 border-white/20 border-t-white/60 mb-6"></div>
              <p className="text-white/40 text-sm font-light tracking-wide">Loading...</p>
            </div>
          </div>
        ) : !user ? (
          <div className="border border-white/20 bg-black/60 p-8 text-center space-y-4">
            <h2 className="text-xl font-light">Sign in Required</h2>
            <p className="text-sm text-white/60">
              You need to sign in to view and manage your credits.
            </p>
            <div className="pt-2">
              <AuthButton />
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Success/Cancel Message */}
            {message && (
              <div className="border border-white/20 bg-black/60 p-4 text-sm text-white/80">
                {message}
                <button
                  onClick={() => setMessage(null)}
                  className="ml-4 text-xs text-white/60 hover:text-white/80"
                >
                  ×
                </button>
              </div>
            )}
            
            {/* Current Balance */}
            <div className="border border-white/10 bg-black/60 p-6 sm:p-8">
              <h1 className="text-2xl sm:text-3xl font-light tracking-tight mb-2">
                Credits
              </h1>
              <p className="text-sm text-white/60 mb-6">
                Manage your credits and purchase more to generate tattoo designs.
              </p>
              
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white/60"></div>
                  <span className="text-sm text-white/60">Loading credits...</span>
                </div>
              ) : creditsData ? (
                <div className="space-y-4">
                  <div className="flex items-baseline gap-4">
                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-wider mb-1">
                        Current Balance
                      </p>
                      <p className="text-4xl sm:text-5xl font-light text-white">
                        {creditsData.credits}
                      </p>
                      <p className="text-xs text-white/50 mt-1">
                        {creditsData.credits === 1 ? "credit" : "credits"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10">
                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-wider mb-1">
                        Total Purchased
                      </p>
                      <p className="text-xl font-light text-white/80">
                        {creditsData.totalPurchased}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-wider mb-1">
                        Total Spent
                      </p>
                      <p className="text-xl font-light text-white/80">
                        {creditsData.totalSpent}
                      </p>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-xs text-white/50 mb-2">
                      <span className="font-medium text-white/70">Cost per generation:</span> 2 credits
                    </p>
                    <p className="text-xs text-white/50">
                      You can generate{" "}
                      <span className="font-medium text-white/70">
                        {Math.floor(creditsData.credits / 2)}
                      </span>{" "}
                      more design{Math.floor(creditsData.credits / 2) !== 1 ? "s" : ""} with your current balance.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-white/60">Failed to load credits.</p>
              )}
            </div>

            {/* Purchase Credits */}
            {creditsData && (
              <div className="border border-white/10 bg-black/60 p-6 sm:p-8">
                <PurchaseCredits />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
