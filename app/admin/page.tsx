"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import AuthButton from "../components/AuthButton";
import { storage } from "@/lib/firebase";
import { ref, getDownloadURL } from "firebase/storage";

interface EstimationResult {
  fileName: string;
  url?: string;
  status: string;
  price?: number;
  duration?: number;
  reasoning?: string;
  message?: string;
  error?: string;
}

interface MonthlyStat {
  yearMonth: string;
  year: number;
  month: number;
  images: number;
  generations: number;
  customers: number;
}

interface UserStat {
  userId: string;
  email: string;
  totalGenerations: number;
  totalImages: number;
  totalCustomers: number;
  monthlyStats: MonthlyStat[];
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimationProgress, setEstimationProgress] = useState<string>("");
  const [estimationResults, setEstimationResults] = useState<EstimationResult[]>([]);
  const [estimationError, setEstimationError] = useState<string | null>(null);
  const [forceReestimate, setForceReestimate] = useState(false);
  const [firestoreWarning, setFirestoreWarning] = useState<string | null>(null);
  const [firestoreApiUrl, setFirestoreApiUrl] = useState<string | null>(null);
  const [startFromFileName, setStartFromFileName] = useState<string>("tessellation_back");
  const [userStats, setUserStats] = useState<UserStat[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [totalStats, setTotalStats] = useState<{ totalUsers: number; totalGenerations: number; totalImages: number; totalCustomers: number } | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [showMonthlyView, setShowMonthlyView] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [userDetailsLoading, setUserDetailsLoading] = useState(false);
  const [userDetailsError, setUserDetailsError] = useState<string | null>(null);
  const [imageUrlMap, setImageUrlMap] = useState<Record<string, string>>({});

  // Load user stats
  const loadUserStats = async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const params = new URLSearchParams();
      if (selectedYear !== null) params.append("year", selectedYear.toString());
      if (selectedMonth !== null) params.append("month", selectedMonth.toString());
      
      const url = `/api/admin/user-stats${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setUserStats(data.users || []);
        setTotalStats({
          totalUsers: data.summary?.totalUsers || 0,
          totalGenerations: data.summary?.totalGenerations || 0,
          totalImages: data.summary?.totalImages || 0,
          totalCustomers: data.summary?.totalCustomers || 0,
        });
      } else {
        const errorData = await res.json();
        setStatsError(errorData.error || "Failed to load user statistics");
      }
    } catch (err) {
      console.error("Failed to load user stats:", err);
      setStatsError("Failed to load user statistics");
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      loadUserStats();
    }
  }, [authLoading, user, selectedYear, selectedMonth]);

  // Generate year/month options for dropdowns
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  
  // Generate years, excluding 2025 and 2024
  const allYearOptions = Array.from({ length: 3 }, (_, i) => currentYear - i);
  const yearOptions = allYearOptions.filter((year) => year !== 2025 && year !== 2024);
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Load user details when email is clicked
  const loadUserDetails = async (userId: string) => {
    setSelectedUserId(userId);
    setUserDetailsLoading(true);
    setUserDetailsError(null);
    setImageUrlMap({}); // Clear previous URLs
    try {
      const res = await fetch(`/api/admin/user-details/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setUserDetails(data);
        
        // Generate download URLs for all image paths (same as customer detail page)
        const urlMap: Record<string, string> = {};
        const allImagePaths: string[] = [];
        
        // Collect all image paths from all generations
        data.customers?.forEach((customer: any) => {
          customer.generations?.forEach((gen: any) => {
            if (gen.images && Array.isArray(gen.images)) {
              allImagePaths.push(...gen.images);
            }
          });
        });
        
        // Generate URLs for all images
        await Promise.all(
          allImagePaths.map(async (imagePath: string) => {
            try {
              const imageRef = ref(storage, imagePath);
              const url = await getDownloadURL(imageRef);
              urlMap[imagePath] = url;
            } catch (err) {
              console.error(`Failed to get download URL for ${imagePath}:`, err);
            }
          })
        );
        
        setImageUrlMap(urlMap);
      } else {
        const errorData = await res.json();
        setUserDetailsError(errorData.error || "Failed to load user details");
      }
    } catch (err) {
      console.error("Failed to load user details:", err);
      setUserDetailsError("Failed to load user details");
    } finally {
      setUserDetailsLoading(false);
    }
  };

  const closeUserDetails = () => {
    setSelectedUserId(null);
    setUserDetails(null);
    setUserDetailsError(null);
  };

  const handleEstimateAll = async (startFrom?: string) => {
    setIsEstimating(true);
    setEstimationError(null);
    setEstimationProgress("Loading tattoos...");
    setEstimationResults([]);
    setFirestoreWarning(null);
    setFirestoreApiUrl(null);

    try {
      // First, get all tattoos
      const tattoosResponse = await fetch("/api/get-tattoos", {
        method: "GET",
      });

      let tattoos: any[] = [];
      if (tattoosResponse.ok) {
        const tattoosData = await tattoosResponse.json();
        tattoos = tattoosData.tattoos || [];
      } else {
        // Fallback: fetch from the estimate endpoint to get tattoo list
        const fallbackResponse = await fetch("/api/estimate-tattoo", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            processAll: false, // Just to get the list
            listOnly: true,
          }),
        });
        // If that doesn't work, we'll process sequentially
      }

      // If startFrom is provided, filter tattoos to start from that file
      if (startFrom) {
        const startIndex = tattoos.findIndex((t) => t.fileName === startFrom || t.fileName.startsWith(startFrom));
        if (startIndex === -1) {
          throw new Error(`Tattoo with fileName starting with "${startFrom}" not found`);
        }
        tattoos = tattoos.slice(startIndex);
        setEstimationProgress(`Starting from ${startFrom}: ${tattoos.length} tattoos to process`);
      }

      // If we can't get the list, process all at once (fallback)
      if (tattoos.length === 0) {
        const response = await fetch("/api/estimate-tattoo", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            processAll: !startFrom,
            startFrom: startFrom,
            forceReestimate: forceReestimate,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to estimate tattoos");
        }

        setEstimationProgress(
          `Processed ${data.processed} tattoos${data.errors > 0 ? ` (${data.errors} errors)` : ""}`
        );
        setEstimationResults(data.results || []);
        
        if (data.warning) {
          setFirestoreWarning(data.warning);
        }
        
        if (data.firestoreApiUrl) {
          setFirestoreApiUrl(data.firestoreApiUrl);
        }
        
        if (data.errors && data.errors.length > 0) {
          setEstimationError(`${data.errors.length} tattoos failed to process. Check results below.`);
        }
        setIsEstimating(false);
        return;
      }

      // Process tattoos sequentially and show results as they come in
      let processed = 0;
      let errors = 0;

      for (const tattoo of tattoos) {
        try {
          setEstimationProgress(
            `Processing ${processed + 1} of ${tattoos.length}: ${tattoo.fileName}...`
          );

          const response = await fetch("/api/estimate-tattoo", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              fileName: tattoo.fileName,
              forceReestimate: forceReestimate,
            }),
          });

          const data = await response.json();

          if (response.ok && data.results && data.results.length > 0) {
            const result = data.results[0];
            // Add result to the list immediately
            setEstimationResults((prev) => [...prev, result]);
            processed++;

            if (data.warning) {
              setFirestoreWarning(data.warning);
            }
            
            if (data.firestoreApiUrl) {
              setFirestoreApiUrl(data.firestoreApiUrl);
            }
          } else {
            // Error for this tattoo
            setEstimationResults((prev) => [
              ...prev,
              {
                fileName: tattoo.fileName,
                url: tattoo.url,
                status: "error",
                error: data.error || "Failed to estimate",
              },
            ]);
            errors++;
          }
        } catch (error) {
          console.error(`Error processing ${tattoo.fileName}:`, error);
          setEstimationResults((prev) => [
            ...prev,
            {
              fileName: tattoo.fileName,
              url: tattoo.url,
              status: "error",
              error: error instanceof Error ? error.message : "Unknown error",
            },
          ]);
          errors++;
        }
      }

      setEstimationProgress(
        `Completed: ${processed} processed${errors > 0 ? `, ${errors} errors` : ""}`
      );

      if (errors > 0) {
        setEstimationError(`${errors} tattoos failed to process.`);
      }
    } catch (error) {
      console.error("Estimation error:", error);
      setEstimationError(
        error instanceof Error ? error.message : "Failed to estimate tattoos"
      );
    } finally {
      setIsEstimating(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-light tracking-tight mb-2">
              Admin Panel
            </h1>
            <p className="text-sm text-white/60">
              View user statistics and generated photos
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Gallery
            </Link>
            <AuthButton />
          </div>
        </div>

        {/* Auth check */}
        {authLoading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-white/20 border-t-white mb-4" />
            <p className="text-white/60 text-sm">Loading...</p>
          </div>
        ) : !user ? (
          <div className="text-center py-20 space-y-4">
            <h2 className="text-xl font-light">Sign in Required</h2>
            <p className="text-sm text-white/60">
              You need to sign in to access the admin panel.
            </p>
            <AuthButton />
            </div>
        ) : (
          <>
            {/* User Statistics */}
            <div className="space-y-6">
                {/* Filters and View Toggle */}
                <div className="border border-white/10 bg-black/60 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-light">Filters</h2>
                <button
                      onClick={() => setShowMonthlyView(!showMonthlyView)}
                      className="text-xs text-white/70 hover:text-white border border-white/30 px-3 py-1 rounded-full transition-colors"
                >
                      {showMonthlyView ? "Show Summary" : "Show Monthly View"}
                </button>
              </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-white/60">Year:</label>
                      <select
                        value={selectedYear || ""}
                        onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : null)}
                        className="px-3 py-1 bg-black border border-white/20 text-white text-sm outline-none focus:border-white"
                      >
                        <option value="">All Years</option>
                        {yearOptions.map((year) => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-white/60">Month:</label>
                      <select
                        value={selectedMonth || ""}
                        onChange={(e) => setSelectedMonth(e.target.value ? parseInt(e.target.value) : null)}
                        disabled={selectedYear === null}
                        className="px-3 py-1 bg-black border border-white/20 text-white text-sm outline-none focus:border-white disabled:opacity-50"
                      >
                        <option value="">All Months</option>
                        {monthOptions.map((month) => (
                          <option key={month} value={month}>{monthNames[month - 1]}</option>
                        ))}
                      </select>
            </div>
                    {(selectedYear !== null || selectedMonth !== null) && (
            <button
                        onClick={() => {
                          setSelectedYear(null);
                          setSelectedMonth(null);
                        }}
                        className="text-xs text-white/70 hover:text-white border border-white/30 px-3 py-1 rounded-full transition-colors"
            >
                        Clear Filters
            </button>
                    )}
                  </div>
          </div>

                {/* Summary Cards */}
                {totalStats && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="border border-white/10 bg-black/60 p-4">
                      <div className="text-xs text-white/60 uppercase tracking-[0.16em] mb-1">
                        Total Users
                      </div>
                      <div className="text-2xl font-light text-white">
                        {totalStats.totalUsers}
                      </div>
                    </div>
                    <div className="border border-white/10 bg-black/60 p-4">
                      <div className="text-xs text-white/60 uppercase tracking-[0.16em] mb-1">
                        Total Generations
                      </div>
                      <div className="text-2xl font-light text-white">
                        {totalStats.totalGenerations}
                      </div>
                    </div>
                    <div className="border border-white/10 bg-black/60 p-4">
                      <div className="text-xs text-white/60 uppercase tracking-[0.16em] mb-1">
                        Total Images
                      </div>
                      <div className="text-2xl font-light text-white">
                        {totalStats.totalImages}
              </div>
            </div>
                    <div className="border border-white/10 bg-black/60 p-4">
                      <div className="text-xs text-white/60 uppercase tracking-[0.16em] mb-1">
                        Total Customers
                      </div>
                      <div className="text-2xl font-light text-white">
                        {totalStats.totalCustomers}
                      </div>
              </div>
            </div>
          )}

                {/* User Stats Table */}
                <div className="border border-white/10 bg-black/60 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-light">Photos Generated per User</h2>
                    <button
                      onClick={loadUserStats}
                      disabled={statsLoading}
                      className="text-xs text-white/70 hover:text-white border border-white/30 px-3 py-1 rounded-full disabled:opacity-50"
                    >
                      {statsLoading ? "Loading..." : "Refresh"}
                    </button>
                  </div>

                  {statsError && (
                    <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 text-red-200 text-sm">
                      {statsError}
            </div>
          )}

                  {statsLoading ? (
                    <div className="text-center py-12">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white mb-4" />
                      <p className="text-white/60 text-sm">Loading user statistics...</p>
                    </div>
                  ) : userStats.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-white/60 text-sm">
                        No user statistics available yet. Users will appear here after they generate images.
              </p>
            </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="pb-3 text-xs text-white/60 uppercase tracking-[0.16em] font-normal">
                              Email
                            </th>
                            <th className="pb-3 text-xs text-white/60 uppercase tracking-[0.16em] font-normal">
                              Generations
                            </th>
                            <th className="pb-3 text-xs text-white/60 uppercase tracking-[0.16em] font-normal">
                              Images Generated
                            </th>
                            <th className="pb-3 text-xs text-white/60 uppercase tracking-[0.16em] font-normal">
                              Customers
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {userStats.map((stat) => (
                            <tr
                              key={stat.userId}
                              className="border-b border-white/5 hover:bg-white/5"
                            >
                              <td className="py-3 text-sm">
                                <button
                                  onClick={() => loadUserDetails(stat.userId)}
                                  className="text-white/90 hover:text-white hover:underline cursor-pointer"
                                >
                                  {stat.email}
                                </button>
                              </td>
                            <td className="py-3 text-sm text-white/70">
                              {stat.totalGenerations}
                            </td>
                            <td className="py-3 text-sm text-white/70">
                              {stat.totalImages}
                            </td>
                            <td className="py-3 text-sm text-white/70">
                              {stat.totalCustomers}
                            </td>
                          </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

            {/* User Details Modal */}
            {selectedUserId && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-y-auto py-4">
                <div className="bg-black border border-white/30 w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
                  <div className="sticky top-0 bg-black border-b border-white/10 p-4 flex items-center justify-between">
                    <h2 className="text-xl font-light">
                      Customer Details for {userStats.find(s => s.userId === selectedUserId)?.email}
                    </h2>
                    <button
                      onClick={closeUserDetails}
                      className="text-white/60 hover:text-white text-2xl leading-none"
                    >
                      ×
                    </button>
                  </div>

                  <div className="p-6">
                    {userDetailsLoading ? (
                      <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white mb-4" />
                        <p className="text-white/60 text-sm">Loading customer details...</p>
                      </div>
                    ) : userDetailsError ? (
                      <div className="p-4 bg-red-900/30 border border-red-500/50 text-red-200 text-sm">
                        {userDetailsError}
                      </div>
                    ) : userDetails && userDetails.customers ? (
                      <div className="space-y-8">
                        {/* Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="border border-white/10 bg-black/60 p-4">
                            <div className="text-xs text-white/60 uppercase tracking-[0.16em] mb-1">
                              Total Customers
                            </div>
                            <div className="text-2xl font-light text-white">
                              {userDetails.totalCustomers}
                            </div>
                          </div>
                          <div className="border border-white/10 bg-black/60 p-4">
                            <div className="text-xs text-white/60 uppercase tracking-[0.16em] mb-1">
                              Total Generations
                            </div>
                            <div className="text-2xl font-light text-white">
                              {userDetails.totalGenerations}
                            </div>
                          </div>
                          <div className="border border-white/10 bg-black/60 p-4">
                            <div className="text-xs text-white/60 uppercase tracking-[0.16em] mb-1">
                              Total Images
                            </div>
                            <div className="text-2xl font-light text-white">
                              {userDetails.totalImages}
                            </div>
                          </div>
                        </div>

                        {/* Customers List */}
                        {userDetails.customers.length === 0 ? (
                          <div className="text-center py-12">
                            <p className="text-white/60 text-sm">No customers found for this user.</p>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {userDetails.customers.map((customer: any) => (
                              <div
                                key={customer.id}
                                className="border border-white/10 bg-black/60 p-6 space-y-4"
                              >
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h3 className="text-lg font-light text-white mb-1">
                                      {customer.name}
                                    </h3>
                                    <p className="text-sm text-white/60">{customer.email}</p>
                                    {customer.phone && (
                                      <p className="text-sm text-white/60">{customer.phone}</p>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs text-white/60 uppercase tracking-[0.16em] mb-1">
                                      Generations
                                    </div>
                                    <div className="text-lg font-light text-white">
                                      {customer.generations.length}
                                    </div>
                                    <div className="text-xs text-white/60 uppercase tracking-[0.16em] mt-2 mb-1">
                                      Images
                                    </div>
                                    <div className="text-lg font-light text-white">
                                      {customer.totalImages}
                                    </div>
                                  </div>
                                </div>

                                {/* Generations and Images */}
                                {customer.generations.length > 0 && (
                                  <div className="space-y-4">
                                    {customer.generations.map((generation: any, genIdx: number) => (
                                      <div
                                        key={genIdx}
                                        className="border-t border-white/5 pt-4 space-y-3"
                                      >
                                        <div className="text-xs text-white/50">
                                          <div>Model: {generation.model}</div>
                                          <div>Prompt: {generation.prompt.substring(0, 100)}...</div>
                                          <div>
                                            Created: {new Date(generation.createdAt).toLocaleString()}
                                          </div>
                                        </div>
                                        {generation.images && generation.images.length > 0 ? (
                                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                            {generation.images.map((imagePath: string, imgIdx: number) => {
                                              const imageUrl = imageUrlMap[imagePath];
                                              return (
                                                <div
                                                  key={imgIdx}
                                                  className="relative aspect-square bg-black border border-white/10 overflow-hidden group"
                                                >
                                                  {imageUrl ? (
                                                    <img
                                                      src={imageUrl}
                                                      alt={`Generation ${genIdx + 1} - Image ${imgIdx + 1}`}
                                                      className="w-full h-full object-cover"
                                                      loading="lazy"
                                                      onError={(e) => {
                                                        console.error(`[Admin] Failed to load image ${imgIdx + 1} from path: ${imagePath}`);
                                                        const target = e.target as HTMLImageElement;
                                                        target.style.display = 'none';
                                                        const parent = target.parentElement;
                                                        if (parent) {
                                                          parent.innerHTML = '<div class="flex items-center justify-center h-full text-xs text-white/40">Failed to load</div>';
                                                        }
                                                      }}
                                                    />
                                                  ) : (
                                                    <div className="flex items-center justify-center h-full text-xs text-white/40">
                                                      Loading...
                          </div>
                        )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        ) : (
                                          <div className="text-xs text-white/40 italic">
                                            No images available for this generation
                      </div>
                    )}
                  </div>
                                    ))}
                    </div>
                  )}
                </div>
              ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
            </div>
          </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

