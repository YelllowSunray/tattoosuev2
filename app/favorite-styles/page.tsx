"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import AuthButton from "../components/AuthButton";
import CreditsDisplay from "../components/CreditsDisplay";
import TattooGallery from "../components/TattooGallery";
import TattooFilter from "../components/TattooFilter";
import {
  getAllTattooImages,
  getUniqueBodyParts,
  filterTattoos,
  TattooImage,
} from "@/lib/firebase-utils";
import { getStyleById } from "@/lib/tattoo-categories";

function FavoriteStylesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [allImages, setAllImages] = useState<TattooImage[]>([]);
  const [filteredImages, setFilteredImages] = useState<TattooImage[]>([]);
  const [bodyParts, setBodyParts] = useState<string[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>();
  const [selectedStyleId, setSelectedStyleId] = useState<number | undefined>();
  const [selectedBodyPart, setSelectedBodyPart] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [favoriteStyleIds, setFavoriteStyleIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(200);

  // Load favorite styles from Firebase
  useEffect(() => {
    async function loadFavoriteStyles() {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/users/favorite-styles", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (res.ok) {
          const data = await res.json();
          const favoriteIds = data.favoriteStyleIds || [];
          if (Array.isArray(favoriteIds) && favoriteIds.length > 0) {
            setFavoriteStyleIds(favoriteIds);
          }
        }
      } catch (e) {
        console.error("Error loading favorite styles:", e);
      }
    }
    
    if (user) {
      loadFavoriteStyles();
    }
  }, [user]);

  // Save favorite styles to Firebase (debounced)
  useEffect(() => {
    // Don't save on initial load (when favorites are loaded from Firebase)
    // Only save when user makes changes
    if (!user) return;
    
    // Skip save if favorites array is empty and we haven't loaded yet
    // This prevents saving empty array on initial mount
    const timeoutId = setTimeout(() => {
      async function saveFavoriteStyles() {
        if (!user) return;
        try {
          const token = await user.getIdToken();
          const res = await fetch("/api/users/favorite-styles", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ favoriteStyleIds }),
          });
          
          if (!res.ok) {
            console.error("Failed to save favorite styles to Firebase");
          }
        } catch (e) {
          console.error("Error saving favorite styles:", e);
        }
      }
      
      saveFavoriteStyles();
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [favoriteStyleIds, user]);

  // Load tattoo data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [images, uniqueBodyParts] = await Promise.all([
          getAllTattooImages(),
          getUniqueBodyParts(),
        ]);

        try {
          const pricesResponse = await fetch("/prices.json");
          if (pricesResponse.ok) {
            const pricesData: Array<{ fileName: string; price: number; duration: number }> =
              await pricesResponse.json();
            const pricesMap = new Map<string, { price: number; duration: number }>();
            pricesData.forEach((item) => {
              pricesMap.set(item.fileName, { price: item.price, duration: item.duration });
            });

            const imagesWithPrices = images.map((image) => ({
              ...image,
              price: pricesMap.get(image.fileName)?.price,
              duration: pricesMap.get(image.fileName)?.duration,
            }));

            setAllImages(imagesWithPrices);
            setFilteredImages(imagesWithPrices);
          } else {
            setAllImages(images);
            setFilteredImages(images);
          }
        } catch (pricesError) {
          console.error("Error loading prices:", pricesError);
          setAllImages(images);
          setFilteredImages(images);
        }

        setBodyParts(uniqueBodyParts);
      } catch (error) {
        console.error("Error loading tattoo data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    const filtered = filterTattoos(
      allImages,
      selectedCategoryId,
      selectedStyleId,
      selectedBodyPart,
      searchQuery
    );
    setFilteredImages(filtered);
    setVisibleCount(200);
  }, [allImages, selectedCategoryId, selectedStyleId, selectedBodyPart, searchQuery]);

  const handleStyleClick = (styleId: number) => {
    setFavoriteStyleIds((prev) => {
      if (prev.includes(styleId)) {
        // Remove if already favorited
        return prev.filter((id) => id !== styleId);
      } else {
        // Add to favorites (limit to 5)
        if (prev.length >= 5) {
          alert("You can only select up to 5 favorite styles.");
          return prev;
        }
        return [...prev, styleId];
      }
    });
  };

  const handleComplete = () => {
    // Save favorite styles to localStorage
    localStorage.setItem("favoriteStyleIds", JSON.stringify(favoriteStyleIds));
    // Navigate back to generate page
    router.push("/generate");
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="relative border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-3 flex items-center justify-between gap-4">
          <div className="flex-1 flex justify-start gap-2">
            <Link
              href="/generate"
              className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-1.5 rounded-full transition-colors"
            >
              ← Back to Generate
            </Link>
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-2xl md:text-3xl font-light tracking-tight">
              <span className="bg-gradient-to-r from-white via-white/90 to-white/80 bg-clip-text text-transparent">
                Find Favorite Styles
              </span>
            </h1>
            <p className="text-white/50 text-xs md:text-sm font-light tracking-wide">
              Select up to 5 favorite styles
            </p>
          </div>
          <div className="flex-1 flex justify-end">
            <div className="flex items-center gap-2">
              <CreditsDisplay />
              <Link
                href="/credits"
                className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-1.5 rounded-full transition-colors"
              >
                Credits
              </Link>
              <AuthButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative flex">
        {/* Sidebar */}
        <aside className="hidden lg:block w-80 border-r border-white/5 bg-black/40 backdrop-blur-sm sticky top-[73px] h-[calc(100vh-73px)] overflow-y-auto">
          <div className="p-6">
            {!loading && (
              <TattooFilter
                images={allImages}
                bodyParts={bodyParts}
                selectedCategoryId={selectedCategoryId}
                selectedStyleId={selectedStyleId}
                selectedBodyPart={selectedBodyPart}
                searchQuery={searchQuery}
                onCategoryChange={setSelectedCategoryId}
                onStyleChange={setSelectedStyleId}
                onBodyPartChange={setSelectedBodyPart}
                onSearchChange={setSearchQuery}
                onClearAll={() => {
                  setSelectedCategoryId(undefined);
                  setSelectedStyleId(undefined);
                  setSelectedBodyPart(undefined);
                  setSearchQuery("");
                }}
              />
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-10 w-full">
          {loading ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-2 border-white/20 border-t-white/60 mb-6"></div>
                <p className="text-white/40 text-sm font-light tracking-wide">Loading designs...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Instruction */}
              <div className="mb-6 p-4 border border-white/20 bg-black/60">
                <p className="text-sm text-white/80">
                  Select your favorite styles (a mix of styles often creates the most beautiful tattoos)
                </p>
              </div>

              {/* Selected Favorites Display */}
              {favoriteStyleIds.length > 0 && (
                <div className="mb-6 p-4 border border-white/20 bg-black/60">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-white/80">
                      Selected: {favoriteStyleIds.length} / 5
                    </p>
                    <button
                      onClick={async () => {
                        setFavoriteStyleIds([]);
                        // Clear from Firebase
                        if (user) {
                          try {
                            const token = await user.getIdToken();
                            await fetch("/api/users/favorite-styles", {
                              method: "PUT",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                              },
                              body: JSON.stringify({ favoriteStyleIds: [] }),
                            });
                          } catch (e) {
                            console.error("Error clearing favorite styles:", e);
                          }
                        }
                      }}
                      className="text-xs text-white/60 hover:text-white/80"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {favoriteStyleIds.map((styleId) => {
                      const styleInfo = getStyleById(styleId);
                      return (
                        <div
                          key={styleId}
                          className="px-3 py-1.5 text-xs bg-white text-black border border-white/20 flex items-center gap-2"
                        >
                          <span>{styleInfo?.style.name || `Style ${styleId}`}</span>
                          <button
                            onClick={() => {
                              const updated = favoriteStyleIds.filter((id) => id !== styleId);
                              setFavoriteStyleIds(updated);
                              // Save to Firebase will happen automatically via useEffect
                            }}
                            className="hover:bg-black/20 px-1 rounded"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Results Count */}
              <div className="mb-6 flex items-center justify-between">
                <p className="text-white/40 text-sm font-light">
                  <span className="text-white/60 font-normal">{filteredImages.length}</span>{" "}
                  {filteredImages.length === 1 ? "design" : "designs"}
                </p>
                <button
                  onClick={handleComplete}
                  disabled={favoriteStyleIds.length === 0}
                  className="px-4 py-2 text-sm font-medium text-black bg-white border border-white/20 hover:bg-zinc-200 transition-colors disabled:bg-white/30 disabled:text-black/40 disabled:cursor-not-allowed"
                >
                  Complete{favoriteStyleIds.length > 0 ? ` (${favoriteStyleIds.length} selected)` : ""}
                </button>
              </div>

              {/* Gallery */}
              <TattooGallery
                images={filteredImages.slice(0, visibleCount)}
                allImages={allImages}
                showPriceDuration={false}
                favoriteStyleIds={favoriteStyleIds}
                onImageClick={(image) => {
                  // When clicking on an image, add its style to favorites
                  if (image.matchedStyle) {
                    handleStyleClick(image.matchedStyle.id);
                  }
                }}
                onStyleClick={(styleId) => {
                  // When clicking on a style name in the modal, add/remove from favorites
                  handleStyleClick(styleId);
                }}
                onCategoryClick={(categoryId) => {
                  const newCategoryId =
                    selectedCategoryId === categoryId ? undefined : categoryId;
                  setSelectedCategoryId(newCategoryId);
                  if (!newCategoryId) {
                    setSelectedStyleId(undefined);
                  }
                }}
                onBodyPartClick={(bodyPart) => {
                  setSelectedBodyPart(
                    selectedBodyPart === bodyPart ? undefined : bodyPart
                  );
                }}
              />

              {filteredImages.length > visibleCount && (
                <div className="mt-8 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((c) => c + 200)}
                    className="px-4 py-2 text-sm font-medium text-black bg-white border border-white/20 hover:bg-zinc-200 transition-colors"
                  >
                    Load more ({filteredImages.length - visibleCount} more)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function FavoriteStylesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-2 border-white/20 border-t-white/60 mb-6"></div>
          <p className="text-white/40 text-sm font-light tracking-wide">Loading...</p>
        </div>
      </div>
    }>
      <FavoriteStylesContent />
    </Suspense>
  );
}
