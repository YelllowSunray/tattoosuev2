"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Script from "next/script";
import TattooFilter from "./components/TattooFilter";
import TattooGallery from "./components/TattooGallery";
import AuthButton from "./components/AuthButton";
import CreditsDisplay from "./components/CreditsDisplay";
import MobileNav from "./components/MobileNav";
import { useAuth } from "@/lib/auth-context";
import {
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
  const [selectedBodyPart, setSelectedBodyPart] = useState<string | undefined>("chest");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [visibleCount, setVisibleCount] = useState(200);
  const [showPriceDuration, setShowPriceDuration] = useState(true);
  const [userMode, setUserMode] = useState("individual");
  const { user } = useAuth();

  // Load user mode from Firebase (with localStorage fallback)
  useEffect(() => {
    async function loadUserMode() {
      if (!user) {
        // If not authenticated, use localStorage
        const savedMode = localStorage.getItem("userMode");
        if (savedMode === "individual" || savedMode === "parlor") {
          setUserMode(savedMode);
        } else {
          setUserMode("individual");
          localStorage.setItem("userMode", "individual");
        }
        return;
      }

      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/users/mode", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (res.ok) {
          const data = await res.json();
          const mode = data.mode || "individual";
          setUserMode(mode);
          // Also save to localStorage for offline access
          localStorage.setItem("userMode", mode);
        } else {
          // Fallback to localStorage if Firebase fails
          const savedMode = localStorage.getItem("userMode");
          if (savedMode === "individual" || savedMode === "parlor") {
            setUserMode(savedMode);
          } else {
            setUserMode("individual");
            localStorage.setItem("userMode", "individual");
          }
        }
      } catch (error) {
        console.error("Error loading user mode:", error);
        // Fallback to localStorage
        const savedMode = localStorage.getItem("userMode");
        if (savedMode === "individual" || savedMode === "parlor") {
          setUserMode(savedMode);
        } else {
          setUserMode("individual");
          localStorage.setItem("userMode", "individual");
        }
      }
    }
    
    loadUserMode();
  }, [user]);

  // Prevent body scroll when filters overlay is open
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

  // Load tattoo data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        
        // Use API route instead of direct Firebase call (works better on Vercel, especially for unauthenticated users)
        const tattoosResponse = await fetch('/api/get-tattoos');
        
        if (!tattoosResponse.ok) {
          throw new Error(`Failed to fetch tattoos: ${tattoosResponse.statusText}`);
        }

        const tattoosData = await tattoosResponse.json();
        
        if (!tattoosData.success) {
          throw new Error(tattoosData.error || 'Failed to fetch tattoos');
        }

        // Transform API response to match TattooImage format
        const images: TattooImage[] = tattoosData.tattoos.map((t: any) => ({
          url: t.url,
          style: t.style || '',
          bodyPart: t.bodyPart || '',
          fileName: t.fileName,
          category: t.category ? {
            id: t.category.id,
            name: t.category.name,
            styles: [], // Not needed for filtering
          } : undefined,
          matchedStyle: t.matchedStyle ? {
            id: t.matchedStyle.id,
            name: t.matchedStyle.name,
            keywords: [], // Not needed for filtering
          } : undefined,
        }));

        // Calculate unique body parts from images
        const uniqueBodyParts = Array.from(new Set(images.map(img => img.bodyPart).filter(Boolean))).sort() as string[];
        setBodyParts(uniqueBodyParts);

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
      } catch (error) {
        console.error("Error loading tattoo data:", error);
        // Set empty arrays to show error state instead of infinite loading
        setAllImages([]);
        setFilteredImages([]);
        setBodyParts([]);
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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.sujathascompass.com';
  const siteName = "Sue's Tattoo Studio";

  // Structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: siteUrl,
    description: "Discover beautiful tattoo designs. Browse hundreds of tattoo styles including mandala, realism, traditional, and more.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const organizationData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    url: siteUrl,
    logo: `${siteUrl}/logo.png`, // Update with your logo URL
    description: "Professional tattoo design gallery featuring hundreds of tattoo styles and placements.",
    sameAs: [
      // Add your social media links here when available
      // "https://www.instagram.com/yourhandle",
      // "https://www.facebook.com/yourpage",
    ],
  };

  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteUrl,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Structured Data for SEO */}
      <Script
        id="website-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />
      <Script
        id="organization-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationData),
        }}
      />
      <Script
        id="breadcrumb-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbData),
        }}
      />
      
      {/* Subtle background pattern */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)] pointer-events-none" />
      
      {/* Header */}
      <header className="relative border-b border-white/5 bg-black/95 lg:bg-black/40 backdrop-blur-xl sticky top-0 z-50 shadow-lg lg:shadow-none">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-12 py-3 flex items-center justify-between gap-2 sm:gap-4 relative">
          {/* Mobile: Hamburger Menu, Desktop: Navigation Links */}
          <div className="flex items-center justify-start gap-2 relative z-[100] flex-shrink-0">
            <div className="hidden lg:flex gap-2">
              {user && userMode === "parlor" && (
                <Link
                  href="/customers"
                  className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-1.5 rounded-full transition-colors"
                >
                  Customers
                </Link>
              )}
              <Link
                href="/generate"
                className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-1.5 rounded-full transition-colors"
              >
                {user ? "Generate" : "Generate a AI Custom Tattoo"}
              </Link>
              {user && (
                <Link
                  href="/history"
                  className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-1.5 rounded-full transition-colors"
                >
                  History
                </Link>
              )}
            </div>
            <div className="lg:hidden flex-shrink-0">
              <MobileNav />
            </div>
          </div>
          <div className="text-center space-y-1 flex-shrink-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-light tracking-tight">
              <span className="bg-gradient-to-r from-white via-white/90 to-white/80 bg-clip-text text-transparent">
                Sue&apos;s Tattoo
              </span>
            </h1>
            <p className="text-white/50 text-[10px] sm:text-xs md:text-sm font-light tracking-wide uppercase letter-spacing-wider hidden sm:block">
              Discover Your Perfect Design
            </p>
          </div>
          <div className="flex-1 flex justify-end">
            <div className="hidden lg:flex items-center gap-2">
              {/* Mode Toggle */}
              <div className="flex items-center gap-1 border border-white/30 rounded-full p-1 bg-black/40">
                <button
                  type="button"
                  onClick={async () => {
                    if (userMode !== "individual") {
                      setUserMode("individual");
                      localStorage.setItem("userMode", "individual");
                      
                      // Save to Firebase
                      if (user) {
                        try {
                          const token = await user.getIdToken();
                          await fetch("/api/users/mode", {
                            method: "PUT",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ mode: "individual" }),
                          });
                        } catch (error) {
                          console.error("Error saving user mode to Firebase:", error);
                        }
                      }
                    }
                  }}
                  className={`px-3 py-1.5 text-xs rounded-full transition-colors whitespace-nowrap ${
                    userMode === "individual"
                      ? "bg-white text-black"
                      : "text-white/40 hover:text-white/60"
                  }`}
                  title="Individual Mode"
                >
                  Individual
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (userMode !== "parlor") {
                      setUserMode("parlor");
                      localStorage.setItem("userMode", "parlor");
                      
                      // Save to Firebase
                      if (user) {
                        try {
                          const token = await user.getIdToken();
                          await fetch("/api/users/mode", {
                            method: "PUT",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ mode: "parlor" }),
                          });
                        } catch (error) {
                          console.error("Error saving user mode to Firebase:", error);
                        }
                      }
                    }
                  }}
                  className={`px-3 py-1.5 text-xs rounded-full transition-colors whitespace-nowrap ${
                    userMode === "parlor"
                      ? "bg-white text-black"
                      : "text-white/40 hover:text-white/60"
                  }`}
                  title="Parlor Mode"
                >
                  Parlor
                </button>
              </div>
              {user && (
                <>
                  <CreditsDisplay />
                  <Link
                    href="/credits"
                    className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-1.5 rounded-full transition-colors"
                  >
                    Credits
                  </Link>
                </>
              )}
              <AuthButton />
            </div>
            <div className="lg:hidden flex items-center gap-2">
              {/* Mode Toggle */}
              <div className="flex items-center gap-1 border border-white/30 rounded-full p-1 bg-black/40">
                <button
                  type="button"
                  onClick={async () => {
                    if (userMode !== "individual") {
                      setUserMode("individual");
                      localStorage.setItem("userMode", "individual");
                      
                      // Save to Firebase
                      if (user) {
                        try {
                          const token = await user.getIdToken();
                          await fetch("/api/users/mode", {
                            method: "PUT",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ mode: "individual" }),
                          });
                        } catch (error) {
                          console.error("Error saving user mode to Firebase:", error);
                        }
                      }
                    }
                  }}
                  className={`px-3 py-1.5 text-xs rounded-full transition-colors whitespace-nowrap ${
                    userMode === "individual"
                      ? "bg-white text-black"
                      : "text-white/40 hover:text-white/60"
                  }`}
                  title="Individual Mode"
                >
                  Individual
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (userMode !== "parlor") {
                      setUserMode("parlor");
                      localStorage.setItem("userMode", "parlor");
                      
                      // Save to Firebase
                      if (user) {
                        try {
                          const token = await user.getIdToken();
                          await fetch("/api/users/mode", {
                            method: "PUT",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ mode: "parlor" }),
                          });
                        } catch (error) {
                          console.error("Error saving user mode to Firebase:", error);
                        }
                      }
                    }
                  }}
                  className={`px-3 py-1.5 text-xs rounded-full transition-colors whitespace-nowrap ${
                    userMode === "parlor"
                      ? "bg-white text-black"
                      : "text-white/40 hover:text-white/60"
                  }`}
                  title="Parlor Mode"
                >
                  Parlor
                </button>
              </div>
              {user && <CreditsDisplay />}
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
          ) : allImages.length === 0 && !loading ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <p className="text-white/60 mb-2 text-base">Failed to load gallery images.</p>
                <p className="text-white/40 text-sm mb-4">Please check your connection and try refreshing the page.</p>
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
              {/* Mobile filter toggle */}
              <div className="mb-6 flex items-center justify-between lg:hidden">
                <button
                  onClick={() => setShowFiltersMobile(true)}
                  className="px-4 py-3 text-sm font-medium text-black bg-white border border-white/20 min-h-[44px] min-w-[100px]"
                >
                  Filters
                </button>
                {(selectedCategoryId || selectedStyleId || selectedBodyPart || searchQuery) && (
                  <button
                    onClick={() => {
                      setSelectedCategoryId(undefined);
                      setSelectedStyleId(undefined);
                      setSelectedBodyPart(undefined);
                      setSearchQuery("");
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
      </main>

      {/* Mobile filters overlay */}
      {showFiltersMobile && !loading && (
        <div className="fixed inset-0 z-[9998] bg-black/90 backdrop-blur-sm p-4 overflow-y-auto lg:hidden">
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
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedCategoryId(undefined);
                  setSelectedStyleId(undefined);
                  setSelectedBodyPart(undefined);
                  setSearchQuery("");
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
