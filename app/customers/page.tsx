"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import AuthButton from "../components/AuthButton";
import CreditsDisplay from "../components/CreditsDisplay";
import MobileNav from "../components/MobileNav";

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-y-auto p-4">
      <div className="relative w-full max-w-md mx-auto my-auto bg-black border border-white/20 p-4 sm:p-6 lg:p-8">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 text-white/60 hover:text-white text-2xl leading-none min-w-[44px] min-h-[44px] flex items-center justify-center"
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
                className="w-full bg-black border border-white/30 text-sm sm:text-base px-4 py-3 outline-none focus:border-white text-white min-h-[44px]"
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
                className="flex-1 px-4 py-3 text-sm font-medium text-white border border-white/30 hover:bg-white/10 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 text-sm font-medium text-black bg-white border border-white/20 disabled:bg-white/30 disabled:text-black/40 disabled:cursor-not-allowed min-h-[44px]"
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

interface PersonalDesign {
  id: string;
  createdAt: string;
  images: string[];
  prompt: string;
  model: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [personalDesigns, setPersonalDesigns] = useState<PersonalDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user, loading: authLoading } = useAuth();
  const isLoading = authLoading || loading;

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

      // Load personal designs (generations with customerId === "personal")
      try {
        const token = await user.getIdToken();
        const personalRes = await fetch(`/api/generations/customer/personal`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        if (personalRes.ok) {
          const personalData = await personalRes.json();
          setPersonalDesigns(personalData.generations || []);
        }
      } catch (err) {
        console.error("Failed to load personal designs:", err);
        // Don't set error for personal designs - it's optional
      }
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

  return (
    <div className="min-h-screen bg-black text-white px-4 py-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:block">
            <div className="sm:hidden">
              <MobileNav />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-light tracking-tight">
                CRM - Customers
              </h1>
              <p className="text-xs sm:text-sm text-white/60 hidden sm:block">
                Manage your customers and view their generated tattoo designs
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
            <Link
              href="/"
              className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-2 rounded-full min-h-[44px] flex items-center"
            >
              ← Gallery
            </Link>
            <button
              onClick={() => setShowModal(true)}
              className="text-xs sm:text-sm text-black bg-white border border-white/30 px-4 py-3 rounded-full hover:bg-zinc-200 transition-colors min-h-[44px] flex items-center justify-center"
            >
              + Add Customer
            </button>
            <div className="hidden lg:flex gap-2 items-center">
              <Link
                href="/generate"
                className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-2 rounded-full min-h-[44px] flex items-center"
              >
                Generate
              </Link>
              <CreditsDisplay />
              <Link
                href="/credits"
                className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-2 rounded-full min-h-[44px] flex items-center"
              >
                Credits
              </Link>
              <AuthButton />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-white/20 border-t-white mb-4" />
              <p className="text-white/60 text-sm">Loading customers...</p>
            </div>
          </div>
        ) : !user ? (
          <div className="text-center min-h-[40vh] flex flex-col items-center justify-center space-y-4">
            <h1 className="text-2xl font-light">Sign in Required</h1>
            <p className="text-sm text-white/60">
              You need to sign in to view customers.
            </p>
            <AuthButton />
          </div>
        ) : (
          <>
            {error && (
              <div className="border border-red-500/50 bg-red-900/30 p-4 text-red-200 text-sm">
                {error}
              </div>
            )}

            {/* Personal Designs Section */}
            {personalDesigns.length > 0 && (() => {
              // Calculate total designs across all personal generations
              const totalDesigns = personalDesigns.reduce((total, design) => {
                return total + (design.images?.length || 0);
              }, 0);
              
              // Get the most recent creation date
              const mostRecentDate = personalDesigns.length > 0 
                ? new Date(Math.max(...personalDesigns.map(d => new Date(d.createdAt).getTime())))
                : null;
              
              return (
                <div className="mb-8">
                  <h2 className="text-xl font-light mb-4">Personal Designs</h2>
                  <Link
                    href={`/customers/personal`}
                    className="block border border-white/10 bg-black/70 p-4 hover:bg-black/90 transition-colors max-w-md"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-lg font-medium text-white flex-1">
                          Personal Design
                        </h3>
                        <span className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded-full">
                          {totalDesigns} {totalDesigns === 1 ? "design" : "designs"}
                        </span>
                      </div>
                      <div className="text-xs text-white/60">
                        <div>A personal design generation for you.</div>
                      </div>
                      {mostRecentDate && (
                        <div className="text-xs text-white/50 pt-2 border-t border-white/10">
                          Last updated {mostRecentDate.toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </Link>
                </div>
              );
            })()}

            {/* Customer Designs Section */}
            {customers.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-light mb-4">Customer Designs</h2>
                {/* Search Bar */}
                <div className="space-y-2 mb-4">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search customers by name, email, or phone..."
                    className="w-full bg-black border border-white/30 text-sm sm:text-base px-4 py-3 outline-none focus:border-white text-white placeholder:text-white/40 min-h-[44px]"
                  />
                </div>
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
                  className="text-xs sm:text-sm text-black bg-white border border-white/30 px-5 py-3 rounded-full hover:bg-zinc-200 min-h-[44px] flex items-center justify-center"
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
                  className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-5 py-3 rounded-full min-h-[44px] flex items-center justify-center"
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
          </>
        )}
      </div>
    </div>
  );
}
