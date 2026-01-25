"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import AuthButton from "../components/AuthButton";
import PurchaseCredits from "../components/PurchaseCredits";
import MobileNav from "../components/MobileNav";
import CreditsDisplay from "../components/CreditsDisplay";

interface CreditsData {
  credits: number;
  totalPurchased: number;
  totalSpent: number;
}

export default function CreditsPage() {
  const { user, loading: authLoading } = useAuth();
  const [userMode, setUserMode] = useState("individual");

  const [creditsData, setCreditsData] = useState<CreditsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const previousCreditsRef = useRef<number>(0);

  // Load user mode from Firebase
  useEffect(() => {
    async function loadUserMode() {
      if (!user) {
        setUserMode("individual");
        return;
      }

      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/users/mode", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (res.ok) {
          const data = await res.json();
          const mode = data.mode || "individual";
          setUserMode(mode);
        } else {
          setUserMode("individual");
        }
      } catch (error) {
        console.error("Error loading user mode:", error);
        setUserMode("individual");
      }
    }
    
    loadUserMode();
  }, [user]);

  const fetchCredits = useCallback(async (showLoading = false) => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (showLoading) {
      setLoading(true);
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
        previousCreditsRef.current = data.credits;
      } else {
        console.error("Failed to fetch credits:", res.status, res.statusText);
      }
    } catch (error) {
      console.error("Error fetching credits:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Check for Stripe redirect success/cancel
  useEffect(() => {
    if (typeof window !== "undefined" && user) {
      const params = new URLSearchParams(window.location.search);
      if (params.get("success") === "true") {
        const credits = params.get("credits");
        setMessage(`Payment successful! Processing ${credits} credits... This may take a few seconds.`);
        
        // Clean URL immediately
        window.history.replaceState({}, "", "/credits");
        
        // Wait a moment for webhook to process, then refresh with retries
        const checkCredits = async (attempt = 1, maxAttempts = 10) => {
          // Wait 2 seconds before first check, then 1 second between retries
          await new Promise(resolve => setTimeout(resolve, attempt === 1 ? 2000 : 1000));
          
          await fetchCredits(true);
          
          // Check if credits were added (compare with previous total)
          const token = await user.getIdToken();
          const res = await fetch("/api/users/credits", {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (res.ok) {
            const data = await res.json();
            const previousCredits = previousCreditsRef.current;
            const expectedCredits = previousCredits + parseInt(credits || "0");
            
            if (data.credits >= expectedCredits || attempt >= maxAttempts) {
              if (data.credits >= expectedCredits) {
                setMessage(`Successfully purchased ${credits} credits! Your balance has been updated.`);
              } else {
                setMessage(`Payment received! Credits are being processed. If they don't appear, please refresh the page.`);
              }
            } else {
              // Retry
              checkCredits(attempt + 1, maxAttempts);
            }
          } else if (attempt < maxAttempts) {
            // Retry on error
            checkCredits(attempt + 1, maxAttempts);
          }
        };
        
        checkCredits();
      } else if (params.get("canceled") === "true") {
        setMessage("Payment was canceled.");
        window.history.replaceState({}, "", "/credits");
      }
    }
  }, [user, fetchCredits]);

  useEffect(() => {
    fetchCredits();
    
    // Refresh credits every 30 seconds
    const interval = setInterval(() => fetchCredits(false), 30000);
    return () => clearInterval(interval);
  }, [user, fetchCredits]);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="relative border-b border-white/5 bg-black/95 lg:bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-3 flex items-center justify-between gap-4">
          <div className="flex-1 flex justify-start gap-2">
            <div className="hidden lg:flex gap-2">
              <Link
                href="/"
                className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-2 rounded-full transition-colors min-h-[44px] flex items-center"
              >
                ← Back to gallery
              </Link>
              <Link
                href="/generate"
                className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-2 rounded-full transition-colors min-h-[44px] flex items-center"
              >
                Generate
              </Link>
              {userMode === "parlor" && (
                <Link
                  href="/customers"
                  className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-2 rounded-full transition-colors min-h-[44px] flex items-center"
                >
                  Customers
                </Link>
              )}
              <Link
                href="/history"
                className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-2 rounded-full transition-colors min-h-[44px] flex items-center"
              >
                History
              </Link>
            </div>
            <div className="lg:hidden">
              <MobileNav />
            </div>
          </div>
          <div className="flex-1 flex justify-end">
            <div className="hidden lg:flex items-center gap-2">
              <Link
                href="/credits"
                className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-2 rounded-full transition-colors min-h-[44px] flex items-center"
              >
                Credits
              </Link>
              <AuthButton />
            </div>
            <div className="lg:hidden flex items-center gap-2">
              <CreditsDisplay />
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
              <div className="border border-white/20 bg-black/60 p-4 text-sm text-white/80 flex items-center justify-between">
                <span>{message}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchCredits(true)}
                    className="text-xs text-white/60 hover:text-white/80 border border-white/20 px-3 py-2 rounded min-h-[44px] flex items-center justify-center"
                    title="Refresh credits"
                  >
                    ↻ Refresh
                  </button>
                  <button
                    onClick={() => setMessage(null)}
                    className="text-xs text-white/60 hover:text-white/80"
                  >
                    ×
                  </button>
                </div>
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
              
              <div className="flex items-center justify-between mb-4">
                <div>
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white/60"></div>
                      <span className="text-sm text-white/60">Loading credits...</span>
                    </div>
                  ) : null}
                </div>
                <button
                  onClick={() => fetchCredits(true)}
                  className="text-xs text-white/60 hover:text-white/80 border border-white/20 px-4 py-3 rounded transition-colors min-h-[44px] flex items-center justify-center"
                  title="Refresh credits"
                >
                  ↻ Refresh
                </button>
              </div>
              
              {loading && !creditsData ? (
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
