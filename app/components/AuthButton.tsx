"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import AuthModal from "./AuthModal";

export default function AuthButton() {
  const { user, logout, loading } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [forceShow, setForceShow] = useState(false);

  // Add timeout to prevent infinite loading on Vercel
  // If auth takes more than 2 seconds, assume user is not authenticated and show Sign In button
  useEffect(() => {
    if (!loading) {
      setForceShow(true);
      return;
    }

    // After 2 seconds, force show the button even if auth is still loading
    // This prevents the button from being stuck on "Loading..." on Vercel
    const timeout = setTimeout(() => {
      setForceShow(true);
    }, 2000);

    return () => clearTimeout(timeout);
  }, [loading]);

  // Show loading only if auth is loading AND we haven't forced show yet
  if (loading && !forceShow) {
    return (
      <div className="text-xs sm:text-sm text-white/50 border border-white/30 px-3 py-1.5 rounded-full">
        Loading...
      </div>
    );
  }

  if (user) {
    return (
      <>
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm text-white/70 hidden sm:inline">
            {user.email}
          </span>
          <button
            onClick={logout}
            className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-1.5 rounded-full transition-colors"
          >
            Sign Out
          </button>
          <Link
            href="/support"
            className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-1.5 rounded-full transition-colors"
          >
            Support
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowModal(true)}
          className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-1.5 rounded-full transition-colors"
        >
          Sign In
        </button>
        <Link
          href="/support"
          className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-1.5 rounded-full transition-colors"
        >
          Support
        </Link>
      </div>
      <AuthModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}


