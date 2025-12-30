"use client";

import { useState, useEffect } from "react";
import TattooFilter from "./components/TattooFilter";
import TattooGallery from "./components/TattooGallery";
import {
  getAllTattooImages,
  getUniqueBodyParts,
  filterTattoos,
  TattooImage,
} from "@/lib/firebase-utils";
import { getStyleById } from "@/lib/tattoo-categories";

export default function Home() {
  const [allImages, setAllImages] = useState<TattooImage[]>([]);
  const [filteredImages, setFilteredImages] = useState<TattooImage[]>([]);
  const [bodyParts, setBodyParts] = useState<string[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>();
  const [selectedStyleId, setSelectedStyleId] = useState<number | undefined>();
  const [selectedBodyPart, setSelectedBodyPart] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [visibleCount, setVisibleCount] = useState(60);
  const [showPriceDuration, setShowPriceDuration] = useState(true);

  // Load tattoo data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [images, uniqueBodyParts] = await Promise.all([
          getAllTattooImages(),
          getUniqueBodyParts(),
        ]);

        // Load prices.json and merge with images
        try {
          const pricesResponse = await fetch('/prices.json');
          if (pricesResponse.ok) {
            const pricesData: Array<{ fileName: string; price: number; duration: number }> = await pricesResponse.json();
            const pricesMap = new Map<string, { price: number; duration: number }>();
            pricesData.forEach(item => {
              pricesMap.set(item.fileName, { price: item.price, duration: item.duration });
            });

            // Merge price and duration data with images
            const imagesWithPrices = images.map(image => ({
              ...image,
              price: pricesMap.get(image.fileName)?.price,
              duration: pricesMap.get(image.fileName)?.duration,
            }));

            setAllImages(imagesWithPrices);
            setFilteredImages(imagesWithPrices);
          } else {
            // If prices.json doesn't exist or fails to load, use images without prices
            setAllImages(images);
            setFilteredImages(images);
          }
        } catch (pricesError) {
          console.error("Error loading prices:", pricesError);
          // Continue with images without prices
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
      selectedBodyPart
    );
    setFilteredImages(filtered);
    setVisibleCount(60);
  }, [allImages, selectedCategoryId, selectedStyleId, selectedBodyPart]);

  return (
    <div className="min-h-screen bg-black">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)] pointer-events-none" />
      
      {/* Header */}
      <header className="relative border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-3 flex items-center justify-between gap-4">
          <div className="flex-1 flex justify-start gap-2">
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-light tracking-tight">
              <span className="bg-gradient-to-r from-white via-white/90 to-white/80 bg-clip-text text-transparent">
                Sue&apos;s Tattoo
              </span>
            </h1>
            <p className="text-white/50 text-xs md:text-sm font-light tracking-wide uppercase letter-spacing-wider">
              Discover Your Perfect Design
            </p>
          </div>
          <div className="flex-1 flex justify-end">
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
                onCategoryChange={setSelectedCategoryId}
                onStyleChange={setSelectedStyleId}
                onBodyPartChange={setSelectedBodyPart}
                onClearAll={() => {
                  setSelectedCategoryId(undefined);
                  setSelectedStyleId(undefined);
                  setSelectedBodyPart(undefined);
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
              {/* Mobile filter toggle */}
              <div className="mb-6 flex items-center justify-between lg:hidden">
                <button
                  onClick={() => setShowFiltersMobile(true)}
                  className="px-4 py-2 text-sm font-medium text-black bg-white border border-white/20"
                >
                  Filters
                </button>
                {(selectedCategoryId || selectedStyleId || selectedBodyPart) && (
                  <button
                    onClick={() => {
                      setSelectedCategoryId(undefined);
                      setSelectedStyleId(undefined);
                      setSelectedBodyPart(undefined);
                    }}
                    className="text-xs text-white/60 hover:text-white transition-colors font-light uppercase tracking-wider"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Results Count */}
              <div className="mb-6 flex items-center justify-between">
                <p className="text-white/40 text-sm font-light">
                  <span className="text-white/60 font-normal">{filteredImages.length}</span>{' '}
                  {filteredImages.length === 1 ? 'design' : 'designs'}
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

              {/* Gallery */}
              <TattooGallery
                images={filteredImages.slice(0, visibleCount)}
                allImages={allImages}
                showPriceDuration={showPriceDuration}
                onStyleClick={(styleId) => {
                  // Toggle style: if same style clicked, clear it; otherwise set it
                  const newStyleId = selectedStyleId === styleId ? undefined : styleId;
                  setSelectedStyleId(newStyleId);
                  
                  // Set category to match the style's category, but keep body part filter
                  if (newStyleId) {
                    const styleInfo = getStyleById(newStyleId);
                    if (styleInfo) {
                      setSelectedCategoryId(styleInfo.category.id);
                    }
                  } else {
                    // If clearing style, also clear category
                    setSelectedCategoryId(undefined);
                  }
                  // Body part filter remains unchanged
                }}
                onCategoryClick={(categoryId) => {
                  // Toggle category: if same category clicked, clear it; otherwise set it
                  const newCategoryId = selectedCategoryId === categoryId ? undefined : categoryId;
                  setSelectedCategoryId(newCategoryId);
                  
                  // If category is cleared or changed, clear style (since style must belong to category)
                  // But keep body part filter active
                  if (!newCategoryId || newCategoryId !== selectedCategoryId) {
                    setSelectedStyleId(undefined);
                  }
                  // Body part filter remains unchanged
                }}
                onBodyPartClick={(bodyPart) => {
                  // Toggle body part: if same body part clicked, clear it; otherwise set it
                  setSelectedBodyPart(selectedBodyPart === bodyPart ? undefined : bodyPart);
                  // Keep style and category filters active (they compound with body part)
                }}
              />

              {filteredImages.length > visibleCount && (
                <div className="mt-8 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((c) => c + 60)}
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

      {/* Mobile filters overlay */}
      {showFiltersMobile && !loading && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm p-4 overflow-y-auto lg:hidden">
          <div className="max-w-xl mx-auto space-y-4">
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
              onCategoryChange={setSelectedCategoryId}
              onStyleChange={setSelectedStyleId}
              onBodyPartChange={setSelectedBodyPart}
              onClearAll={() => {
                setSelectedCategoryId(undefined);
                setSelectedStyleId(undefined);
                setSelectedBodyPart(undefined);
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedCategoryId(undefined);
                  setSelectedStyleId(undefined);
                  setSelectedBodyPart(undefined);
                }}
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

      {/* Footer */}
      <footer className="relative mt-24 border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 text-center">
          <p className="text-white/30 text-xs font-light tracking-wide">
            © {new Date().getFullYear()} Sue's Tattoo Studio
          </p>
        </div>
      </footer>
    </div>
  );
}
