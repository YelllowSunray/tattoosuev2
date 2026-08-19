"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import TattooFilter from "./TattooFilter";
import TattooGallery from "./TattooGallery";
import { filterTattoos, TattooImage } from "@/lib/firebase-utils";
import { getStyleById, getCategoryById } from "@/lib/tattoo-categories";

type PriceEntry = { price: number; duration: number };

function placementCacheKey(bodyPart?: string) {
  return bodyPart ?? "__all__";
}

function mapApiTattoos(
  tattoos: Array<{
    url: string;
    style?: string;
    bodyPart?: string;
    fileName: string;
    category?: { id: number; name: string } | null;
    matchedStyle?: { id: number; name: string } | null;
  }>
): TattooImage[] {
  return tattoos.map((t) => ({
    url: t.url,
    style: t.style || "",
    bodyPart: t.bodyPart || "",
    fileName: t.fileName,
    category: t.category
      ? { id: t.category.id, name: t.category.name, styles: [] }
      : undefined,
    matchedStyle: t.matchedStyle
      ? { id: t.matchedStyle.id, name: t.matchedStyle.name, keywords: [] }
      : undefined,
  }));
}

function mergePrices(
  images: TattooImage[],
  pricesMap: Map<string, PriceEntry>
): TattooImage[] {
  if (pricesMap.size === 0) return images;
  return images.map((image) => ({
    ...image,
    price: pricesMap.get(image.fileName)?.price,
    duration: pricesMap.get(image.fileName)?.duration,
  }));
}

interface GardenOfTattooStylesProps {
  headerId?: string;
  showHeader?: boolean;
  stickyTopClass?: string;
  sidebarHeightClass?: string;
}

export default function GardenOfTattooStyles({
  headerId = "gallery",
  showHeader = true,
  stickyTopClass = "top-[73px]",
  sidebarHeightClass = "h-[calc(100vh-73px)]",
}: GardenOfTattooStylesProps) {
  const [bodyParts, setBodyParts] = useState<string[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>();
  const [selectedStyleId, setSelectedStyleId] = useState<number | undefined>();
  const [selectedBodyPart, setSelectedBodyPart] = useState<string | undefined>("chest");
  const [initialLoading, setInitialLoading] = useState(true);
  const [isPlacementLoading, setIsPlacementLoading] = useState(false);
  const [cacheVersion, setCacheVersion] = useState(0);
  const imageCacheRef = useRef<Record<string, TattooImage[]>>({});
  const pricesMapRef = useRef<Map<string, PriceEntry>>(new Map());
  const prefetchStartedRef = useRef(false);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [visibleCount, setVisibleCount] = useState(200);
  const [showPriceDuration, setShowPriceDuration] = useState(true);

  useEffect(() => {
    if (showFiltersMobile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showFiltersMobile]);

  const placementKey = placementCacheKey(selectedBodyPart);
  const allImages = useMemo(
    () => imageCacheRef.current[placementKey] ?? [],
    [cacheVersion, placementKey]
  );
  const filteredImages = useMemo(
    () => filterTattoos(allImages, selectedCategoryId, selectedStyleId),
    [allImages, selectedCategoryId, selectedStyleId]
  );

  const fetchPlacementImages = useCallback(
    async (bodyPart?: string, options?: { silent?: boolean }) => {
      const key = placementCacheKey(bodyPart);
      if (imageCacheRef.current[key]) return;

      if (!options?.silent) {
        setIsPlacementLoading(true);
      }

      try {
        const params = new URLSearchParams();
        if (bodyPart) params.set("bodyPart", bodyPart);

        const tattoosResponse = await fetch(`/api/get-tattoos?${params.toString()}`);
        if (!tattoosResponse.ok) {
          throw new Error(`Failed to fetch tattoos: ${tattoosResponse.statusText}`);
        }

        const tattoosData = await tattoosResponse.json();
        if (!tattoosData.success) {
          throw new Error(tattoosData.error || "Failed to fetch tattoos");
        }

        const images = mergePrices(
          mapApiTattoos(tattoosData.tattoos),
          pricesMapRef.current
        );

        imageCacheRef.current[key] = images;
        setCacheVersion((v) => v + 1);
      } catch (error) {
        console.error("Error loading tattoo data:", error);
        if (!options?.silent) {
          imageCacheRef.current[key] = [];
          setCacheVersion((v) => v + 1);
        }
      } finally {
        if (!options?.silent) {
          setIsPlacementLoading(false);
        }
      }
    },
    []
  );

  const prefetchPlacements = useCallback(
    async (parts: string[]) => {
      await Promise.all([
        fetchPlacementImages(undefined, { silent: true }),
        ...parts.map((part) => fetchPlacementImages(part, { silent: true })),
      ]);
    },
    [fetchPlacementImages]
  );

  useEffect(() => {
    async function loadPrices() {
      try {
        const pricesResponse = await fetch("/prices.json");
        if (!pricesResponse.ok) return;

        const pricesData: Array<{ fileName: string; price: number; duration: number }> =
          await pricesResponse.json();
        const pricesMap = new Map<string, PriceEntry>();
        pricesData.forEach((item) => {
          pricesMap.set(item.fileName, { price: item.price, duration: item.duration });
        });
        pricesMapRef.current = pricesMap;

        let updated = false;
        for (const key of Object.keys(imageCacheRef.current)) {
          imageCacheRef.current[key] = mergePrices(imageCacheRef.current[key], pricesMap);
          updated = true;
        }
        if (updated) {
          setCacheVersion((v) => v + 1);
        }
      } catch (error) {
        console.error("Error loading prices:", error);
      }
    }

    loadPrices();
  }, []);

  useEffect(() => {
    async function loadInitialData() {
      try {
        setInitialLoading(true);

        const [bodyPartsResponse] = await Promise.all([
          fetch("/api/get-body-parts"),
          fetchPlacementImages("chest"),
        ]);

        if (bodyPartsResponse.ok) {
          const bodyPartsData = await bodyPartsResponse.json();
          if (bodyPartsData.success) {
            setBodyParts(bodyPartsData.bodyParts);
          }
        }
      } catch (error) {
        console.error("Error loading initial tattoo data:", error);
        setBodyParts([]);
      } finally {
        setInitialLoading(false);
      }
    }

    loadInitialData();
  }, [fetchPlacementImages]);

  useEffect(() => {
    if (initialLoading) return;
    if (imageCacheRef.current[placementKey]) return;
    fetchPlacementImages(selectedBodyPart);
  }, [initialLoading, placementKey, selectedBodyPart, fetchPlacementImages]);

  useEffect(() => {
    if (initialLoading || bodyParts.length === 0 || prefetchStartedRef.current) return;
    prefetchStartedRef.current = true;
    prefetchPlacements(bodyParts);
  }, [initialLoading, bodyParts, prefetchPlacements]);

  useEffect(() => {
    setVisibleCount(200);
  }, [selectedCategoryId, selectedStyleId, selectedBodyPart]);

  const handleCategoryChange = useCallback((categoryId?: number) => {
    setSelectedCategoryId(categoryId);
    if (categoryId === undefined) {
      setSelectedStyleId(undefined);
    }
  }, []);

  const handleStyleChange = useCallback((styleId?: number) => {
    setSelectedStyleId(styleId);
  }, []);

  const handleBodyPartChange = useCallback((bodyPart?: string) => {
    setSelectedBodyPart(bodyPart);
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setSelectedCategoryId(undefined);
    setSelectedStyleId(undefined);
    setSelectedBodyPart(undefined);
  }, []);

  return (
    <>
      {showHeader && (
        <div id={headerId} className="bg-black border-b border-white/5 py-10 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-light tracking-tight text-white mb-3">
            Garden of Tattoo Styles
          </h2>
          <p className="text-white/60 text-sm sm:text-base font-light max-w-xl mx-auto px-4">
            Explore 100&apos;s of styles — check them out to see which ones you love
          </p>
        </div>
      )}

      <div className="relative flex">
        <aside
          className={`hidden lg:block w-80 border-r border-white/5 bg-black/40 backdrop-blur-sm sticky ${stickyTopClass} ${sidebarHeightClass} overflow-y-auto`}
        >
          <div className="p-6">
            {!initialLoading && (
              <TattooFilter
                images={allImages}
                bodyParts={bodyParts}
                selectedCategoryId={selectedCategoryId}
                selectedStyleId={selectedStyleId}
                selectedBodyPart={selectedBodyPart}
                onCategoryChange={handleCategoryChange}
                onStyleChange={handleStyleChange}
                onBodyPartChange={handleBodyPartChange}
                onClearAll={handleClearAllFilters}
              />
            )}
          </div>
        </aside>

        <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-10 w-full">
          {initialLoading ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-2 border-white/20 border-t-white/60 mb-6"></div>
                <p className="text-white/40 text-sm font-light tracking-wide">Loading designs...</p>
              </div>
            </div>
          ) : isPlacementLoading && allImages.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square animate-pulse border border-white/5 bg-white/5"
                />
              ))}
            </div>
          ) : allImages.length === 0 && !isPlacementLoading ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <p className="text-white/60 mb-2 text-base">Failed to load gallery images.</p>
                <p className="text-white/40 text-sm mb-4">
                  Please check your connection and try refreshing the page.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 text-sm text-white bg-white/10 border border-white/30 rounded-full hover:bg-white/20 transition-colors"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6 flex items-center justify-between lg:hidden">
                <button
                  onClick={() => setShowFiltersMobile(true)}
                  className="px-4 py-3 text-sm font-medium text-black bg-white border border-white/20 min-h-[44px] min-w-[100px]"
                >
                  Filters
                </button>
                {(selectedCategoryId || selectedStyleId || selectedBodyPart) && (
                  <button
                    onClick={handleClearAllFilters}
                    className="text-xs text-white/60 hover:text-white transition-colors font-light uppercase tracking-wider"
                  >
                    Clear
                  </button>
                )}
              </div>

              {(selectedCategoryId || selectedStyleId || selectedBodyPart) && (
                <div className="mb-6 flex flex-wrap items-center gap-2">
                  {selectedBodyPart && (
                    <button
                      type="button"
                      onClick={() => handleBodyPartChange(undefined)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-black bg-white hover:bg-zinc-200 transition-colors"
                    >
                      {selectedBodyPart}
                      <span className="text-black/50">×</span>
                    </button>
                  )}
                  {selectedCategoryId && (
                    <button
                      type="button"
                      onClick={() => handleCategoryChange(undefined)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-black bg-white hover:bg-zinc-200 transition-colors"
                    >
                      {getCategoryById(selectedCategoryId)?.name ?? "Category"}
                      <span className="text-black/50">×</span>
                    </button>
                  )}
                  {selectedStyleId && (
                    <button
                      type="button"
                      onClick={() => handleStyleChange(undefined)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-black bg-white hover:bg-zinc-200 transition-colors"
                    >
                      {getStyleById(selectedStyleId)?.style.name ?? "Style"}
                      <span className="text-black/50">×</span>
                    </button>
                  )}
                </div>
              )}

              <div className="mb-6 flex items-center justify-between">
                <p className="text-white/40 text-sm font-light">
                  <span className="text-white/60 font-normal">{filteredImages.length}</span>{" "}
                  {filteredImages.length === 1 ? "design" : "designs"}
                </p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-white/40 font-light uppercase tracking-wider">
                    Show Price/Duration
                  </span>
                  <input
                    type="checkbox"
                    checked={showPriceDuration}
                    onChange={(e) => setShowPriceDuration(e.target.checked)}
                    className="w-4 h-4 accent-white cursor-pointer"
                  />
                </label>
              </div>

              <TattooGallery
                images={filteredImages.slice(0, visibleCount)}
                allImages={allImages}
                showPriceDuration={showPriceDuration}
                onStyleClick={(styleId) => {
                  const newStyleId = selectedStyleId === styleId ? undefined : styleId;
                  setSelectedStyleId(newStyleId);

                  if (newStyleId) {
                    const styleInfo = getStyleById(newStyleId);
                    if (styleInfo) {
                      setSelectedCategoryId(styleInfo.category.id);
                    }
                  } else {
                    setSelectedCategoryId(undefined);
                  }
                }}
                onCategoryClick={(categoryId) => {
                  const newCategoryId =
                    selectedCategoryId === categoryId ? undefined : categoryId;
                  setSelectedCategoryId(newCategoryId);

                  if (!newCategoryId || newCategoryId !== selectedCategoryId) {
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
                    className="px-6 py-3 text-sm font-medium text-black bg-white border border-white/20 hover:bg-zinc-200 transition-colors min-h-[44px]"
                  >
                    Load more ({filteredImages.length - visibleCount} more)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showFiltersMobile && !initialLoading && (
        <div className="fixed inset-0 z-[9998] lg:hidden">
          <button
            type="button"
            aria-label="Close filters"
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowFiltersMobile(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-white/10 bg-zinc-950 p-4 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white text-lg font-light tracking-wide">Filters</h2>
              <button
                onClick={() => setShowFiltersMobile(false)}
                className="text-white/60 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <TattooFilter
              images={allImages}
              bodyParts={bodyParts}
              selectedCategoryId={selectedCategoryId}
              selectedStyleId={selectedStyleId}
              selectedBodyPart={selectedBodyPart}
              onCategoryChange={handleCategoryChange}
              onStyleChange={handleStyleChange}
              onBodyPartChange={handleBodyPartChange}
              onClearAll={handleClearAllFilters}
            />
            <div className="flex gap-2">
              <button
                onClick={handleClearAllFilters}
                className="flex-1 px-4 py-2 text-sm font-medium text-white/80 border border-white/20 hover:border-white/40"
              >
                Clear
              </button>
              <button
                onClick={() => setShowFiltersMobile(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-black bg-white"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
