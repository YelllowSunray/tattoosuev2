"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import AuthButton from "../../components/AuthButton";
import { storage } from "@/lib/firebase";
import { ref, getDownloadURL } from "firebase/storage";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface Generation {
  id: string;
  customerId: string;
  userId: string;
  prompt: string;
  fullPrompt: string;
  model: string;
  images: string[]; // Firebase Storage paths
  imageUrls?: string[]; // Optional - may not be present (we don't store base64 URLs anymore)
  styleIds?: number[];
  placements?: string[];
  createdAt: string;
  createdBy: string;
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [imageUrlMap, setImageUrlMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setLoading(false);
      return;
    }

    async function loadData() {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Get Firebase Auth token
        const token = await user.getIdToken();
        
        // Load customer
        const customerRes = await fetch(`/api/customers/${customerId}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        if (!customerRes.ok) {
          if (customerRes.status === 404) {
            setError("Customer not found");
          } else {
            const errorData = await customerRes.json();
            setError(errorData.error || "Failed to load customer");
          }
          return;
        }
        const customerData = await customerRes.json();
        const customerInfo = customerData.customer;
        setCustomer(customerInfo);
        // Initialize edit values
        setEditName(customerInfo.name);
        setEditEmail(customerInfo.email);
        setEditPhone(customerInfo.phone || "");
        
        // Load generations
        const generationsRes = await fetch(`/api/generations/customer/${customerId}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        if (generationsRes.ok) {
          const generationsData = await generationsRes.json();
          const gens = generationsData.generations || [];
          setGenerations(gens);
          
          // Generate download URLs for all image paths
          const urlMap: Record<string, string> = {};
          await Promise.all(
            gens.flatMap((gen: Generation) =>
              (gen.images || []).map(async (imagePath: string) => {
                try {
                  const imageRef = ref(storage, imagePath);
                  const url = await getDownloadURL(imageRef);
                  urlMap[imagePath] = url;
                } catch (err) {
                  console.error(`Failed to get download URL for ${imagePath}:`, err);
                }
              })
            )
          );
          setImageUrlMap(urlMap);
        }
      } catch (err) {
        console.error("Failed to load customer data:", err);
        setError("Failed to load customer data");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [customerId, user, authLoading]);

  const handleCancelEdit = () => {
    setIsEditing(false);
    setError(null);
    // Reset edit fields to current customer values
    if (customer) {
      setEditName(customer.name);
      setEditEmail(customer.email);
      setEditPhone(customer.phone || "");
    }
  };

  const handleSaveEdit = async () => {
    if (!user || !customer) return;

    setError(null);

    // Validation
    if (!editName.trim() || !editEmail.trim()) {
      setError("Name and email are required");
      return;
    }

    setSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/customers/${customerId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName.trim(),
          email: editEmail.trim(),
          phone: editPhone.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        // Update local customer state
        setCustomer({
          ...customer,
          name: editName.trim(),
          email: editEmail.trim(),
          phone: editPhone.trim() || undefined,
        });
        setIsEditing(false);
      } else {
        setError(data.error || "Failed to update customer");
      }
    } catch (err) {
      console.error("Error updating customer:", err);
      setError("Failed to update customer");
    } finally {
      setSaving(false);
    }
  };


  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-white/20 border-t-white mb-4" />
          <p className="text-white/60 text-sm">Loading customer...</p>
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
            You need to sign in to view customer details.
          </p>
          <AuthButton />
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="min-h-screen bg-black text-white px-4 py-10">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl font-light tracking-tight">
              Customer Not Found
            </h1>
            <Link
              href="/customers"
              className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-1 rounded-full"
            >
              ← Back to Customers
            </Link>
          </div>
          <div className="border border-red-500/50 bg-red-900/30 p-4 text-red-200 text-sm">
            {error || "Customer not found"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-light tracking-tight">
              {customer.name}
            </h1>
            <p className="text-xs sm:text-sm text-white/60">
              Customer details and generated tattoos
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <Link
              href="/customers"
              className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-1 rounded-full"
            >
              ← Customers
            </Link>
            <Link
              href="/generate"
              className="text-xs sm:text-sm text-black bg-white border border-white/30 px-3 py-1 rounded-full hover:bg-zinc-200"
            >
              Generate
            </Link>
            <AuthButton />
          </div>
        </div>

        {/* Customer Info */}
        <div className="border border-white/10 bg-black/70 p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-light">Customer Information</h2>
            {!isEditing ? (
              <button
                onClick={() => {
                  if (customer) {
                    setEditName(customer.name);
                    setEditEmail(customer.email);
                    setEditPhone(customer.phone || "");
                    setIsEditing(true);
                    setError(null);
                  }
                }}
                className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-1 rounded-full"
              >
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-1 rounded-full disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="text-xs sm:text-sm text-black bg-white border border-white/30 px-3 py-1 rounded-full hover:bg-zinc-200 disabled:bg-white/30 disabled:text-black/40"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-900/30 border border-red-500/50 text-red-200 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/60 uppercase tracking-[0.16em] mb-1">
                Name <span className="text-red-400">*</span>
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-black border border-white/30 text-sm px-3 py-2 outline-none focus:border-white text-white"
                  placeholder="Customer name"
                />
              ) : (
                <p className="text-sm text-white">{customer.name}</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-white/60 uppercase tracking-[0.16em] mb-1">
                Email <span className="text-red-400">*</span>
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-black border border-white/30 text-sm px-3 py-2 outline-none focus:border-white text-white"
                  placeholder="customer@email.com"
                />
              ) : (
                <p className="text-sm text-white">{customer.email}</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-white/60 uppercase tracking-[0.16em] mb-1">
                Phone
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-black border border-white/30 text-sm px-3 py-2 outline-none focus:border-white text-white"
                  placeholder="(555) 123-4567"
                />
              ) : (
                <p className="text-sm text-white">{customer.phone || "—"}</p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-white/60 uppercase tracking-[0.16em] mb-1">
                Created
              </label>
              <p className="text-sm text-white/70">
                {new Date(customer.createdAt).toLocaleString()}
              </p>
            </div>
            {customer.notes && (
              <div className="md:col-span-2">
                <label className="block text-xs text-white/60 uppercase tracking-[0.16em] mb-1">
                  Notes
                </label>
                <p className="text-sm text-white/70 whitespace-pre-wrap">{customer.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Generations */}
        <div>
          <h2 className="text-xl font-light mb-4">
            Generated Tattoos ({generations.reduce((total, gen) => total + (gen.images?.length || 0), 0)})
          </h2>
          {generations.length === 0 ? (
            <div className="border border-white/10 bg-black/70 p-8 text-center">
              <p className="text-white/60 text-sm mb-4">
                No generations yet for this customer.
              </p>
              <Link
                href="/generate"
                className="text-xs sm:text-sm text-black bg-white border border-white/30 px-4 py-2 rounded-full hover:bg-zinc-200 inline-block"
              >
                Generate design
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {generations.map((generation) => (
                <div
                  key={generation.id}
                  className="border border-white/10 bg-black/70 p-4 space-y-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-white/60 uppercase">
                          {generation.model}
                        </span>
                        <span className="text-xs text-white/40">
                          {new Date(generation.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-white/90 mb-1">{generation.prompt}</p>
                      {generation.fullPrompt !== generation.prompt && (
                        <details className="mt-2">
                          <summary className="text-xs text-white/50 cursor-pointer hover:text-white/70">
                            View full prompt
                          </summary>
                          <p className="text-xs text-white/60 mt-2 whitespace-pre-wrap">
                            {generation.fullPrompt}
                          </p>
                        </details>
                      )}
                      {generation.placements && generation.placements.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs text-white/50">
                            Placements: {generation.placements.join(", ")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(generation.images || []).map((imagePath, idx) => {
                      const url = imageUrlMap[imagePath] || imagePath; // Fallback to path if URL not loaded yet
                      return (
                        <div
                          key={idx}
                          className="border border-white/15 bg-black/60 p-2 flex items-center justify-center"
                        >
                          <img
                            src={url}
                            alt={`Generation ${idx + 1}`}
                            className="w-full h-auto object-contain max-h-96"
                            onError={(e) => {
                              // Hide image if it fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
