"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

interface CreditsData {
  credits: number;
  totalPurchased: number;
  totalSpent: number;
}

export default function CreditsDisplay() {
  const { user } = useAuth();
  const [creditsData, setCreditsData] = useState<CreditsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function fetchCredits() {
      if (!user) return; // Additional check for TypeScript
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
    }

    fetchCredits();
    
    // Refresh credits every 30 seconds
    const interval = setInterval(fetchCredits, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user || loading) {
    return null;
  }

  return (
    <div className="text-xs text-white/60">
      <span className="font-medium text-white/80">{creditsData?.credits || 0}</span> credits
    </div>
  );
}
