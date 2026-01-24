"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/lib/auth-context";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  signInMessage?: string;
  signUpMessage?: string;
}

export default function AuthModal({
  isOpen,
  onClose,
  signInMessage,
  signUpMessage,
}: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { signIn, signUp } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Add a timeout wrapper to ensure loading state is cleared even if auth hangs
      const authPromise = isSignUp 
        ? signUp(email, password)
        : signIn(email, password);
      
      // Race against a timeout to prevent infinite loading (increased for Vercel)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Request timed out. Please check your connection and try again.")), 65000);
      });
      
      await Promise.race([authPromise, timeoutPromise]);
      
      // Only close modal if auth succeeded
      onClose();
      setEmail("");
      setPassword("");
      setIsSignUp(false);
    } catch (err: any) {
      console.error("Auth error:", err);
      // Provide more user-friendly error messages
      let errorMessage = "An error occurred";
      if (err.message) {
        if (err.message.includes("timeout")) {
          errorMessage = err.message;
        } else if (err.message.includes("Network error") || err.message.includes("network-request-failed")) {
          errorMessage = "Network error. Please check your connection. If this persists, verify Firebase configuration in Vercel environment variables.";
        } else if (err.message.includes("user-not-found") || err.message.includes("wrong-password")) {
          errorMessage = "Invalid email or password";
        } else if (err.message.includes("email-already-in-use")) {
          errorMessage = "This email is already registered. Please sign in instead.";
        } else if (err.message.includes("weak-password")) {
          errorMessage = "Password should be at least 6 characters";
        } else if (err.message.includes("invalid-email")) {
          errorMessage = "Please enter a valid email address";
        } else if (err.code === 'auth/network-request-failed') {
          errorMessage = "Network error. Please check your internet connection and Firebase configuration.";
        } else {
          errorMessage = err.message;
        }
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = "Network error. Please check your internet connection and Firebase configuration.";
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-y-auto py-4">
      <div className="relative w-full max-w-md mx-4 my-auto bg-black border border-white/20 p-6 sm:p-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl leading-none"
          aria-label="Close"
        >
          ×
        </button>

        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-light tracking-tight text-white mb-2">
              {isSignUp ? "Create Account" : "Sign In"}
            </h2>
            <p className="text-sm text-white/60">
              {isSignUp
                ? signUpMessage || "Create an account to save and manage your tattoos"
                : signInMessage || "Sign in to access your saved tattoos"}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-900/30 border border-red-500/50 text-red-200 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-white/60 uppercase tracking-[0.16em] mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-black border border-white/30 text-sm px-3 py-2 outline-none focus:border-white text-white"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-xs text-white/60 uppercase tracking-[0.16em] mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-black border border-white/30 text-sm px-3 py-2 outline-none focus:border-white text-white"
                placeholder="••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 text-sm font-medium text-black bg-white border border-white/20 disabled:bg-white/30 disabled:text-black/40 disabled:cursor-not-allowed"
            >
              {loading ? "Loading..." : isSignUp ? "Create Account" : "Sign In"}
            </button>
          </form>

          <div className="pt-4 border-t border-white/10">
            <p className="text-sm text-white/60 text-center">
              {isSignUp ? "Already have an account? " : "Don't have an account? "}
            <button
                type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
                  setEmail("");
                  setPassword("");
              }}
                className="text-white underline hover:text-white/80 transition-colors"
            >
                {isSignUp ? "Sign In" : "Create Account"}
            </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

