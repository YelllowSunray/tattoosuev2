"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import AuthButton from "./AuthButton";
import CreditsDisplay from "./CreditsDisplay";

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

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
                  <Link
                    href="/"
                    onClick={() => setIsOpen(false)}
                    className="block px-6 py-4 text-base sm:text-lg text-white hover:text-white bg-white/5 hover:bg-white/10 border border-white/30 rounded-lg transition-colors min-h-[56px] flex items-center font-light"
                  >
                    Gallery
                  </Link>
                  <Link
                    href="/generate"
                    onClick={() => setIsOpen(false)}
                    className="block px-6 py-4 text-base sm:text-lg text-white hover:text-white bg-white/5 hover:bg-white/10 border border-white/30 rounded-lg transition-colors min-h-[56px] flex items-center font-light"
                  >
                    Generate
                  </Link>
                  <Link
                    href="/customers"
                    onClick={() => setIsOpen(false)}
                    className="block px-6 py-4 text-base sm:text-lg text-white hover:text-white bg-white/5 hover:bg-white/10 border border-white/30 rounded-lg transition-colors min-h-[56px] flex items-center font-light"
                  >
                    Customers
                  </Link>
                  <Link
                    href="/history"
                    onClick={() => setIsOpen(false)}
                    className="block px-6 py-4 text-base sm:text-lg text-white hover:text-white bg-white/5 hover:bg-white/10 border border-white/30 rounded-lg transition-colors min-h-[56px] flex items-center font-light"
                  >
                    History
                  </Link>
                  <Link
                    href="/credits"
                    onClick={() => setIsOpen(false)}
                    className="block px-6 py-4 text-base sm:text-lg text-white hover:text-white bg-white/5 hover:bg-white/10 border border-white/30 rounded-lg transition-colors min-h-[56px] flex items-center font-light"
                  >
                    Credits
                  </Link>
                </nav>

                {user && (
                  <div className="pt-4 border-t border-white/20 space-y-4">
                    <div className="px-2">
                      <CreditsDisplay />
                    </div>
                    <div className="px-2 flex items-center justify-between gap-2">
                      <span className="text-sm text-white/70 truncate">
                        {user.email}
                      </span>
                      <AuthButton />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
