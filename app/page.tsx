"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
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
  const [loading, setLoading] = useState(true);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [visibleCount, setVisibleCount] = useState(200);
  const [showPriceDuration, setShowPriceDuration] = useState(true);
  const [userMode, setUserMode] = useState("individual");
  const { user } = useAuth();

  // Load user mode from Firebase (no localStorage fallback)
  useEffect(() => {
    async function loadUserMode() {
      if (!user) {
        // Default to individual mode if not authenticated
        setUserMode("individual");
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
        } else {
          // Default to individual if Firebase fails
          setUserMode("individual");
        }
      } catch (error) {
        console.error("Error loading user mode:", error);
        // Default to individual on error
        setUserMode("individual");
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

  const [filtersInitialized, setFiltersInitialized] = useState(false);

  // Load body parts list and initial images on mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);
        
        // Fetch in parallel for maximum speed:
        // 1. Body parts list (just filenames, no URLs - very fast)
        // 2. Filtered images (chest) with URLs (only what we need to display - much faster than all images)
        const [bodyPartsResponse, tattoosResponse] = await Promise.all([
          fetch('/api/get-body-parts'),
          fetch('/api/get-tattoos?bodyPart=chest'), // Only fetch chest images with URLs
        ]);
        
        // Handle body parts (fast - no URL fetching)
        if (bodyPartsResponse.ok) {
          const bodyPartsData = await bodyPartsResponse.json();
          if (bodyPartsData.success) {
            setBodyParts(bodyPartsData.bodyParts);
          }
        }
        
        // Handle filtered images (only chest images, not all images)
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
            styles: [],
          } : undefined,
          matchedStyle: t.matchedStyle ? {
            id: t.matchedStyle.id,
            name: t.matchedStyle.name,
            keywords: [],
          } : undefined,
        }));

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
        
        setFiltersInitialized(true);
      } catch (error) {
        console.error("Error loading initial tattoo data:", error);
        // Set empty arrays to show error state instead of infinite loading
        setAllImages([]);
        setFilteredImages([]);
        setBodyParts([]);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []); // Only run once on mount

  // Load filtered tattoo data when filters change (after initial load)
  useEffect(() => {
    // Skip if filters haven't been initialized yet (initial load handles it)
    if (!filtersInitialized) return;
    
    async function loadFilteredData() {
      try {
        setLoading(true);
        
        // Build query parameters from current filters
        const params = new URLSearchParams();
        if (selectedBodyPart) params.set('bodyPart', selectedBodyPart);
        if (selectedCategoryId) params.set('categoryId', selectedCategoryId.toString());
        if (selectedStyleId) params.set('styleId', selectedStyleId.toString());
        
        // Fetch filtered images from API (server-side filtering = faster)
        const tattoosResponse = await fetch(`/api/get-tattoos?${params.toString()}`);
        
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
            styles: [],
          } : undefined,
          matchedStyle: t.matchedStyle ? {
            id: t.matchedStyle.id,
            name: t.matchedStyle.name,
            keywords: [],
          } : undefined,
        }));

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
        console.error("Error loading filtered tattoo data:", error);
        // Set empty arrays to show error state instead of infinite loading
        setAllImages([]);
        setFilteredImages([]);
      } finally {
        setLoading(false);
      }
    }
    loadFilteredData();
  }, [filtersInitialized, selectedCategoryId, selectedStyleId, selectedBodyPart]);

  // Scroll-triggered animations
  useEffect(() => {
    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    animatedElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [loading]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.sujathascompass.com';
  const siteName = "Sue's Tattoo Studio";

  // Structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: siteUrl,
    description: "AI tattoo design generator. Create custom tattoo designs instantly, visualize on your body, and explore 100+ styles. The most affordable AI tattoo generator.",
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
    logo: `${siteUrl}/logo.png`,
    description: "AI-powered tattoo design generator. Create custom tattoos, visualize on your body, and choose from 100+ styles at the most affordable price.",
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
          <div className="flex-1 flex justify-end">
            <div className="hidden lg:flex items-center gap-2">
              {/* Mode Toggle */}
              <div className="flex items-center gap-1 border border-white/30 rounded-full p-1 bg-black/40">
                <button
                  type="button"
                  onClick={async () => {
                    if (userMode !== "individual") {
                      setUserMode("individual");
                      
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

      {/* Hero Section - Static content for SEO (renders immediately, no API needed) */}
      <section className="relative border-b border-white/5 bg-gradient-to-b from-black via-black/95 to-black overflow-hidden">
        {/* Premium animated background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Morphing gradient blobs */}
          <div className="absolute top-10 left-[10%] w-[500px] h-[500px] bg-purple-600/20 morph-bg blur-[120px] breathing" />
          <div className="absolute top-[20%] right-[5%] w-[600px] h-[600px] bg-blue-600/15 morph-bg blur-[150px] breathing" style={{ animationDelay: '-4s' }} />
          <div className="absolute bottom-[10%] left-[30%] w-[400px] h-[400px] bg-indigo-500/15 morph-bg blur-[100px] breathing" style={{ animationDelay: '-2s' }} />
          <div className="absolute top-[50%] right-[30%] w-[300px] h-[300px] bg-pink-500/10 morph-bg blur-[80px] breathing" style={{ animationDelay: '-6s' }} />
          
          {/* Floating particles */}
          <div className="particle" style={{ left: '10%', animationDelay: '0s', animationDuration: '20s' }} />
          <div className="particle" style={{ left: '20%', animationDelay: '2s', animationDuration: '25s' }} />
          <div className="particle" style={{ left: '30%', animationDelay: '4s', animationDuration: '18s' }} />
          <div className="particle" style={{ left: '50%', animationDelay: '1s', animationDuration: '22s' }} />
          <div className="particle" style={{ left: '70%', animationDelay: '3s', animationDuration: '19s' }} />
          <div className="particle" style={{ left: '80%', animationDelay: '5s', animationDuration: '24s' }} />
          <div className="particle" style={{ left: '90%', animationDelay: '2.5s', animationDuration: '21s' }} />
          
          {/* Grid overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
        </div>
        
        {/* Main Hero */}
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 mb-8 text-xs sm:text-sm text-white/80 glass-card rounded-full glow-effect animate-fade-in-up">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="font-medium">2 Free Designs for New Users</span>
            <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          
          {/* Main title with gradient accent */}
          <div className="mb-8 sm:mb-10 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight text-white mb-4">
              Sue&apos;s AI Tattoo
            </h2>
            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight gradient-text-animated">
              Design Generator
            </h2>
          </div>
          
          <p className="text-white/50 text-lg sm:text-xl md:text-2xl font-light max-w-3xl mx-auto mb-10 sm:mb-12 leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            The most affordable AI tattoo generator on the market. Create custom designs 
            instantly, visualize them on your body, and explore <span className="text-white/80 font-medium">100+ styles</span>.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mb-10 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <Link
              href="/generate"
              className="group relative w-full sm:w-auto px-10 sm:px-12 py-5 text-base sm:text-lg font-semibold text-black bg-white transition-all duration-500 overflow-hidden spotlight ripple-effect hover:scale-[1.02]"
              style={{ boxShadow: '0 0 40px rgba(255,255,255,0.15), 0 0 80px rgba(255,255,255,0.05)' }}
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                <svg className="w-5 h-5 transition-all duration-500 group-hover:rotate-12 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Start Creating Now
                <svg className="w-5 h-5 transition-all duration-500 group-hover:translate-x-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>
            </Link>
            <a
              href="#gallery"
              className="group w-full sm:w-auto px-10 sm:px-12 py-5 text-base sm:text-lg font-medium text-white glass-card hover:bg-white/10 transition-all duration-500 hover:scale-[1.02] tilt-card"
            >
              <span className="flex items-center justify-center gap-3">
                <svg className="w-5 h-5 transition-all duration-500 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Explore Styles
                <svg className="w-5 h-5 transition-all duration-500 group-hover:translate-y-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </a>
          </div>
          
          {/* Enhanced social proof */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 text-white/40 text-sm animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center gap-3 glass-card px-5 py-3 rounded-full">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 border-2 border-black/80 animate-float" style={{ animationDelay: '0s' }} />
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 border-2 border-black/80 animate-float" style={{ animationDelay: '-1s' }} />
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-400 border-2 border-black/80 animate-float" style={{ animationDelay: '-2s' }} />
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-400 border-2 border-black/80 animate-float" style={{ animationDelay: '-3s' }} />
              </div>
              <span className="text-white/60 font-medium">1,000+ designs created</span>
            </div>
            <div className="flex items-center gap-2 glass-card px-5 py-3 rounded-full">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 text-yellow-400 drop-shadow-[0_0_3px_rgba(250,204,21,0.5)]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-white/60 font-medium">5.0 rating</span>
            </div>
          </div>
        </div>

        {/* Pricing Highlight - Right below hero */}
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 text-center animate-on-scroll fade-up">
          <div className="relative glass-card p-8 sm:p-10 overflow-hidden">
            {/* Decorative corner accents */}
            <div className="absolute top-0 left-0 w-20 h-20 border-l border-t border-white/20" />
            <div className="absolute bottom-0 right-0 w-20 h-20 border-r border-b border-white/20" />
            
            {/* Price tag badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 text-xs font-medium text-green-400 bg-green-500/10 border border-green-500/20 rounded-full">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Save up to 96% vs competitors
            </div>
            
            <h3 className="text-2xl sm:text-3xl font-light text-white mb-4">
              The Most Affordable AI Tattoo Generator
            </h3>
            <p className="text-white/60 text-sm sm:text-base max-w-2xl mx-auto mb-6 leading-relaxed">
              At just <span className="text-white font-semibold text-lg">$0.20</span> per image, 
              generate dozens of variations and find your perfect design without breaking the bank. 
              Compare that to $5-15 per image on other platforms.
            </p>
            
            {/* Price comparison visual */}
            <div className="flex items-center justify-center gap-6 sm:gap-12 mb-8">
              <div className="text-center group">
                <div className="text-4xl sm:text-5xl font-light text-white neon-text transition-all duration-300 group-hover:scale-110">$0.20</div>
                <div className="text-xs text-purple-400/80 mt-2 font-medium uppercase tracking-wider">Sue&apos;s AI</div>
              </div>
              <div className="relative">
                <div className="text-white/20 text-3xl font-light">vs</div>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>
              <div className="text-center opacity-60">
                <div className="text-4xl sm:text-5xl font-light text-white/40 line-through decoration-red-500/60 decoration-2">$5-15</div>
                <div className="text-xs text-white/30 mt-2 font-medium uppercase tracking-wider">Others</div>
              </div>
            </div>
            
            <Link
              href="/pricing"
              className="group inline-flex items-center gap-3 px-8 py-4 text-sm font-medium text-white glass-card hover:bg-white/10 transition-all duration-500 hover:scale-[1.03] spotlight"
            >
              View All Pricing
              <svg className="w-5 h-5 transition-all duration-500 group-hover:translate-x-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Feature Sections with Alternating Layout */}
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          {/* Section Header */}
          <div className="text-center mb-12 animate-on-scroll fade-up">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="h-px w-8 sm:w-12 bg-gradient-to-r from-transparent to-white/30" />
              <span className="text-white/40 text-xs uppercase tracking-[0.2em]">Features</span>
              <div className="h-px w-8 sm:w-12 bg-gradient-to-l from-transparent to-white/30" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-light text-white">
              Everything You Need to Design Your Perfect Tattoo
            </h3>
          </div>
          
          {/* Feature 1: Custom Prompts - Image Right */}
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12 py-12 border-t border-white/5">
            <div className="flex-1 lg:pr-8 animate-on-scroll fade-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 text-xs font-medium text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded-full">
                <span>01</span>
                <span className="w-1 h-1 rounded-full bg-purple-400" />
                <span>Core Feature</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-light text-white mb-4">
                Create Custom Designs With Your Own Prompts
              </h3>
              <p className="text-white/60 text-sm sm:text-base leading-relaxed mb-4">
                Describe your vision in your own words and watch it come to life. Our AI understands 
                complex, artistic prompts and transforms them into stunning tattoo designs. No templates, 
                no limitations — just your imagination.
              </p>
              <div className="bg-white/5 border border-white/10 p-4 mb-4 hover:bg-white/[0.07] transition-colors duration-300">
                <p className="text-white/40 text-xs uppercase tracking-wide mb-2">Example Prompts</p>
                <ul className="text-white/70 text-sm space-y-2 italic">
                  <li>&quot;Depict the fractal nature of life through sacred geometry&quot;</li>
                  <li>&quot;A phoenix rising from ocean waves in Japanese ink style&quot;</li>
                  <li>&quot;My grandmother&apos;s rose garden with her initials hidden in the petals&quot;</li>
                  <li>&quot;Minimalist solar system with Saturn&apos;s rings as a compass&quot;</li>
                </ul>
              </div>
              <ul className="text-white/50 text-sm space-y-2">
                <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Unlimited creative freedom</li>
                <li className="flex items-center gap-2"><span className="text-green-400">✓</span> AI understands artistic concepts</li>
                <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Generate variations until it&apos;s perfect</li>
              </ul>
            </div>
            <div className="flex-1 w-full lg:w-auto animate-on-scroll fade-right delay-200">
              <div className="relative aspect-[4/3] border border-white/10 overflow-hidden bg-black/50 flex items-center justify-center group tilt-card gradient-overlay">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/5.png"
                  alt="Custom AI tattoo design created from a unique prompt - fractal sacred geometry tattoo"
                  className="max-w-full max-h-full object-contain transition-all duration-700 group-hover:scale-110"
                />
              </div>
            </div>
          </div>

          {/* Feature 2: Visualize On Your Body - Image Left */}
          <div className="flex flex-col lg:flex-row-reverse items-center gap-8 lg:gap-12 py-12 border-t border-white/5">
            <div className="flex-1 lg:pl-8 animate-on-scroll fade-right">
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 text-xs font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full">
                <span>02</span>
                <span className="w-1 h-1 rounded-full bg-blue-400" />
                <span>Visualization</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-light text-white mb-4">
                Visualize Tattoos On Your Actual Body
              </h3>
              <p className="text-white/60 text-sm sm:text-base leading-relaxed mb-4">
                Upload a photo of your arm, chest, back, leg, or any body part and see exactly 
                how your tattoo design will look on YOUR skin before you commit. No more guessing 
                or imagining — see the real result.
              </p>
              <ul className="text-white/50 text-sm space-y-2">
                <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Works with any body part photo</li>
                <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Realistic placement and scaling</li>
                <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Your photos are never stored</li>
              </ul>
            </div>
            <div className="flex-1 w-full lg:w-auto animate-on-scroll fade-left delay-200">
              <div className="relative aspect-[4/3] border border-white/10 overflow-hidden bg-black/50 flex items-center justify-center group tilt-card gradient-overlay">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/6.png"
                  alt="AI tattoo visualized on actual body - see how your tattoo will look before getting inked"
                  className="max-w-full max-h-full object-contain transition-all duration-700 group-hover:scale-110"
                />
              </div>
            </div>
          </div>

          {/* Feature 3: Create From Photos - Image Right */}
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12 py-12 border-t border-white/5">
            <div className="flex-1 lg:pr-8 animate-on-scroll fade-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 text-xs font-medium text-pink-400 bg-pink-500/10 border border-pink-500/20 rounded-full">
                <span>03</span>
                <span className="w-1 h-1 rounded-full bg-pink-400" />
                <span>Photo to Art</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-light text-white mb-4">
                Create Tattoos From Your Own Photos
              </h3>
              <p className="text-white/60 text-sm sm:text-base leading-relaxed mb-4">
                Turn photos of loved ones, pets, children, or any meaningful image into beautiful 
                tattoo designs. Perfect for memorial tattoos, portrait pieces, or transforming 
                cherished memories into permanent art.
              </p>
              <ul className="text-white/50 text-sm space-y-2">
                <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Family portraits to tattoo art</li>
                <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Pet photos transformed</li>
                <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Memorial and tribute designs</li>
              </ul>
            </div>
            <div className="flex-1 w-full lg:w-auto animate-on-scroll fade-right delay-200">
              <div className="relative aspect-[4/3] border border-white/10 overflow-hidden bg-black/50 flex items-center justify-center group tilt-card gradient-overlay">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/10.png"
                  alt="Transform your photos into tattoo designs - family portraits, pets, and meaningful images"
                  className="max-w-full max-h-full object-contain transition-all duration-700 group-hover:scale-110"
                />
              </div>
            </div>
          </div>

          {/* Feature 4: Mix Styles - Image Left */}
          <div className="flex flex-col lg:flex-row-reverse items-center gap-8 lg:gap-12 py-12 border-t border-white/5">
            <div className="flex-1 lg:pl-8 animate-on-scroll fade-right">
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 text-xs font-medium text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-full">
                <span>04</span>
                <span className="w-1 h-1 rounded-full bg-orange-400" />
                <span>Style Mixing</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-light text-white mb-4">
                Combine 100+ Styles For Unique Designs
              </h3>
              <p className="text-white/60 text-sm sm:text-base leading-relaxed mb-4">
                Mix mandala with geometric, traditional with watercolor, realism with abstract, 
                or any combination you can imagine. Our AI understands tattoo styles and lets 
                you create truly one-of-a-kind designs.
              </p>
              <ul className="text-white/50 text-sm space-y-2">
                <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Mandala, geometric, tribal, traditional</li>
                <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Realism, watercolor, blackwork, dotwork</li>
                <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Japanese, American traditional, neo-traditional</li>
              </ul>
            </div>
            <div className="flex-1 w-full lg:w-auto animate-on-scroll fade-left delay-200">
              <div className="relative aspect-[4/3] border border-white/10 overflow-hidden bg-black/50 flex items-center justify-center group tilt-card gradient-overlay">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/8.png"
                  alt="Multiple tattoo styles combined - mandala, geometric, traditional, watercolor and more"
                  className="max-w-full max-h-full object-contain transition-all duration-700 group-hover:scale-110"
                />
              </div>
            </div>
          </div>

          {/* Feature 5: Parlor CRM - Image Right */}
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12 py-12 border-t border-white/5">
            <div className="flex-1 lg:pr-8 animate-on-scroll fade-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <span>05</span>
                <span className="w-1 h-1 rounded-full bg-emerald-400" />
                <span>For Professionals</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-light text-white mb-4">
                Built For Tattoo Parlors & Artists
              </h3>
              <p className="text-white/60 text-sm sm:text-base leading-relaxed mb-4">
                Switch to Parlor Mode and unlock a full CRM system. Manage your customers, 
                track their design history, organize generated tattoos by client, and streamline 
                your consultation process.
              </p>
              <ul className="text-white/50 text-sm space-y-2">
                <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Customer management system</li>
                <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Track designs per client</li>
                <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Professional workflow tools</li>
              </ul>
            </div>
            <div className="flex-1 w-full lg:w-auto animate-on-scroll fade-right delay-200">
              <div className="relative aspect-[4/3] border border-white/10 overflow-hidden bg-black/50 flex items-center justify-center group tilt-card gradient-overlay">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/11.png"
                  alt="Tattoo parlor CRM system - manage customers and track design history"
                  className="max-w-full max-h-full object-contain transition-all duration-700 group-hover:scale-110"
                />
              </div>
            </div>
          </div>

          {/* Feature 6: History - Image Left */}
          <div className="flex flex-col lg:flex-row-reverse items-center gap-8 lg:gap-12 py-12 border-t border-white/5">
            <div className="flex-1 lg:pl-8 animate-on-scroll fade-right">
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 text-xs font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
                <span>06</span>
                <span className="w-1 h-1 rounded-full bg-cyan-400" />
                <span>History</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-light text-white mb-4">
                Save & Access Your Design History
              </h3>
              <p className="text-white/60 text-sm sm:text-base leading-relaxed mb-4">
                Every design you generate is automatically saved to your personal history. 
                Come back anytime to view past designs, compare variations, refine your ideas, 
                or show your tattoo artist exactly what you want.
              </p>
              <ul className="text-white/50 text-sm space-y-2">
                <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Unlimited design history</li>
                <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Easy to share with your artist</li>
                <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Compare and refine over time</li>
              </ul>
            </div>
            <div className="flex-1 w-full lg:w-auto animate-on-scroll fade-left delay-200">
              <div className="relative aspect-[4/3] border border-white/10 overflow-hidden bg-black/50 flex items-center justify-center group tilt-card gradient-overlay">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/12.png"
                  alt="Design history page - save and access all your generated tattoo designs"
                  className="max-w-full max-h-full object-contain transition-all duration-700 group-hover:scale-110"
                />
              </div>
            </div>
          </div>

          {/* Reviews Section */}
          <div className="py-16 border-t border-white/5">
            <div className="text-center mb-12 animate-on-scroll fade-up line-reveal">
              <div className="inline-flex items-center gap-3 mb-4">
                <div className="h-px w-8 sm:w-12 bg-gradient-to-r from-transparent to-white/30" />
                <span className="text-white/40 text-xs uppercase tracking-[0.2em]">Testimonials</span>
                <div className="h-px w-8 sm:w-12 bg-gradient-to-l from-transparent to-white/30" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-light text-white mb-3">
                What Our Users Say
              </h3>
              <p className="text-white/50 text-sm sm:text-base">
                Join thousands creating their perfect tattoo designs
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Review 1 */}
              <div className="animate-on-scroll fade-up glass-card p-6 card-lift">
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-white/70 text-sm leading-relaxed mb-4">
                  &quot;I was skeptical about AI-generated tattoos, but this blew my mind. I described a 
                  memorial piece for my grandfather and it captured exactly what I envisioned. My artist 
                  used it as the base and we refined it together. Getting inked next week!&quot;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-medium text-sm">
                    MK
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">Marcus K.</p>
                    <p className="text-white/40 text-xs">First tattoo • Memorial piece</p>
                  </div>
                </div>
              </div>

              {/* Review 2 */}
              <div className="animate-on-scroll fade-up delay-100 glass-card p-6 card-lift">
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-white/70 text-sm leading-relaxed mb-4">
                  &quot;As a tattoo artist, this has become essential for my consultations. Clients come 
                  in with vague ideas, I generate 10-15 variations in minutes, and we find the perfect 
                  direction together. The Parlor Mode is a game changer for my workflow.&quot;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-medium text-sm">
                    JR
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">Jamie R.</p>
                    <p className="text-white/40 text-xs">Tattoo Artist • 8 years experience</p>
                  </div>
                </div>
              </div>

              {/* Review 3 */}
              <div className="animate-on-scroll fade-up delay-200 glass-card p-6 card-lift">
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-white/70 text-sm leading-relaxed mb-4">
                  &quot;The body visualization feature is incredible. I uploaded a photo of my arm and 
                  could actually see how different designs would look on MY skin tone and body shape. 
                  No more guessing — I knew exactly what I wanted before booking my appointment.&quot;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-medium text-sm">
                    AL
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">Ashley L.</p>
                    <p className="text-white/40 text-xs">Sleeve design • Geometric style</p>
                  </div>
                </div>
              </div>

              {/* Review 4 */}
              <div className="animate-on-scroll fade-up delay-100 glass-card p-6 card-lift">
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-white/70 text-sm leading-relaxed mb-4">
                  &quot;I turned a photo of my late dog into the most beautiful watercolor tattoo design. 
                  The AI captured his personality perfectly. Other generators I tried made him look 
                  generic, but this one actually looked like HIM. Worth every penny.&quot;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-medium text-sm">
                    DP
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">David P.</p>
                    <p className="text-white/40 text-xs">Pet memorial • Watercolor style</p>
                  </div>
                </div>
              </div>

              {/* Review 5 */}
              <div className="animate-on-scroll fade-up delay-200 glass-card p-6 card-lift">
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-white/70 text-sm leading-relaxed mb-4">
                  &quot;$0.20 per image is insane. I generated over 50 variations exploring different 
                  styles before finding the perfect Japanese-geometric fusion. On other sites that 
                  would have cost me $250+. This is how AI tools should be priced.&quot;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-medium text-sm">
                    SK
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">Sarah K.</p>
                    <p className="text-white/40 text-xs">Back piece • Japanese fusion</p>
                  </div>
                </div>
              </div>

              {/* Review 6 */}
              <div className="animate-on-scroll fade-up delay-300 glass-card p-6 card-lift">
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-white/70 text-sm leading-relaxed mb-4">
                  &quot;I&apos;ve been wanting a mandala tattoo for years but could never find the right 
                  design. Asked the AI to combine mandala with sacred geometry and add subtle 
                  lotus elements — it understood exactly what I meant. Finally getting it done!&quot;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white font-medium text-sm">
                    ER
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">Elena R.</p>
                    <p className="text-white/40 text-xs">Shoulder piece • Mandala style</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="border-t border-white/5 pt-12 pb-4 animate-on-scroll fade-up">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
              <div className="group text-center p-4 hover:bg-white/[0.02] transition-all duration-300 rounded-lg">
                <div className="inline-flex items-center justify-center w-10 h-10 mb-3 rounded-full bg-yellow-500/10 text-yellow-400 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-white/60 text-sm font-medium">Instant Generation</p>
                <p className="text-white/30 text-xs mt-1">Results in seconds</p>
              </div>
              <div className="group text-center p-4 hover:bg-white/[0.02] transition-all duration-300 rounded-lg">
                <div className="inline-flex items-center justify-center w-10 h-10 mb-3 rounded-full bg-green-500/10 text-green-400 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <p className="text-white/60 text-sm font-medium">Privacy First</p>
                <p className="text-white/30 text-xs mt-1">Photos never stored</p>
              </div>
              <div className="group text-center p-4 hover:bg-white/[0.02] transition-all duration-300 rounded-lg">
                <div className="inline-flex items-center justify-center w-10 h-10 mb-3 rounded-full bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <p className="text-white/60 text-sm font-medium">Advanced AI</p>
                <p className="text-white/30 text-xs mt-1">Multiple models</p>
              </div>
              <div className="group text-center p-4 hover:bg-white/[0.02] transition-all duration-300 rounded-lg">
                <div className="inline-flex items-center justify-center w-10 h-10 mb-3 rounded-full bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <p className="text-white/60 text-sm font-medium">Secure Payments</p>
                <p className="text-white/30 text-xs mt-1">Stripe protected</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-950/20 to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.15),transparent_70%)]" />
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-white mb-6">
            Ready to Create Your <span className="text-purple-400">Perfect Tattoo</span>?
          </h2>
          <p className="text-white/50 text-lg sm:text-xl font-light max-w-2xl mx-auto mb-10 leading-relaxed">
            Turn your ideas into stunning ink-ready designs in seconds. Whether you have a clear vision 
            or need inspiration, our AI brings your tattoo dreams to life.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mb-8">
            <Link
              href="/generate"
              className="group relative w-full sm:w-auto px-10 sm:px-12 py-5 text-base sm:text-lg font-semibold text-black bg-white transition-all duration-500 overflow-hidden spotlight ripple-effect hover:scale-[1.02]"
              style={{ boxShadow: '0 0 40px rgba(255,255,255,0.15), 0 0 80px rgba(255,255,255,0.05)' }}
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                <svg className="w-5 h-5 transition-all duration-500 group-hover:rotate-12 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Start Generating Now
                <svg className="w-5 h-5 transition-all duration-500 group-hover:translate-x-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>
            </Link>
            <a
              href="#gallery"
              className="group w-full sm:w-auto px-10 sm:px-12 py-5 text-base sm:text-lg font-medium text-white glass-card hover:bg-white/10 transition-all duration-500 hover:scale-[1.02]"
            >
              <span className="flex items-center justify-center gap-3">
                <svg className="w-5 h-5 transition-all duration-500 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Explore Styles
                <svg className="w-5 h-5 transition-all duration-500 group-hover:translate-y-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </a>
          </div>
          
          <p className="text-white/40 text-sm">
            No credit card required • 2 free designs to start
          </p>
        </div>
      </section>

      {/* Gallery Header */}
      <div id="gallery" className="bg-black border-b border-white/5 py-10 text-center">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-light tracking-tight text-white mb-3">
          Garden of Tattoo Styles
        </h2>
        <p className="text-white/60 text-sm sm:text-base font-light max-w-xl mx-auto px-4">
          Explore 100&apos;s of styles — check them out to see which ones you love
        </p>
      </div>

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
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-white/30 text-xs font-light tracking-wide">
              © {new Date().getFullYear()} Sue's Tattoo Studio
            </p>
            <div className="flex items-center gap-4">
              <Link
                href="/terms"
                className="text-xs text-white/50 hover:text-white/70 font-light tracking-wide transition-colors"
              >
                Terms
              </Link>
              <Link
                href="/privacy"
                className="text-xs text-white/50 hover:text-white/70 font-light tracking-wide transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="/support"
                className="text-xs text-white/50 hover:text-white/70 font-light tracking-wide transition-colors"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
