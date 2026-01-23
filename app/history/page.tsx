"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import AuthButton from "../components/AuthButton";
import CreditsDisplay from "../components/CreditsDisplay";
import { storage } from "@/lib/firebase";
import { ref, getDownloadURL, uploadString } from "firebase/storage";
import { CREDIT_COSTS } from "@/lib/credit-config";

interface Generation {
  id: string;
  customerId: string;
  userId: string;
  prompt: string;
  fullPrompt: string;
  model: string;
  images: string[]; // Firebase Storage paths
  imageUrls?: string[]; // Optional - may not be present
  stencils?: string[]; // Firebase Storage paths for stencils (one per image, same index)
  styleIds?: number[];
  placements?: string[];
  createdAt: string;
  createdBy: string;
}

export default function HistoryPage() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [imageUrlMap, setImageUrlMap] = useState<Record<string, string>>({});
  const [stencilUrlMap, setStencilUrlMap] = useState<Record<string, string>>({});
  const [showStencil, setShowStencil] = useState<Record<string, boolean>>({}); // generationId-imageIdx -> boolean
  const [generatingStencil, setGeneratingStencil] = useState<Record<string, boolean>>({}); // generationId-imageIdx -> boolean
  const [generatingStencilError, setGeneratingStencilError] = useState<Record<string, string>>({}); // generationId-imageIdx -> error message
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generationsToShow, setGenerationsToShow] = useState(5); // Initial number of generations to show
  const [loadingMore, setLoadingMore] = useState(false);
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
        (gen.stencils || [])
          .filter((stencilPath): stencilPath is string => 
            stencilPath !== null && stencilPath !== undefined && stencilPath.trim() !== ""
          )
          .map(async (stencilPath: string) => {
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

  const handleGenerateStencil = async (generation: Generation, imageIdx: number, imagePath: string) => {
    if (!user) return;

    const toggleKey = `${generation.id}-${imageIdx}`;
    setGeneratingStencil((prev) => ({ ...prev, [toggleKey]: true }));
    setGeneratingStencilError((prev) => {
      const newState = { ...prev };
      delete newState[toggleKey];
      return newState;
    });

    try {
      const token = await user.getIdToken();

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
            placementPhoto: undefined,
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
      const generationsRes = await fetch(`/api/generations`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (generationsRes.ok) {
        const generationsData = await generationsRes.json();
        const allGens = generationsData.generations || [];
        // Filter by userId
        const userGens = allGens.filter((g: Generation) => g.userId === user.uid);
        setGenerations(userGens);

        // Generate download URLs for new stencil
        const stencilRef = ref(storage, stencilPath);
        const stencilUrl = await getDownloadURL(stencilRef);
        setStencilUrlMap((prev) => ({ ...prev, [stencilPath]: stencilUrl }));
      }
    } catch (err) {
      console.error("Error generating stencil:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to generate stencil";
      setGeneratingStencilError((prev) => ({ ...prev, [toggleKey]: errorMessage }));
    } finally {
      setGeneratingStencil((prev) => ({ ...prev, [toggleKey]: false }));
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
        
        // Load all generations and filter by userId
        const generationsRes = await fetch(`/api/generations`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        if (generationsRes.ok) {
          const generationsData = await generationsRes.json();
          const allGens = generationsData.generations || [];
          // Filter by userId
          const userGens = allGens.filter((g: Generation) => g.userId === user.uid);
          // Sort by createdAt descending
          userGens.sort((a: Generation, b: Generation) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setGenerations(userGens);
          
          // Load image URLs only for initially visible generations (first 5)
          await loadImageUrlsForGenerations(userGens.slice(0, generationsToShow), token);
        }
      } catch (err) {
        console.error("Failed to load generations:", err);
        setError("Failed to load generations");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user, authLoading]);

  // Load missing stencil URLs when generations change
  useEffect(() => {
    if (!user || generations.length === 0) return;

    async function loadMissingStencilUrls() {
      if (!user) return; // Additional check for TypeScript
      const token = await user.getIdToken();
      const missingStencils: string[] = [];
      const currentStencilUrls = stencilUrlMap; // Capture current state

      // Find all stencil paths that don't have URLs loaded
      generations.slice(0, generationsToShow).forEach((gen) => {
        (gen.stencils || []).forEach((stencilPath) => {
          if (
            stencilPath &&
            stencilPath.trim() !== "" &&
            typeof stencilPath === "string" &&
            !currentStencilUrls[stencilPath] &&
            !missingStencils.includes(stencilPath)
          ) {
            missingStencils.push(stencilPath);
          }
        });
      });

      if (missingStencils.length > 0) {
        console.log(`Loading ${missingStencils.length} missing stencil URLs...`);
        const newStencilUrls: Record<string, string> = {};

        await Promise.all(
          missingStencils.map(async (path) => {
            try {
              const stencilRef = ref(storage, path);
              const url = await getDownloadURL(stencilRef);
              newStencilUrls[path] = url;
            } catch (err) {
              console.error(`Failed to get download URL for stencil ${path}:`, err);
            }
          })
        );

        if (Object.keys(newStencilUrls).length > 0) {
          setStencilUrlMap((prev) => ({ ...prev, ...newStencilUrls }));
        }
      }
    }

    loadMissingStencilUrls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generations, generationsToShow, user]);

  return (
    <div className="min-h-screen bg-black text-white px-4 py-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-light tracking-tight">
              Previously Generated Tattoos
            </h1>
            <p className="text-xs sm:text-sm text-white/60">
              {user 
                ? "Your previously generated tattoos"
                : "Sign in to view your generated tattoos"}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <Link
              href="/"
              className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-1 rounded-full"
            >
              ← Back to gallery
            </Link>
            <Link
              href="/generate"
              className="text-xs sm:text-sm text-black bg-white border border-white/30 px-3 py-1 rounded-full hover:bg-zinc-200"
            >
              Generate more
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

        {loading || authLoading ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-white/20 border-t-white mb-4" />
              <p className="text-white/60 text-sm">Loading generated tattoos...</p>
            </div>
          </div>
        ) : !user ? (
          <div className="text-center min-h-[40vh] flex flex-col items-center justify-center space-y-3">
            <p className="text-white/70 text-sm">
              Please sign in to view your generated tattoos.
            </p>
            <AuthButton />
          </div>
        ) : generations.length === 0 ? (
          <div className="text-center min-h-[40vh] flex flex-col items-center justify-center space-y-3">
            <p className="text-white/70 text-sm">
              You haven&apos;t generated any tattoos yet.
            </p>
            <Link
              href="/generate"
              className="text-xs sm:text-sm text-black bg-white border border-white/30 px-4 py-2 rounded-full hover:bg-zinc-200"
            >
              Generate your first design
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
                      console.log(`🖼️  Image[${idx}]: ${imagePath.substring(0, 50)}... -> Stencil[${idx}]: ${stencilPath}, URL loaded: ${!!stencilUrl}`);
                    }
                    
                    return (
                      <div
                        key={idx}
                        className="border border-white/15 bg-black/60 p-2 relative group"
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
                            onClick={() => {
                              setShowStencil((prev) => ({
                                ...prev,
                                [toggleKey]: !prev[toggleKey],
                              }));
                            }}
                            className="absolute top-2 right-2 px-2 py-1 text-xs bg-black/80 border border-white/30 text-white hover:bg-black hover:border-white/50 rounded transition-colors z-10"
                            title={isShowingStencil ? "Show original" : "Show stencil"}
                          >
                            {isShowingStencil ? "Original" : "Stencil"}
                          </button>
                        ) : (
                          <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-10">
                            {generatingStencilError[toggleKey] && (
                              <div className="px-2 py-1 text-xs bg-red-900/80 border border-red-500/50 text-red-200 rounded max-w-[200px]">
                                {generatingStencilError[toggleKey]}
                              </div>
                            )}
                            <button
                              onClick={() => handleGenerateStencil(generation, idx, imagePath)}
                              disabled={generatingStencil[toggleKey]}
                              className="px-2 py-1 text-xs bg-black/80 border border-white/30 text-white hover:bg-black hover:border-white/50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="px-6 py-2 text-sm bg-black/80 border border-white/30 text-white hover:bg-black hover:border-white/50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? "Loading..." : `Load More (${generations.length - generationsToShow} remaining)`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


