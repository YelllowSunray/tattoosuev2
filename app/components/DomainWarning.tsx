"use client";

import { useEffect, useState } from "react";

export default function DomainWarning() {
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Only run in browser
    if (typeof window === "undefined") return;

    // Check if user has dismissed the warning
    const dismissedKey = `domain-warning-dismissed-${window.location.hostname}`;
    const wasDismissed = localStorage.getItem(dismissedKey) === "true";
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    const currentHost = window.location.hostname;
    const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;

    // Skip check for localhost
    if (currentHost === "localhost" || currentHost === "127.0.0.1") {
      return;
    }

    // Check if it's a custom domain (not vercel.app, not localhost)
    const isCustomDomain = !currentHost.includes("vercel.app") && 
                          currentHost !== "localhost" && 
                          currentHost !== "127.0.0.1";

    if (isCustomDomain) {
      // The authDomain in Firebase config is typically the Firebase project domain (e.g., project.firebaseapp.com)
      // Custom domains need to be added to Firebase's authorized domains list separately
      // So we always show a warning for custom domains to remind about authorization
      const message = `Custom domain detected (${currentHost}). If login isn't working, ensure this domain is authorized in Firebase Console → Authentication → Settings → Authorized domains.`;
      setWarningMessage(message);
      setShowWarning(true);
    }
  }, []);

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      const dismissedKey = `domain-warning-dismissed-${window.location.hostname}`;
      localStorage.setItem(dismissedKey, "true");
      setDismissed(true);
      setShowWarning(false);
    }
  };

  if (dismissed || !showWarning || !warningMessage) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[10000] bg-yellow-600/90 border-b border-yellow-500/50 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm text-yellow-50 font-medium">
            ⚠️ {warningMessage}
          </p>
          <p className="text-xs text-yellow-100/80 mt-1">
            Add: <code className="bg-yellow-700/50 px-1 rounded">{window.location.hostname}</code>
            {!window.location.hostname.startsWith("www.") && (
              <>
                {" "}and{" "}
                <code className="bg-yellow-700/50 px-1 rounded">
                  www.{window.location.hostname}
                </code>
              </>
            )}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-yellow-50 hover:text-yellow-100 text-xl leading-none font-bold"
          aria-label="Dismiss warning"
        >
          ×
        </button>
      </div>
    </div>
  );
}
