"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import AuthModal from "./AuthModal";

export default function AuthButton() {
  const { user, logout, loading } = useAuth();
  const [showModal, setShowModal] = useState(false);

  if (loading) {
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
        </div>
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-1.5 rounded-full transition-colors"
      >
        Sign In
      </button>
      <AuthModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}


