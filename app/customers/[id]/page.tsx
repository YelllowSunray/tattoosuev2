"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import AuthButton from "../../components/AuthButton";
import CreditsDisplay from "../../components/CreditsDisplay";
import MobileNav from "../../components/MobileNav";
import { storage } from "@/lib/firebase";
import { ref, getDownloadURL, uploadString } from "firebase/storage";
import { CREDIT_COSTS } from "@/lib/credit-config";

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
  stencils?: string[]; // Firebase Storage paths for stencils (one per image, same index)
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
  const [stencilUrlMap, setStencilUrlMap] = useState<Record<string, string>>({});
  const [showStencil, setShowStencil] = useState<Record<string, boolean>>({}); // generationId-imageIdx -> boolean
  const [generatingStencil, setGeneratingStencil] = useState<Record<string, boolean>>({}); // generationId-imageIdx -> boolean
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [generationsToShow, setGenerationsToShow] = useState(5); // Initial number of generations to show
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ generationId: string; imageIndex: number } | null>(null);
  const { user, loading: authLoading } = useAuth();

  // Helper function to load image URLs for specific generations
  const loadImageUrlsForGenerations = async (gens: Generation[], token: string) => {
    const newImageUrls: Record<string, string> = {};
    const newStencilUrls: Record<string, string> = {};
    
    // Load all image URLs
    await Promise.all(
      gens.flatMap((gen: Generation) =>
        (gen.images || []).map(async (imagePath: string) => {
          try {
            const imageRef = ref(storage, imagePath);
            const url = await getDownloadURL(imageRef);
            newImageUrls[imagePath] = url;
          } catch (err) {
            console.error(`Failed to get download URL for ${imagePath}:`, err);
          }
        })
      )
    );
    
    // Load all stencil URLs
    await Promise.all(
      gens.flatMap((gen: Generation) =>
        (gen.stencils || []).map(async (stencilPath: string) => {
          try {
            const stencilRef = ref(storage, stencilPath);
            const url = await getDownloadURL(stencilRef);
            newStencilUrls[stencilPath] = url;
          } catch (err) {
            console.error(`Failed to get download URL for stencil ${stencilPath}:`, err);
          }
        })
      )
    );
    
    // Update state with new URLs (merge with existing using functional setState)
    // This ensures we don't overwrite existing URLs
    if (Object.keys(newImageUrls).length > 0) {
      setImageUrlMap((prev) => ({ ...prev, ...newImageUrls }));
    }
    if (Object.keys(newStencilUrls).length > 0) {
      setStencilUrlMap((prev) => ({ ...prev, ...newStencilUrls }));
    }
  };

  // Handle "Load More" button click
  const handleLoadMore = async () => {
    if (!user || loadingMore) return;
    
    setLoadingMore(true);
    try {
      const token = await user.getIdToken();
      const nextBatch = generations.slice(generationsToShow, generationsToShow + 5);
      
      if (nextBatch.length > 0) {
        await loadImageUrlsForGenerations(nextBatch, token);
        setGenerationsToShow(prev => prev + 5);
      }
    } catch (err) {
      console.error("Failed to load more generations:", err);
      setError("Failed to load more generations");
    } finally {
      setLoadingMore(false);
    }
  };

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
        
        // Handle "personal" designs specially - skip customer loading
        if (customerId === "personal") {
          // Set a dummy customer object for personal designs
          setCustomer({
            id: "personal",
            name: "Personal Designs",
            email: user.email || "",
            phone: undefined,
            notes: "A personal design generation for you.",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: user.uid,
          });
          setEditName("Personal Designs");
          setEditEmail(user.email || "");
          setEditPhone("");
        } else {
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
        }
        
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
          
          // Load image URLs only for initially visible generations (first 5)
          await loadImageUrlsForGenerations(gens.slice(0, generationsToShow), token);
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

  // Handle keyboard navigation for image modal
  useEffect(() => {
    if (!selectedImage) return;
    
    const generation = generations.find(g => g.id === selectedImage.generationId);
    if (!generation) return;
    
    const totalImages = generation.images.length;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedImage(null);
      } else if (e.key === "ArrowLeft" && totalImages > 1) {
        e.preventDefault();
        const prevIndex = selectedImage.imageIndex > 0 
          ? selectedImage.imageIndex - 1 
          : totalImages - 1;
        setSelectedImage({ ...selectedImage, imageIndex: prevIndex });
      } else if (e.key === "ArrowRight" && totalImages > 1) {
        e.preventDefault();
        const nextIndex = selectedImage.imageIndex < totalImages - 1 
          ? selectedImage.imageIndex + 1 
          : 0;
        setSelectedImage({ ...selectedImage, imageIndex: nextIndex });
      }
    };
    
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedImage, generations]);

  const handleGenerateStencil = async (generation: Generation, imageIdx: number, imageUrl: string) => {
    if (!user) return;

    const toggleKey = `${generation.id}-${imageIdx}`;
    setGeneratingStencil((prev) => ({ ...prev, [toggleKey]: true }));
    // Clear any previous errors for this specific image
    setError(null);

    try {
      const token = await user.getIdToken();

      // Get the image storage path from the generation
      const imagePath = generation.images?.[imageIdx];
      if (!imagePath) {
        throw new Error(`No image path found for image index ${imageIdx}`);
      }

      // Get image data from server-side API to avoid CORS issues
      console.log(`📥 Getting image data from server: ${imagePath.substring(0, 50)}...`);
      
      let imageDataRes;
      try {
        imageDataRes = await fetch("/api/get-image-data", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({ imagePath }),
        });
      } catch (fetchError) {
        console.error("Failed to call get-image-data API:", fetchError);
        throw new Error(`Failed to call image data API: ${fetchError instanceof Error ? fetchError.message : 'Network error'}`);
      }

      if (!imageDataRes.ok) {
        let errorData;
        try {
          errorData = await imageDataRes.json();
        } catch {
          const text = await imageDataRes.text().catch(() => 'Unable to read response');
          errorData = { error: `HTTP ${imageDataRes.status}: ${text.substring(0, 200)}` };
        }
        console.error("Image data API error:", errorData);
        throw new Error(errorData.error || `Failed to get image data: ${imageDataRes.status}`);
      }

      let imageData;
      try {
        imageData = await imageDataRes.json();
      } catch (jsonError) {
        console.error("Failed to parse image data API response:", jsonError);
        throw new Error("Invalid JSON response from image data API");
      }

      if (!imageData.success || !imageData.dataUrl) {
        console.error("Invalid image data API response:", imageData);
        throw new Error("Invalid response from image data API");
      }

      const imageDataUrl = imageData.dataUrl;
      console.log(`✅ Successfully got image data URL (length: ${imageDataUrl.length})`);

      // Generate stencil
      console.log(`🎨 Calling stencil generation API...`);
      let stencilRes;
      try {
        stencilRes = await fetch("/api/generate-stencil", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            images: [imageDataUrl],
            placementPhoto: undefined, // Could add placement photo support later
            bodyPart: generation.placements?.[0]?.toLowerCase(),
          }),
        });
      } catch (fetchError) {
        console.error("Stencil API fetch error:", fetchError);
        throw new Error(`Failed to call stencil API: ${fetchError instanceof Error ? fetchError.message : 'Network error'}`);
      }

      let stencilData;
      try {
        stencilData = await stencilRes.json();
      } catch (jsonError) {
        const text = await stencilRes.text().catch(() => 'Unable to read response');
        console.error("Stencil API JSON parse error:", jsonError, "Response:", text);
        throw new Error(`Failed to parse stencil API response: ${text.substring(0, 200)}`);
      }

      if (!stencilRes.ok) {
        console.error("Stencil API error response:", stencilData);
        if (stencilRes.status === 402) {
          // Insufficient credits
          throw new Error(`Insufficient credits. You need ${stencilData.requiredCredits} credits but only have ${stencilData.currentCredits}.`);
        }
        throw new Error(stencilData.error || `Stencil generation failed: ${stencilRes.status} ${stencilRes.statusText}`);
      }

      // Credits were deducted successfully (handled by API)
      if (stencilData.creditsRemaining !== undefined) {
        console.log(`✅ Credits deducted. Remaining: ${stencilData.creditsRemaining}`);
      }

      if (!Array.isArray(stencilData.stencils) || stencilData.stencils.length === 0 || !stencilData.stencils[0]) {
        console.error("Invalid stencil response:", stencilData);
        throw new Error("No stencil returned from server");
      }

      const stencil = stencilData.stencils[0];
      console.log(`✅ Got stencil (length: ${stencil.length})`);

      // Upload stencil to Firebase Storage
      const timestamp = Date.now();
      const userId = user.uid;
      const stencilPath = `generated/${userId}/stencils/${timestamp}-${imageIdx}.png`;
      const storageRef = ref(storage, stencilPath);
      await uploadString(storageRef, stencil, "data_url");

      // Update generation with new stencil path
      const currentStencils = generation.stencils || [];
      const updatedStencils: (string | null)[] = [...currentStencils];
      // Ensure array is long enough
      while (updatedStencils.length <= imageIdx) {
        updatedStencils.push(null);
      }
      updatedStencils[imageIdx] = stencilPath;

      const updateRes = await fetch(`/api/generations/${generation.id}/stencils`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ stencils: updatedStencils }),
      });

      if (!updateRes.ok) {
        throw new Error("Failed to save stencil to generation");
      }

      // Reload generations to get updated data
      const generationsRes = await fetch(`/api/generations/customer/${customerId}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (generationsRes.ok) {
        const generationsData = await generationsRes.json();
        const gens = generationsData.generations || [];
        setGenerations(gens);

        // Generate download URLs for new stencil
        const stencilRef = ref(storage, stencilPath);
        const stencilUrl = await getDownloadURL(stencilRef);
        setStencilUrlMap((prev) => ({ ...prev, [stencilPath]: stencilUrl }));
      }
    } catch (err) {
      console.error("Error generating stencil:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to generate stencil";
      setError(errorMessage);
      console.error("Full error details:", {
        message: errorMessage,
        error: err,
        imageUrl: imageUrl.substring(0, 100),
        imageIdx,
        generationId: generation.id,
      });
    } finally {
      setGeneratingStencil((prev) => ({ ...prev, [toggleKey]: false }));
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-light tracking-tight">
              {customer.name}
            </h1>
            <p className="text-xs sm:text-sm text-white/60 hidden sm:block">
              Customer details and generated tattoos
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
            <div className="lg:hidden">
              <MobileNav />
            </div>
            <Link
              href="/customers"
              className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-2 rounded-full min-h-[44px] flex items-center justify-center"
            >
              ← Customers
            </Link>
            <Link
              href="/generate"
              className="text-xs sm:text-sm text-black bg-white border border-white/30 px-3 py-2 rounded-full hover:bg-zinc-200 min-h-[44px] flex items-center justify-center"
            >
              Generate
            </Link>
            <CreditsDisplay />
            <div className="hidden lg:flex gap-2 items-center">
              <Link
                href="/credits"
                className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-2 rounded-full min-h-[44px] flex items-center justify-center"
              >
                Credits
              </Link>
              <AuthButton />
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="border border-white/10 bg-black/70 p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-light">Customer Information</h2>
            {!isEditing && customerId !== "personal" ? (
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
                className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-4 py-2 rounded-full min-h-[44px] flex items-center justify-center"
              >
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-4 py-2 rounded-full disabled:opacity-50 min-h-[44px] flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="text-xs sm:text-sm text-black bg-white border border-white/30 px-4 py-2 rounded-full hover:bg-zinc-200 disabled:bg-white/30 disabled:text-black/40 min-h-[44px] flex items-center justify-center"
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
                  className="w-full bg-black border border-white/30 text-sm sm:text-base px-4 py-3 outline-none focus:border-white text-white min-h-[44px]"
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
              {generations.slice(0, generationsToShow).map((generation) => (
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
                      // Get download URL - must be a valid URL, not a storage path
                      const url = imageUrlMap[imagePath];
                      if (!url) {
                        // URL not loaded yet - skip rendering or show loading state
                        return (
                          <div key={idx} className="border border-white/15 bg-black/60 p-2 flex items-center justify-center min-h-[200px]">
                            <p className="text-xs text-white/50">Loading image...</p>
                          </div>
                        );
                      }
                      
                      // CRITICAL: stencils[idx] should correspond to images[idx]
                      const stencilPath = generation.stencils?.[idx];
                      const stencilUrl = stencilPath ? (stencilUrlMap[stencilPath] || null) : null;
                      const toggleKey = `${generation.id}-${idx}`;
                      const isShowingStencil = showStencil[toggleKey] || false;
                      const displayUrl = isShowingStencil && stencilUrl ? stencilUrl : url;
                      
                      // Debug logging
                      if (stencilPath) {
                        console.log(`🖼️  Image[${idx}]: ${imagePath.substring(0, 50)}... -> Stencil[${idx}]: ${stencilPath}`);
                      }
                      
                      return (
                        <div
                          key={idx}
                          className="border border-white/15 bg-black/60 p-2 relative group cursor-pointer"
                          onClick={() => setSelectedImage({ generationId: generation.id, imageIndex: idx })}
                        >
                          <div className="flex items-center justify-center min-h-[200px]">
                            <img
                              src={displayUrl}
                              alt={`Generation ${idx + 1}${isShowingStencil ? " (Stencil)" : ""}`}
                              className="w-full h-auto object-contain max-h-96"
                              onError={(e) => {
                                // Log error but don't hide - show error message instead
                                const target = e.target as HTMLImageElement;
                                console.error(`Image failed to load: ${displayUrl}`);
                                // Set a data attribute to show error state
                                target.setAttribute('data-error', 'true');
                                target.alt = `Failed to load image: ${displayUrl.substring(0, 50)}...`;
                              }}
                            />
                          </div>
                          {stencilUrl ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent opening modal when clicking stencil toggle
                                setShowStencil((prev) => ({
                                  ...prev,
                                  [toggleKey]: !prev[toggleKey],
                                }));
                              }}
                              className="absolute top-2 right-2 px-3 py-2 text-xs bg-black/80 border border-white/30 text-white hover:bg-black hover:border-white/50 rounded transition-colors z-10 min-h-[44px] flex items-center justify-center"
                              title={isShowingStencil ? "Show original" : "Show stencil"}
                            >
                              {isShowingStencil ? "Original" : "Stencil"}
                            </button>
                          ) : (
                            <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-10">
                              {error && toggleKey === `${generation.id}-${idx}` && (
                                <div className="px-2 py-1 text-xs bg-red-900/80 border border-red-500/50 text-red-200 rounded max-w-[200px]">
                                  {error}
                                </div>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent opening modal when clicking generate stencil
                                  handleGenerateStencil(generation, idx, url);
                                }}
                                disabled={generatingStencil[toggleKey]}
                                className="px-3 py-2 text-xs bg-black/80 border border-white/30 text-white hover:bg-black hover:border-white/50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex items-center justify-center"
                                title="Generate stencil for this image"
                              >
                                {generatingStencil[toggleKey] 
                                  ? "Generating..." 
                                  : `Generate Stencil for ${CREDIT_COSTS.GENERATE_STENCIL} credit`}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {generations.length > generationsToShow && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="px-6 py-3 text-sm bg-black/80 border border-white/30 text-white hover:bg-black hover:border-white/50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                  >
                    {loadingMore ? "Loading..." : `Load More (${generations.length - generationsToShow} remaining)`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Image Modal */}
        {selectedImage && (() => {
          const generation = generations.find(g => g.id === selectedImage.generationId);
          if (!generation) return null;
          
          const imagePath = generation.images[selectedImage.imageIndex];
          const url = imageUrlMap[imagePath];
          const stencilPath = generation.stencils?.[selectedImage.imageIndex];
          const stencilUrl = stencilPath ? (stencilUrlMap[stencilPath] || null) : null;
          const toggleKey = `${generation.id}-${selectedImage.imageIndex}`;
          const isShowingStencil = showStencil[toggleKey] || false;
          const displayUrl = isShowingStencil && stencilUrl ? stencilUrl : url;
          const totalImages = generation.images.length;
          
          return (
            <div
              className="fixed inset-0 z-[9997] flex items-center justify-center p-4 sm:p-6 bg-black/95 backdrop-blur-sm"
              onClick={() => setSelectedImage(null)}
            >
              <div
                className="max-w-6xl w-full max-h-[90vh] overflow-y-auto relative"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-black border border-white/10 p-4 sm:p-8 md:p-12">
                  {/* Close button */}
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="absolute top-4 right-4 sm:top-6 sm:right-6 text-white/40 hover:text-white/80 text-3xl font-light w-10 h-10 flex items-center justify-center transition-colors z-10 min-h-[44px] min-w-[44px]"
                    aria-label="Close"
                  >
                    ×
                  </button>

                  {/* Main image */}
                  <div className="mb-6">
                    <div className="relative aspect-square max-w-2xl mx-auto border border-white/10">
                      <img
                        src={displayUrl}
                        alt={`Generation ${selectedImage.imageIndex + 1}${isShowingStencil ? " (Stencil)" : ""}`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="mt-6 text-center">
                      <h3 className="text-2xl sm:text-3xl md:text-4xl font-light text-white mb-2 tracking-tight">
                        {generation.prompt}
                      </h3>
                      <p className="text-white/60 text-sm">
                        Image {selectedImage.imageIndex + 1} of {totalImages} • {generation.model}
                      </p>
                      {stencilUrl && (
                        <button
                          onClick={() => {
                            setShowStencil((prev) => ({
                              ...prev,
                              [toggleKey]: !prev[toggleKey],
                            }));
                          }}
                          className="mt-4 px-4 py-2 text-sm bg-black/80 border border-white/30 text-white hover:bg-black hover:border-white/50 rounded transition-colors min-h-[44px]"
                        >
                          {isShowingStencil ? "Show Original" : "Show Stencil"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Navigation arrows */}
                  {totalImages > 1 && (
                    <div className="flex items-center justify-between mt-6">
                      <button
                        onClick={() => {
                          const prevIndex = selectedImage.imageIndex > 0 
                            ? selectedImage.imageIndex - 1 
                            : totalImages - 1;
                          setSelectedImage({ ...selectedImage, imageIndex: prevIndex });
                        }}
                        className="px-4 py-2 text-white/70 hover:text-white border border-white/30 hover:border-white/50 transition-colors min-h-[44px]"
                        aria-label="Previous image"
                      >
                        ← Previous
                      </button>
                      <span className="text-white/50 text-sm">
                        {selectedImage.imageIndex + 1} / {totalImages}
                      </span>
                      <button
                        onClick={() => {
                          const nextIndex = selectedImage.imageIndex < totalImages - 1 
                            ? selectedImage.imageIndex + 1 
                            : 0;
                          setSelectedImage({ ...selectedImage, imageIndex: nextIndex });
                        }}
                        className="px-4 py-2 text-white/70 hover:text-white border border-white/30 hover:border-white/50 transition-colors min-h-[44px]"
                        aria-label="Next image"
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
