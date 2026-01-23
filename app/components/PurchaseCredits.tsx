"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const CREDIT_PACKAGES = [
  { credits: 100, price: 10.00 },
  { credits: 200, price: 20.00 },
  { credits: 500, price: 50.00 },
  { credits: 1000, price: 100.00 },
];

export default function PurchaseCredits() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<number | null>(null);

  async function handlePurchase(packageId: number) {
    if (!user) return;

    setLoading(packageId);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ packageId }),
      });

      const data = await res.json();
      if (data.success && data.url) {
        const stripe = await stripePromise;
        if (stripe) {
          window.location.href = data.url;
        }
      } else {
        alert(data.error || "Failed to create checkout session");
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      alert("Failed to process payment. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-white/80">Purchase Credits</h3>
      <div className="grid grid-cols-2 gap-2">
        {CREDIT_PACKAGES.map((pkg, idx) => (
          <button
            key={idx}
            onClick={() => handlePurchase(idx)}
            disabled={loading !== null}
            className="px-4 py-3 border border-white/20 bg-white/5 hover:bg-white/10 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="text-white font-medium">{pkg.credits} Credits</div>
            <div className="text-white/60 text-xs">€{pkg.price.toFixed(2)}</div>
            {loading === idx && (
              <div className="text-white/40 text-xs mt-1">Processing...</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
