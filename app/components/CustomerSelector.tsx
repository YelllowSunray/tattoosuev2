"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface CustomerSelectorProps {
  selectedCustomerId: string | null;
  onSelectCustomer: (customerId: string | null) => void;
  onCreateNew?: () => void;
  hideLabel?: boolean;
  placeholder?: string;
}

export default function CustomerSelector({
  selectedCustomerId,
  onSelectCustomer,
  onCreateNew,
  hideLabel = false,
  placeholder,
}: CustomerSelectorProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    
    async function loadCustomers() {
      if (!user) return; // Additional check for TypeScript
      setLoading(true);
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/customers", {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setCustomers(data.customers || []);
        }
      } catch (error) {
        console.error("Failed to load customers:", error);
      } finally {
        setLoading(false);
      }
    }
    loadCustomers();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Get 3 most recent customers (customers are already sorted by createdAt desc from API)
  const recentCustomers = customers.slice(0, 3);

  const filteredCustomers = customers.filter((customer) => {
    if (!searchQuery.trim()) return false;
    const query = searchQuery.toLowerCase();
    return (
      customer.name.toLowerCase().includes(query) ||
      customer.email.toLowerCase().includes(query) ||
      (customer.phone && customer.phone.toLowerCase().includes(query))
    );
  });

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const handleSelect = (customerId: string) => {
    onSelectCustomer(customerId);
    setSearchQuery("");
    setShowResults(false);
  };

  const handleClear = () => {
    onSelectCustomer(null);
    setSearchQuery("");
    setShowResults(false);
  };

  return (
    <div className="space-y-2">
      {!hideLabel && (
        <label className={`block text-xs uppercase tracking-[0.16em] ${
          selectedCustomerId 
            ? "text-white font-semibold" 
            : "text-white/60 font-normal"
        }`}>
          Customer <span className="text-red-400">*</span>
        </label>
      )}
      
      <div className="relative" ref={selectorRef}>
        {/* Selected Customer Display */}
        {selectedCustomer && !showResults && (
          <div className="w-full bg-black border border-white/30 text-xs sm:text-sm px-3 py-2 flex items-center justify-between">
            <div>
              <div className="text-white">{selectedCustomer.name}</div>
              <div className="text-white/50 text-[11px]">{selectedCustomer.email}</div>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="text-white/60 hover:text-white text-xs px-2"
              aria-label="Clear selection"
            >
              ×
            </button>
          </div>
        )}

        {/* Search Input */}
        {(!selectedCustomer || showResults) && (
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => {
              setShowResults(true);
            }}
            placeholder={
              selectedCustomer 
                ? "Search for another customer..." 
                : placeholder || "Create customer on customer page OR click 'For Me' for personal design"
            }
            className="w-full bg-black border border-white/30 text-xs sm:text-sm px-3 py-2 outline-none focus:border-white text-white"
          />
        )}

        {/* Search Results Dropdown */}
        {showResults && (
          <div className="absolute z-50 w-full mt-1 bg-black border border-white/30 max-h-60 overflow-y-auto">
            {loading ? (
              <div className="p-3 text-xs text-white/50 text-center">Loading...</div>
            ) : searchQuery.trim() ? (
              // Show filtered results when searching
              filteredCustomers.length > 0 ? (
                <div className="p-2 space-y-1">
                  {filteredCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => handleSelect(customer.id)}
                      className={`w-full text-left px-3 py-2 text-xs sm:text-sm transition-colors ${
                        selectedCustomerId === customer.id
                          ? "bg-white/20 text-white/50 cursor-not-allowed"
                          : "text-white/80 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-white/50 text-[11px]">{customer.email}</div>
                          {customer.phone && (
                            <div className="text-white/40 text-[10px]">{customer.phone}</div>
                          )}
                        </div>
                        {selectedCustomerId === customer.id && (
                          <span className="text-white/40 text-[10px]">Selected</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-3 text-xs text-white/50 text-center space-y-2">
                  <div>No customers found matching &quot;{searchQuery}&quot;</div>
                  {onCreateNew && (
                    <button
                      type="button"
                      onClick={() => {
                        onCreateNew();
                        setShowResults(false);
                      }}
                      className="text-white hover:text-white/80 underline text-xs"
                    >
                      Create new customer
                    </button>
                  )}
                </div>
              )
            ) : recentCustomers.length > 0 ? (
              // Show 3 most recent customers when field is clicked (no search query)
              <div className="p-2 space-y-1">
                {recentCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => handleSelect(customer.id)}
                    className={`w-full text-left px-3 py-2 text-xs sm:text-sm transition-colors ${
                      selectedCustomerId === customer.id
                        ? "bg-white/20 text-white/50 cursor-not-allowed"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-white/50 text-[11px]">{customer.email}</div>
                        {customer.phone && (
                          <div className="text-white/40 text-[10px]">{customer.phone}</div>
                        )}
                      </div>
                      {selectedCustomerId === customer.id && (
                        <span className="text-white/40 text-[10px]">Selected</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-3 text-xs text-white/50 text-center">
                No customers found. Create a customer on the customers page.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
