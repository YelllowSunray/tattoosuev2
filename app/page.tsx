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
      <section className="relative border-b border-white/5 bg-gradient-to-b from-black via-black/95 to-black">
        {/* Main Hero */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light tracking-tight text-white mb-4 sm:mb-6">
            Sue&apos;s AI Tattoo Design Generator
          </h2>
          <p className="text-white/60 text-sm sm:text-base md:text-lg font-light max-w-2xl mx-auto mb-6 sm:mb-8 leading-relaxed">
            The most affordable AI tattoo generator on the market. Create custom tattoo designs 
            instantly, visualize them on your actual body, and explore hundreds of styles.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-6">
            <Link
              href="/generate"
              className="w-full sm:w-auto px-6 sm:px-8 py-3 text-sm sm:text-base font-medium text-black bg-white hover:bg-zinc-200 transition-colors"
            >
              Generate Your Design
            </Link>
            <a
              href="#gallery"
              className="w-full sm:w-auto px-6 sm:px-8 py-3 text-sm sm:text-base font-medium text-white border border-white/30 hover:border-white/50 hover:bg-white/5 transition-colors"
            >
              Browse Gallery
            </a>
          </div>
          </div>

        {/* Pricing Highlight - Right below hero */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 text-center">
          <div className="bg-white/5 border border-white/10 p-6 sm:p-8">
            <h3 className="text-xl sm:text-2xl font-light text-white mb-3">
              The Most Affordable AI Tattoo Generator
            </h3>
            <p className="text-white/60 text-sm sm:text-base max-w-2xl mx-auto mb-4">
              At just <span className="text-white font-medium">2 credits ($0.20) per image</span>, 
              generate dozens of variations and find your perfect design without breaking the bank. 
              Compare that to $5-15 per image on other platforms.
            </p>
            <Link
              href="/pricing"
              className="inline-block px-6 py-3 text-sm font-medium text-white border border-white/30 hover:border-white/50 hover:bg-white/5 transition-colors"
            >
              View Pricing
            </Link>
          </div>
        </div>

        {/* Feature Sections with Alternating Layout */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          
          {/* Feature 1: Visualize On Your Body - Image Right */}
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12 py-12 border-t border-white/5">
            <div className="flex-1 lg:pr-8">
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
            <div className="flex-1 w-full lg:w-auto">
              <div className="relative aspect-[4/3] border border-white/10 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/6.png"
                  alt="AI tattoo visualized on actual body - see how your tattoo will look before getting inked"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Feature 2: Create From Photos - Image Left */}
          <div className="flex flex-col lg:flex-row-reverse items-center gap-8 lg:gap-12 py-12 border-t border-white/5">
            <div className="flex-1 lg:pl-8">
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
            <div className="flex-1 w-full lg:w-auto">
              <div className="relative aspect-[4/3] border border-white/10 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/10.png"
                  alt="Transform your photos into tattoo designs - family portraits, pets, and meaningful images"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Feature 3: Mix Styles - Image Right */}
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12 py-12 border-t border-white/5">
            <div className="flex-1 lg:pr-8">
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
            <div className="flex-1 w-full lg:w-auto">
              <div className="relative aspect-[4/3] border border-white/10 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/8.png"
                  alt="Multiple tattoo styles combined - mandala, geometric, traditional, watercolor and more"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Feature 4: Parlor CRM - Image Left */}
          <div className="flex flex-col lg:flex-row-reverse items-center gap-8 lg:gap-12 py-12 border-t border-white/5">
            <div className="flex-1 lg:pl-8">
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
            <div className="flex-1 w-full lg:w-auto">
              <div className="relative aspect-[4/3] border border-white/10 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/11.png"
                  alt="Tattoo parlor CRM system - manage customers and track design history"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Feature 5: History - Image Right */}
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12 py-12 border-t border-white/5">
            <div className="flex-1 lg:pr-8">
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
            <div className="flex-1 w-full lg:w-auto">
              <div className="relative aspect-[4/3] border border-white/10 overflow-hidden bg-black/50 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/12.png"
                  alt="Design history page - save and access all your generated tattoo designs"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-white/40 text-xs sm:text-sm border-t border-white/5 pt-8">
            <div className="flex items-center gap-2">
              <span>⚡</span>
              <span>Instant Generation</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🔒</span>
              <span>Photos Never Stored</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🎯</span>
              <span>Multiple AI Models</span>
            </div>
            <div className="flex items-center gap-2">
              <span>💳</span>
              <span>Secure Payments</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main id="gallery" className="relative flex">
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
