"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import AuthButton from "../components/AuthButton";
import CreditsDisplay from "../components/CreditsDisplay";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  generationCount?: number;
}

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
}

function CustomerModal({ isOpen, onClose, onSuccess, userId }: CustomerModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError("Name, email, and phone are required");
      return;
    }

    if (!user) {
      setError("You must be signed in to create a customer");
      return;
    }

    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setName("");
        setEmail("");
        setPhone("");
        setNotes("");
        onSuccess();
        onClose();
      } else {
        setError(data.error || "Failed to create customer");
      }
    } catch (err) {
      console.error("Error creating customer:", err);
      setError("Failed to create customer");
    } finally {
      setLoading(false);
    }
  };

  return (
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
              Add Customer
            </h2>
            <p className="text-sm text-white/60">
              Create a new customer profile
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
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-black border border-white/30 text-sm px-3 py-2 outline-none focus:border-white text-white"
                placeholder="Customer name"
              />
            </div>

            <div>
              <label className="block text-xs text-white/60 uppercase tracking-[0.16em] mb-2">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-black border border-white/30 text-sm px-3 py-2 outline-none focus:border-white text-white"
                placeholder="customer@email.com"
              />
            </div>

            <div>
              <label className="block text-xs text-white/60 uppercase tracking-[0.16em] mb-2">
                Phone <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full bg-black border border-white/30 text-sm px-3 py-2 outline-none focus:border-white text-white"
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <label className="block text-xs text-white/60 uppercase tracking-[0.16em] mb-2">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full bg-black border border-white/30 text-sm px-3 py-2 outline-none focus:border-white text-white resize-none"
                placeholder="Additional notes about the customer..."
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-sm font-medium text-white border border-white/30 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 text-sm font-medium text-black bg-white border border-white/20 disabled:bg-white/30 disabled:text-black/40 disabled:cursor-not-allowed"
              >
                {loading ? "Creating..." : "Create Customer"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user, loading: authLoading } = useAuth();

  const loadCustomers = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Get Firebase Auth token
      const token = await user.getIdToken();
      
      // Load customers with authentication
      const customersRes = await fetch("/api/customers", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      if (!customersRes.ok) {
        const errorData = await customersRes.json();
        throw new Error(errorData.error || "Failed to load customers");
      }
      const customersData = await customersRes.json();
      const customersList = customersData.customers || [];

      // Load image counts for each customer (total images across all generations)
      const customersWithCounts = await Promise.all(
        customersList.map(async (customer: Customer) => {
          try {
            const gensRes = await fetch(`/api/generations/customer/${customer.id}`, {
              headers: {
                "Authorization": `Bearer ${token}`,
              },
            });
            if (gensRes.ok) {
              const gensData = await gensRes.json();
              const generations = gensData.generations || [];
              // Count total images across all generations
              const imageCount = generations.reduce((total: number, gen: any) => {
                return total + (Array.isArray(gen.images) ? gen.images.length : 0);
              }, 0);
              return {
                ...customer,
                generationCount: imageCount, // Actually image count, not generation count
              };
            }
            return { ...customer, generationCount: 0 };
          } catch (err) {
            return { ...customer, generationCount: 0 };
          }
        })
      );

      setCustomers(customersWithCounts);
    } catch (err) {
      console.error("Failed to load customers:", err);
      setError(err instanceof Error ? err.message : "Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setLoading(false);
      return;
    }

    loadCustomers();
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-white/20 border-t-white mb-4" />
          <p className="text-white/60 text-sm">Loading customers...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-light">Sign in Required</h1>
          <p className="text-sm text-white/60">
            You need to sign in to view customers.
          </p>
          <AuthButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-light tracking-tight">
              CRM - Customers
            </h1>
            <p className="text-xs sm:text-sm text-white/60">
              Manage your customers and view their generated tattoo designs
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setShowModal(true)}
              className="text-xs sm:text-sm text-black bg-white border border-white/30 px-3 py-1.5 rounded-full hover:bg-zinc-200 transition-colors"
            >
              + Add Customer
            </button>
            <Link
              href="/"
              className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-1 rounded-full"
            >
              ← Gallery
            </Link>
            <CreditsDisplay />
            <Link
              href="/credits"
              className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-1 rounded-full"
            >
              Credits
            </Link>
            <AuthButton />
          </div>
        </div>

        {error && (
          <div className="border border-red-500/50 bg-red-900/30 p-4 text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Search Bar */}
        {customers.length > 0 && (
          <div className="space-y-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customers by name, email, or phone..."
              className="w-full bg-black border border-white/30 text-sm px-4 py-2 outline-none focus:border-white text-white placeholder:text-white/40"
            />
          </div>
        )}

        {(() => {
          // Filter customers based on search query
          const filteredCustomers = customers.filter((customer) => {
            if (!searchQuery.trim()) return true;
            const query = searchQuery.toLowerCase();
            return (
              customer.name.toLowerCase().includes(query) ||
              customer.email.toLowerCase().includes(query) ||
              (customer.phone && customer.phone.toLowerCase().includes(query))
            );
          });

          if (customers.length === 0) {
            return (
              <div className="text-center min-h-[40vh] flex flex-col items-center justify-center space-y-3">
                <p className="text-white/70 text-sm">
                  No customers yet. Add your first customer to get started.
                </p>
                <button
                  onClick={() => setShowModal(true)}
                  className="text-xs sm:text-sm text-black bg-white border border-white/30 px-4 py-2 rounded-full hover:bg-zinc-200"
                >
                  + Add Customer
                </button>
              </div>
            );
          }

          if (filteredCustomers.length === 0) {
            return (
              <div className="text-center min-h-[40vh] flex flex-col items-center justify-center space-y-3">
                <p className="text-white/70 text-sm">
                  No customers found matching &quot;{searchQuery}&quot;
                </p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-4 py-2 rounded-full"
                >
                  Clear search
                </button>
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCustomers.map((customer) => (
                <Link
                  key={customer.id}
                  href={`/customers/${customer.id}`}
                  className="border border-white/10 bg-black/70 p-4 hover:bg-black/90 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-lg font-medium text-white flex-1">
                        {customer.name}
                      </h3>
                      {customer.generationCount !== undefined && (
                        <span className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded-full">
                          {customer.generationCount} {customer.generationCount === 1 ? "design" : "designs"}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-white/60 space-y-1">
                      <div className="flex items-center gap-1">
                        <span>📧</span>
                        <span className="truncate">{customer.email}</span>
                      </div>
                      {customer.phone && (
                        <div className="flex items-center gap-1">
                          <span>📞</span>
                          <span>{customer.phone}</span>
                        </div>
                      )}
                      {customer.notes && (
                        <div className="text-white/50 mt-2 line-clamp-2">
                          {customer.notes}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-white/50 pt-2 border-t border-white/10">
                      Created {new Date(customer.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          );
        })()}

        <CustomerModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSuccess={loadCustomers}
          userId={user.uid}
        />
      </div>
    </div>
  );
}
