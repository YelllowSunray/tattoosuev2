"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import AuthButton from "./AuthButton";
import CreditsDisplay from "./CreditsDisplay";

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [userMode, setUserMode] = useState("individual");
  const { user } = useAuth();

  // Prevent body scroll when menu is open and refresh mode when opened
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";

      const loadUserMode = async () => {
        if (!user) {
          // Default to individual mode if not authenticated
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
            // Default to individual if Firebase fails
            setUserMode("individual");
          }
        } catch (error) {
          console.error("Error loading user mode:", error);
          // Default to individual on error
          setUserMode("individual");
        }
      };

      loadUserMode();
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, user]);

  return (
    <>
      {/* Hamburger Button - Mobile Only */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="lg:hidden p-2.5 text-white hover:text-white border-2 border-white/50 rounded transition-all relative z-[100] bg-black shadow-lg hover:bg-white/10 hover:border-white min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="Toggle menu"
        aria-expanded={isOpen}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[99999] w-screen h-screen bg-black overflow-hidden"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="max-w-xl mx-auto h-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-full flex flex-col justify-start space-y-4 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-white text-xl font-light tracking-wide">Menu</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/70 hover:text-white text-3xl leading-none min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Close menu"
                >
                  ×
                </button>
              </div>

              <div className="bg-black border border-white/10 rounded-xl p-4 space-y-4">
                <nav className="space-y-3">
                  {user && (
                    <Link
                      href="/"
                      onClick={() => setIsOpen(false)}
                      className="block px-6 py-4 text-base sm:text-lg text-white hover:text-white bg-white/5 hover:bg-white/10 border border-white/30 rounded-lg transition-colors min-h-[56px] flex items-center font-light"
                    >
                      Gallery
                    </Link>
                  )}
                  <Link
                    href="/generate"
                    onClick={() => setIsOpen(false)}
                    className="block px-6 py-4 text-base sm:text-lg text-white hover:text-white bg-white/5 hover:bg-white/10 border border-white/30 rounded-lg transition-colors min-h-[56px] flex items-center font-light"
                  >
                    {user ? "Generate" : "Generate a AI Custom Tattoo"}
                  </Link>
                  {user && userMode === "parlor" && (
                    <Link
                      href="/customers"
                      onClick={() => setIsOpen(false)}
                      className="block px-6 py-4 text-base sm:text-lg text-white hover:text-white bg-white/5 hover:bg-white/10 border border-white/30 rounded-lg transition-colors min-h-[56px] flex items-center font-light"
                    >
                      Customers
                    </Link>
                  )}
                  {user && (
                    <Link
                      href="/history"
                      onClick={() => setIsOpen(false)}
                      className="block px-6 py-4 text-base sm:text-lg text-white hover:text-white bg-white/5 hover:bg-white/10 border border-white/30 rounded-lg transition-colors min-h-[56px] flex items-center font-light"
                    >
                      History
                    </Link>
                  )}
                  {user && (
                    <div className="space-y-2">
                      <Link
                        href="/credits"
                        onClick={() => setIsOpen(false)}
                        className="block px-6 py-4 text-base sm:text-lg text-white hover:text-white bg-white/5 hover:bg-white/10 border border-white/30 rounded-lg transition-colors min-h-[56px] flex items-center font-light"
                      >
                        Credits
                      </Link>
                      <div className="px-6 pb-2">
                        <div className="text-xs text-white/60 mb-1">Credits Remaining</div>
                        <CreditsDisplay />
                      </div>
                    </div>
                  )}
                  <Link
                    href="/support"
                    onClick={() => setIsOpen(false)}
                    className="block px-6 py-4 text-base sm:text-lg text-white hover:text-white bg-white/5 hover:bg-white/10 border border-white/30 rounded-lg transition-colors min-h-[56px] flex items-center font-light"
                  >
                    Contact Support
                  </Link>
                </nav>

                {/* Mode Toggle */}
                <div className="pt-4 border-t border-white/20 space-y-3">
                  <div className="px-2">
                    <div className="text-xs text-white/60 mb-2">Mode</div>
                    <div className="flex items-center gap-1 border border-white/30 rounded-full p-1 bg-black/40 w-fit">
                      <button
                        type="button"
                        onClick={async () => {
                          if (userMode !== "individual") {
                            setUserMode("individual");
                            
                            // Save to Firebase
                            if (user) {
                              try {
                                const token = await user.getIdToken();
                                await fetch("/api/users/mode", {
                                  method: "PUT",
                                  headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${token}`,
                                  },
                                  body: JSON.stringify({ mode: "individual" }),
                                });
                              } catch (error) {
                                console.error("Error saving user mode to Firebase:", error);
                              }
                            }
                          }
                        }}
                        className={`px-3 py-1.5 text-xs rounded-full transition-colors whitespace-nowrap ${
                          userMode === "individual"
                            ? "bg-white text-black"
                            : "text-white/40 hover:text-white/60"
                        }`}
                        title="Individual Mode"
                      >
                        Individual
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (userMode !== "parlor") {
                            setUserMode("parlor");
                            
                            // Save to Firebase
                            if (user) {
                              try {
                                const token = await user.getIdToken();
                                await fetch("/api/users/mode", {
                                  method: "PUT",
                                  headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${token}`,
                                  },
                                  body: JSON.stringify({ mode: "parlor" }),
                                });
                              } catch (error) {
                                console.error("Error saving user mode to Firebase:", error);
                              }
                            }
                          }
                        }}
                        className={`px-3 py-1.5 text-xs rounded-full transition-colors whitespace-nowrap ${
                          userMode === "parlor"
                            ? "bg-white text-black"
                            : "text-white/40 hover:text-white/60"
                        }`}
                        title="Parlor Mode"
                      >
                        Parlor
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/20 space-y-4">
                  <div className="px-2 flex items-center justify-between gap-2">
                    {user && (
                      <span className="text-sm text-white/70 truncate">
                        {user.email}
                      </span>
                    )}
                    <AuthButton />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
