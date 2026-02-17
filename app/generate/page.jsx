"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { TATTOO_CATEGORIES } from "@/lib/tattoo-categories";
import { storage } from "@/lib/firebase";
import { ref, uploadString } from "firebase/storage";
import { useAuth } from "@/lib/auth-context";
import AuthButton from "../components/AuthButton";
import AuthModal from "../components/AuthModal";
import CustomerSelector from "../components/CustomerSelector";
import CreditsDisplay from "../components/CreditsDisplay";
import PurchaseCredits from "../components/PurchaseCredits";
import MobileNav from "../components/MobileNav";
import { CREDIT_COSTS } from "@/lib/credit-config";

const PLACEMENTS = [
  "Arm",
  "Shoulder",
  "Chest",
  "Abdominal",
  "Back",
  "Ribs",
  "Leg",
  "Hand",
  "Neck",
  "Face",
];

const MODELS = [
  { id: "nanobanana", label: "NanoBanana" },
  { id: "gemini25", label: "Gemini 2.5" },
  { id: "imagen4", label: "Imagen 4" },
];

// Set to true when ready to enable generation
const GENERATION_ENABLED = true;

export default function GeneratePage() {
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("nanobanana");
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultText, setResultText] = useState("");
  const [images, setImages] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedStyleIds, setSelectedStyleIds] = useState([]);
  const [currentStyleId, setCurrentStyleId] = useState("");
  const [selectedPlacements, setSelectedPlacements] = useState([]);
  const [customPlacement, setCustomPlacement] = useState("");
  const [showCustomPlacement, setShowCustomPlacement] = useState(false);
  const [referenceImages, setReferenceImages] = useState([]);
  const [referenceImageType, setReferenceImageType] = useState(""); // "placement", "subject", or "" (none selected)
  const [styleSearchQuery, setStyleSearchQuery] = useState("");
  const [showStyleSearchResults, setShowStyleSearchResults] = useState(false);
  const [selectedColor, setSelectedColor] = useState("");
  const [monochromaticColor, setMonochromaticColor] = useState("");
  const [customColor, setCustomColor] = useState("");
  const [showCustomColor, setShowCustomColor] = useState(false);
  const [selectedSkinColor, setSelectedSkinColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [customSize, setCustomSize] = useState("");
  const [numberOfImages, setNumberOfImages] = useState(1);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [selectedCustomerName, setSelectedCustomerName] = useState(null);
  const [isForMe, setIsForMe] = useState(false);
  const [userMode, setUserMode] = useState("individual"); // "individual" or "parlor"
  const [isGeneratingStencils, setIsGeneratingStencils] = useState(false);
  const [stencils, setStencils] = useState(null);
  const [userCredits, setUserCredits] = useState(null);
  const [showPurchaseCredits, setShowPurchaseCredits] = useState(false);
  const [showReferenceImageInfo, setShowReferenceImageInfo] = useState(false);
  const [showCustomerInfo, setShowCustomerInfo] = useState(false);
  const [showModelInfo, setShowModelInfo] = useState(false);
  const [showPlacementInfo, setShowPlacementInfo] = useState(false);
  const [showStyleInfo, setShowStyleInfo] = useState(false);
  const [showSizeInfo, setShowSizeInfo] = useState(false);
  const [showColorInfo, setShowColorInfo] = useState(false);
  const [showSkinColorInfo, setShowSkinColorInfo] = useState(false);
  const [showSubjectInfo, setShowSubjectInfo] = useState(false);
  const [showNumberOfImagesInfo, setShowNumberOfImagesInfo] = useState(false);
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [formWasReset, setFormWasReset] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const { user, loading: authLoading } = useAuth();

  // Handle keyboard navigation for image modal
  useEffect(() => {
    if (selectedImageIndex === null || !images || images.length === 0) {
      return;
    }
    
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSelectedImageIndex(null);
      } else if (e.key === "ArrowLeft" && images.length > 1) {
        e.preventDefault();
        setSelectedImageIndex(selectedImageIndex > 0 ? selectedImageIndex - 1 : images.length - 1);
      } else if (e.key === "ArrowRight" && images.length > 1) {
        e.preventDefault();
        setSelectedImageIndex(selectedImageIndex < images.length - 1 ? selectedImageIndex + 1 : 0);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedImageIndex, images?.length ?? 0]);

  const handlePortraitChange = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      return;
    }

    // Process all selected files
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result === "string" && result.startsWith("data:")) {
          // Strip "data:mime;base64," prefix to send clean base64
          const base64 = result.split(",")[1];
          const imageData = {
            data: base64,
            mimeType: file.type || "image/png",
            fileName: file.name,
            type: referenceImageType, // Store the type when image is uploaded
          };
          
          // Add to state, but only keep images of the current type
          // This ensures we never have both placement and subject images at the same time
          setReferenceImages((prev) => {
            // Filter out any images of the other type, then add the new image
            const filtered = prev.filter(img => img.type === referenceImageType);
            return [...filtered, imageData];
          });
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset the input so the same file can be selected again if needed
    e.target.value = "";
  };

  const removeReferenceImage = (index) => {
    setReferenceImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Get all styles flattened with their category info
  const getAllStyles = () => {
    return TATTOO_CATEGORIES.flatMap((cat) =>
      (cat.styles || []).map((style) => ({ style, category: cat }))
    );
  };

  // Filter styles based on search query
  const getFilteredStyles = () => {
    if (!styleSearchQuery.trim()) return [];
    const query = styleSearchQuery.toLowerCase().trim();
    return getAllStyles().filter(
      (item) =>
        item.style.name.toLowerCase().includes(query) ||
        item.style.keywords.some((kw) => kw.toLowerCase().includes(query)) ||
        item.category.name.toLowerCase().includes(query)
    );
  };

  const handleStyleSearchSelect = (styleId) => {
    // Reset formWasReset flag when user manually selects a style
    setFormWasReset(false);
    if (!selectedStyleIds.includes(styleId)) {
      setSelectedStyleIds((prev) => [...prev, styleId]);
    }
    setStyleSearchQuery("");
    setShowStyleSearchResults(false);
  };

  // Helper function to render label with bold/whiter styling if field is answered
  const renderLabel = (labelText, isAnswered, infoButton = null) => {
    return (
      <label className={`flex items-center gap-3 text-sm font-medium tracking-wide transition-colors duration-300 ${
        isAnswered 
          ? "text-white" 
          : "text-white/50"
      }`}>
        <span className={`w-2 h-2 rounded-full transition-all duration-300 ${isAnswered ? "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]" : "bg-white/20"}`} />
        <span>{labelText}</span>
        {infoButton}
      </label>
    );
  };

  // Helper function to render info button
  const renderInfoButton = (showInfo, setShowInfo) => {
    return (
      <button
        type="button"
        onClick={() => setShowInfo(!showInfo)}
        className="w-4 h-4 rounded-full border border-blue-400 bg-blue-500/20 text-blue-300 hover:bg-blue-500/40 hover:text-blue-200 hover:border-blue-300 flex items-center justify-center text-[10px] font-semibold transition-colors"
        title="Show more information"
        aria-label="Toggle information"
      >
        i
      </button>
    );
  };

  // Close dropdown when clicking outside
  const styleSearchRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (styleSearchRef.current && !styleSearchRef.current.contains(event.target)) {
        setShowStyleSearchResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Check for Stripe redirect success/cancel
  useEffect(() => {
    if (typeof window !== "undefined" && user) {
      const params = new URLSearchParams(window.location.search);
      if (params.get("success") === "true") {
        const credits = params.get("credits");
        setResultText(`Successfully purchased ${credits} credits! You can now generate designs.`);
        // Refresh credits
        fetchUserCredits();
        // Clean URL
        window.history.replaceState({}, "", "/generate");
      } else if (params.get("canceled") === "true") {
        setResultText("Payment was canceled.");
        window.history.replaceState({}, "", "/generate");
      }
    }
  }, [user]);

  // Fetch user credits
  useEffect(() => {
    if (!user) return;
    
    async function fetchUserCredits() {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/users/credits", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setUserCredits(data.credits);
        }
      } catch (error) {
        console.error("Error fetching credits:", error);
      }
    }
    
    fetchUserCredits();
  }, [user]);

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

  // Auto-set isForMe in Individual mode
  useEffect(() => {
    if (userMode === "individual") {
      setIsForMe(true);
      setSelectedCustomerId(null);
    }
  }, [userMode]);

  // Fetch customer name when selectedCustomerId changes
  useEffect(() => {
    if (!user || !selectedCustomerId || isForMe) {
      setSelectedCustomerName(null);
      return;
    }
    
    async function fetchCustomerName() {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/customers/${selectedCustomerId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setSelectedCustomerName(data.customer?.name || null);
        } else {
          setSelectedCustomerName(null);
        }
      } catch (error) {
        console.error("Error fetching customer name:", error);
        setSelectedCustomerName(null);
      }
    }
    
    fetchCustomerName();
  }, [user, selectedCustomerId, isForMe]);

  // Function to save form state to Firebase
  const saveFormState = useCallback(async () => {
    if (!user) return; // Only save if user is authenticated
    
    try {
      const formState = {
        prompt,
        selectedModel,
        selectedCategoryId,
        selectedStyleIds,
        selectedPlacements,
        customPlacement,
        showCustomPlacement,
        selectedColor,
        monochromaticColor,
        customColor,
        showCustomColor,
        selectedSkinColor,
        selectedSize,
        customSize,
        numberOfImages,
        selectedCustomerId,
        isForMe,
        referenceImages: referenceImages.map(img => ({
          fileName: img.fileName,
          mimeType: img.mimeType,
          type: img.type,
          // Don't save base64 data - too large
        })),
        referenceImageType,
      };
      
      const token = await user.getIdToken();
      await fetch("/api/users/form-state", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ formState }),
      });
    } catch (error) {
      console.error("Error saving form state to Firebase:", error);
    }
  }, [
    prompt,
    selectedModel,
    selectedCategoryId,
    selectedStyleIds,
    selectedPlacements,
    customPlacement,
    showCustomPlacement,
    selectedColor,
    monochromaticColor,
    customColor,
    showCustomColor,
    selectedSkinColor,
    selectedSize,
    customSize,
    numberOfImages,
    selectedCustomerId,
    isForMe,
    referenceImages,
    referenceImageType,
  ]);

  // Auto-save form state whenever form fields change
  useEffect(() => {
    // Don't save on initial mount or if form was just reset
    if (formWasReset || !user) {
      return;
    }
    
    // Debounce saves to avoid too many Firebase writes
    const timeoutId = setTimeout(() => {
      saveFormState();
    }, 1000); // Increased debounce for Firebase (1 second)
    
    return () => clearTimeout(timeoutId);
  }, [saveFormState, formWasReset, user]);

  // Restore form state and favorites on page load (when navigating back from any page)
  useEffect(() => {
    async function loadFormStateAndFavorites() {
      if (!user) return; // Only load if user is authenticated
      
      try {
        const token = await user.getIdToken();
        
        // 1. Load form state
        const formRes = await fetch("/api/users/form-state", {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (formRes.ok) {
          const data = await formRes.json();
          const formState = data.formState;
          
          if (formState) {
            if (formState.prompt) setPrompt(formState.prompt);
            if (formState.selectedModel) setSelectedModel(formState.selectedModel);
            if (formState.selectedCategoryId !== undefined) setSelectedCategoryId(formState.selectedCategoryId);
            if (formState.selectedStyleIds) setSelectedStyleIds(formState.selectedStyleIds);
            if (formState.selectedPlacements) setSelectedPlacements(formState.selectedPlacements);
            if (formState.customPlacement) setCustomPlacement(formState.customPlacement);
            if (formState.showCustomPlacement) setShowCustomPlacement(formState.showCustomPlacement);
            if (formState.selectedColor) setSelectedColor(formState.selectedColor);
            if (formState.monochromaticColor) setMonochromaticColor(formState.monochromaticColor);
            if (formState.customColor) setCustomColor(formState.customColor);
            if (formState.showCustomColor) setShowCustomColor(formState.showCustomColor);
            if (formState.selectedSkinColor) setSelectedSkinColor(formState.selectedSkinColor);
            if (formState.selectedSize !== undefined) setSelectedSize(formState.selectedSize);
            if (formState.customSize !== undefined) setCustomSize(formState.customSize);
            if (formState.numberOfImages) setNumberOfImages(formState.numberOfImages);
            if (formState.selectedCustomerId !== undefined) setSelectedCustomerId(formState.selectedCustomerId);
            if (formState.isForMe !== undefined) setIsForMe(formState.isForMe);
            if (formState.referenceImageType) setReferenceImageType(formState.referenceImageType);
            // Note: referenceImages base64 data is not restored (too large)
          }
        }
        
        // 2. Always load favorites from Firebase and merge into selected styles
        // This ensures favorites selected on favorite-styles page appear on generate page
        if (!formWasReset) {
          const favRes = await fetch("/api/users/favorite-styles", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (favRes.ok) {
            const favData = await favRes.json();
            const favoriteIds = favData.favoriteStyleIds || [];
            if (Array.isArray(favoriteIds) && favoriteIds.length > 0) {
              setSelectedStyleIds((prev) => {
                const combined = [...prev];
                favoriteIds.forEach((id) => {
                  if (!combined.includes(id)) combined.push(id);
                });
                return combined;
              });
            }
          }
        }
      } catch (e) {
        console.error("Error loading form state / favorites from Firebase:", e);
      }
    }
    
    loadFormStateAndFavorites();
  }, [user, formWasReset]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    // Require authentication to generate
    if (!user) {
      setResultText("Please sign in to generate images.");
      return;
    }
    
    // Require customer selection (only in parlor mode)
    if (userMode === "parlor" && !selectedCustomerId) {
      setResultText("Please select a customer before generating.");
      return;
    }
    
    // In individual mode, always use "For Me"
    if (userMode === "individual") {
      setIsForMe(true);
    }

    setIsGenerating(true);
    setResultText("");
    setImages(null);
    try {
      // Decide which backend route to call based on selected model.
      // - imagen4  -> Vertex Imagen 4 (existing route, DO NOT TOUCH)
      // - nanobanana / gemini25 -> Gemini/NanoBanana route
      const endpoint =
        selectedModel === "imagen4"
          ? "/api/generate-image"
          : "/api/generate-banana";

      // Enrich prompt with selected style and placement
      let fullPrompt = prompt.trim();
      const extraParts = [];

      let selectedStyles = [];
      if (selectedStyleIds.length > 0) {
        selectedStyles = TATTOO_CATEGORIES.flatMap((c) =>
          (c.styles || []).filter((s) => selectedStyleIds.includes(s.id))
        );
      }

      if (selectedStyles.length > 0) {
        const styleNames = selectedStyles.map((s) => s.name).join(", ");
        extraParts.push(`${styleNames} tattoo style`);
      } else if (
        typeof selectedCategoryId === "number" &&
        TATTOO_CATEGORIES.find((c) => c.id === selectedCategoryId)
      ) {
        const category = TATTOO_CATEGORIES.find((c) => c.id === selectedCategoryId);
        extraParts.push(`${category.name} tattoo style`);
      }

      if (customPlacement.trim()) {
        extraParts.push(`placement on the ${customPlacement.trim().toLowerCase()}`);
      } else if (selectedPlacements.length > 0) {
        const places = selectedPlacements.map((p) => p.toLowerCase()).join(" or ");
        extraParts.push(`placement on the ${places}`);
      }

      // Add color selection
      if (selectedColor === "custom" && customColor.trim()) {
        extraParts.push(`tattoo color: ${customColor.trim()}`);
      } else if (selectedColor === "black-grey") {
        extraParts.push("tattoo color: black and grey");
      } else if (selectedColor === "full-color") {
        extraParts.push("tattoo color: full color");
      } else if (selectedColor === "natural-palette") {
        extraParts.push("tattoo color: natural palette");
      } else if (selectedColor === "monochromatic" && monochromaticColor.trim()) {
        extraParts.push(`tattoo color: monochromatic ${monochromaticColor.trim()}`);
      } else if (selectedColor === "monochromatic") {
        extraParts.push("tattoo color: monochromatic");
      } else if (selectedColor === "sepia-vintage") {
        extraParts.push("tattoo color: sepia / vintage palette");
      } else if (selectedColor === "white-ink") {
        extraParts.push("tattoo color: white ink");
      }

      // Add skin color selection
      if (selectedSkinColor) {
        const skinColorLabels = {
          "light": "light skin tone",
          "light-medium": "light medium skin tone",
          "medium": "medium skin tone",
          "medium-dark": "medium dark skin tone",
          "dark": "dark skin tone",
          "very-dark": "very dark skin tone",
        };
        extraParts.push(`skin color: ${skinColorLabels[selectedSkinColor] || selectedSkinColor}`);
      }

      // Add size selection
      if (selectedSize === "other" && customSize.trim()) {
        extraParts.push(`size: ${customSize.trim()}`);
      } else if (selectedSize === "S") {
        extraParts.push("size: 5-10cm, like a credit card");
      } else if (selectedSize === "M") {
        extraParts.push("size: 10-15cm, like a smartphone");
      } else if (selectedSize === "L") {
        extraParts.push("size: > 15cm, like a hand");
      } else if (selectedSize === "XL") {
        extraParts.push("size: > 20cm, covers arm or leg");
      }

      if (extraParts.length > 0) {
        fullPrompt = `${fullPrompt}\n\nStyle / placement: ${extraParts.join(
          ", "
        )}`;
      }

      const body = {
        prompt: fullPrompt,
        model: selectedModel,
        numberOfImages: numberOfImages,
      };

      // Only send reference images when using NanoBanana / Gemini models
      // Filter images by the currently selected type
      const imagesForCurrentType = referenceImages.filter(img => img.type === referenceImageType);
      if (
        (selectedModel === "nanobanana" || selectedModel === "gemini25") &&
        imagesForCurrentType.length > 0
      ) {
        body.referenceImages = imagesForCurrentType.map(img => ({
          data: img.data,
          mimeType: img.mimeType,
        }));
        body.referenceImageType = referenceImageType; // "placement" or "subject"
        // Include selected placements or custom placement for placement photos
        if (referenceImageType === "placement") {
          if (customPlacement.trim()) {
            body.customPlacement = customPlacement.trim();
          } else if (selectedPlacements.length > 0) {
            body.selectedPlacements = selectedPlacements;
          }
        }
      }

      const token = await user.getIdToken();
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402) {
          // Insufficient credits
          setResultText(`Insufficient credits. You need ${data.requiredCredits} credits but only have ${data.currentCredits}.`);
          setShowPurchaseCredits(true);
          // Refresh credits
          fetchUserCredits();
        } else {
          setResultText(data.error || "Failed to generate image.");
        }
        return;
      }

      // Update credits if returned
      if (data.creditsRemaining !== undefined) {
        setUserCredits(data.creditsRemaining);
      }

      if (Array.isArray(data.images) && data.images.length > 0) {
        setImages(data.images);
        setStencils(null); // Clear previous stencils when new images are generated
        setResultText(`Generated ${data.images.length} image(s) with ${selectedModel}.`);
        console.log(`📸 Generated ${data.images.length} images - these will be saved in order`);

        // Save to Firebase Storage under generated/{userId}/
        const timestamp = Date.now();
        const userId = user.uid; // user is guaranteed to exist here
        const imagePaths = [];
        
        console.log("Starting image upload, total images:", data.images.length);
        
        // Upload images and collect paths
        // Note: We don't store base64 data URLs in Firestore due to size limits (~1MB per array)
        // CRITICAL: Maintain order - imagePaths[i] must correspond to data.images[i]
        const uploadPromises = data.images.map(async (img, idx) => {
          if (typeof img !== "string" || !img.startsWith("data:")) {
            console.warn(`Skipping image ${idx}: invalid format`);
            return { index: idx, path: null };
          }
          const path = `generated/${userId}/${timestamp}-${idx}.png`;
          const storageRef = ref(storage, path);
          try {
            await uploadString(storageRef, img, "data_url");
            console.log(`✅ Saved images[${idx}] to ${path}`);
            return { index: idx, path: path };
          } catch (err) {
            console.error(`Failed to save generated image ${idx} to Firebase:`, err);
            return { index: idx, path: null };
          }
        });
        
        const imageUploadResults = await Promise.all(uploadPromises);
        // Reconstruct imagePaths array in correct order
        imageUploadResults.forEach((result) => {
          if (result.path) {
            imagePaths.push(result.path);
          }
        });
        
        console.log(`📸 Final imagePaths (${imagePaths.length}):`, imagePaths);
        
        console.log("Upload complete. imagePaths:", imagePaths.length);
        
        // Only save generation metadata if we successfully uploaded at least one image
        if (imagePaths.length > 0) {
          // Save generation metadata to Firestore
          // Note: We don't store imageUrls (base64 data) in Firestore due to size limits
          // Only store the Firebase Storage paths - download URLs can be generated when needed
          try {
            // Don't store full base64 referenceImages data - it's too large and causes stack overflow
            // Only store metadata (file names, types) if needed for reference
            // Use userMode as source of truth instead of isForMe to avoid race conditions
            const generationData = {
              customerId: (userMode === "individual") ? "personal" : (selectedCustomerId || "personal"),
              userId: user.uid,
              prompt: prompt.trim() || "Untitled design", // Ensure prompt is never empty
              fullPrompt: fullPrompt || prompt.trim() || "Untitled design", // Fallback to prompt if fullPrompt is empty/undefined
              model: selectedModel,
              images: imagePaths, // Firebase Storage paths only
              imageUrls: [], // Empty - we don't store base64 data in Firestore
              styleIds: selectedStyleIds.length > 0 ? selectedStyleIds : undefined,
              placements: selectedPlacements.length > 0 ? selectedPlacements : undefined,
              // Store only metadata about reference images, not the full base64 data
              // This prevents stack overflow when serializing large base64 strings
              referenceImages: (selectedModel === "nanobanana" || selectedModel === "gemini25") && referenceImages.length > 0 
                ? referenceImages.map(img => ({
                    fileName: img.fileName || "reference-image",
                    mimeType: img.mimeType || "image/png",
                    type: img.type || "placement",
                    // Don't include img.data - it's too large and causes stack overflow
                  }))
                : undefined,
            };
            
            // Add validation before sending to catch issues early
            if (!generationData.customerId || !generationData.fullPrompt || !generationData.prompt) {
              console.error("Invalid generation data before API call:", {
                customerId: generationData.customerId,
                hasPrompt: !!generationData.prompt,
                hasFullPrompt: !!generationData.fullPrompt,
                userMode: userMode,
                isForMe: isForMe,
                selectedCustomerId: selectedCustomerId,
              });
            }
            
            console.log("Saving generation metadata with:", {
              customerId: generationData.customerId,
              userId: generationData.userId,
              imagesCount: generationData.images.length,
              promptLength: generationData.prompt?.length || 0,
              fullPromptLength: generationData.fullPrompt?.length || 0,
            });
            
            // Get Firebase Auth token for the API request
            const token = await user.getIdToken();
            
            // Validate payload size before stringifying to prevent stack overflow
            let requestBody;
            try {
              requestBody = JSON.stringify(generationData);
              const sizeInMB = new Blob([requestBody]).size / (1024 * 1024);
              if (sizeInMB > 4) {
                console.warn(`Request body is large (${sizeInMB.toFixed(2)}MB), but proceeding...`);
              }
            } catch (stringifyError) {
              console.error("Error stringifying generation data:", stringifyError);
              // If stringify fails, try without referenceImages
              const fallbackData = { ...generationData };
              delete fallbackData.referenceImages;
              requestBody = JSON.stringify(fallbackData);
              console.log("Retried without referenceImages metadata");
            }
            
            const generationRes = await fetch("/api/generations", {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
              },
              body: requestBody,
            });
            
            if (!generationRes.ok) {
              const errorText = await generationRes.text();
              let errorData = {};
              try {
                errorData = JSON.parse(errorText);
              } catch (e) {
                errorData = { rawError: errorText };
              }
              console.error("Failed to save generation metadata. Status:", generationRes.status, "Error:", errorData);
              
              // Log the data that was sent to help debug
              console.error("Generation data that was sent:", {
                customerId: generationData.customerId,
                userId: generationData.userId,
                hasPrompt: !!generationData.prompt,
                promptLength: generationData.prompt?.length || 0,
                hasFullPrompt: !!generationData.fullPrompt,
                fullPromptLength: generationData.fullPrompt?.length || 0,
                model: generationData.model,
                imagesCount: generationData.images?.length || 0,
                userMode: userMode,
                isForMe: isForMe,
              });
            } else {
              const successData = await generationRes.json();
              console.log("Successfully saved generation metadata:", successData);
              // Store generation ID for later stencil linking
              if (successData.generationId) {
                sessionStorage.setItem('lastGenerationId', successData.generationId);
                sessionStorage.setItem('lastGenerationCustomerId', (userMode === "individual") ? "personal" : selectedCustomerId);
              }
            }
          } catch (err) {
            console.error("Error saving generation metadata:", err);
          }
        } else {
          console.error("No images were successfully uploaded, skipping generation metadata save. imagePaths:", imagePaths.length);
        }
      } else {
        setResultText("No image returned from the server.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateStencils = async () => {
    if (!images || images.length === 0) {
      setResultText("No images to convert to stencils.");
      return;
    }

    setIsGeneratingStencils(true);
    setStencils(null);
    setResultText("");

    try {
      // Get placement photo if available (for curved surface inference)
      let placementPhoto = null;
      let placementMimeType = "image/png";
      const placementImages = referenceImages.filter(img => img.type === "placement");
      
      console.log(`🔍 Stencil: Checking for placement photos. Found ${placementImages.length} placement image(s)`);
      
      if (placementImages.length > 0) {
        // Use the first placement image
        const placementImg = placementImages[0];
        // Convert base64 data back to data URL format
        placementPhoto = `data:${placementImg.mimeType || "image/png"};base64,${placementImg.data}`;
        placementMimeType = placementImg.mimeType || "image/png";
        console.log(`✅ Stencil: Using placement photo for curved surface inference`);
      } else {
        console.log(`⚠️  Stencil: No placement photo found - will create basic stencil`);
      }

      // Get body part from selected placements or custom placement
      const bodyPart = customPlacement.trim() 
        ? customPlacement.trim().toLowerCase()
        : selectedPlacements.length > 0 
        ? selectedPlacements[0].toLowerCase() 
        : undefined;

      console.log(`📍 Stencil: Body part = ${bodyPart || "not specified"}`);

      const requestBody = { images };
      
      if (placementPhoto) {
        requestBody.placementPhoto = placementPhoto;
        requestBody.placementMimeType = placementMimeType;
        console.log(`📤 Stencil: Sending placement photo with request`);
      }
      
      if (bodyPart) {
        requestBody.bodyPart = bodyPart;
        console.log(`📤 Stencil: Sending body part "${bodyPart}" with request`);
      }
      
      console.log(`📤 Stencil: Sending ${images.length} image(s) for stencil conversion`);

      const token = await user.getIdToken();
      const res = await fetch("/api/generate-stencil", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402) {
          // Insufficient credits
          setResultText(`Insufficient credits. You need ${data.requiredCredits} credits but only have ${data.currentCredits}.`);
          setShowPurchaseCredits(true);
          // Refresh credits
          fetchUserCredits();
        } else {
          setResultText(data.error || "Failed to generate stencils.");
        }
        return;
      }

      // Update credits if returned
      if (data.creditsRemaining !== undefined) {
        setUserCredits(data.creditsRemaining);
      }

      if (Array.isArray(data.stencils) && data.stencils.length > 0) {
        setStencils(data.stencils);
        const inferenceNote = placementPhoto && bodyPart 
          ? ` with curved surface inference for ${bodyPart}` 
          : "";
        setResultText(`Generated ${data.stencils.length} stencil(s)${inferenceNote}.`);
        
        // Save stencils to Firebase Storage and link to generation
        if (images && images.length > 0 && user && selectedCustomerId) {
          try {
            console.log(`📊 Stencil mapping: images.length=${images.length}, stencils.length=${data.stencils.length}`);
            console.log(`📊 Stencil: images state variable order (first 50 chars each):`, images.map((img, i) => `images[${i}]: ${img.substring(0, 50)}...`));
            
            const timestamp = Date.now();
            const userId = user.uid;
            // CRITICAL: API returns stencils array where stencils[i] corresponds to images[i]
            // Initialize array with same length as images to maintain index correspondence
            const stencilPaths = new Array(images.length).fill(null);
            
            // Upload stencils and collect paths
            // CRITICAL: data.stencils[i] corresponds to images[i] - use the index directly
            const uploadPromises = data.stencils.map(async (stencil, stencilIdx) => {
              // Skip null stencils (invalid or failed conversions)
              if (!stencil || !stencil.startsWith("data:")) {
                console.log(`⏭️  Skipping null stencil at index ${stencilIdx}`);
                return { index: stencilIdx, path: null };
              }
              // Create stencil path that links to the original image
              // Format: generated/{userId}/stencils/{timestamp}-{imageIdx}.png
              // Use stencilIdx directly since API maintains order: stencils[i] = stencil for images[i]
              const path = `generated/${userId}/stencils/${timestamp}-${stencilIdx}.png`;
              const storageRef = ref(storage, path);
              try {
                await uploadString(storageRef, stencil, "data_url");
                console.log(`✅ Uploaded stencil[${stencilIdx}] (for images[${stencilIdx}]) to ${path}`);
                return { index: stencilIdx, path: path };
              } catch (err) {
                console.error(`❌ Failed to save stencil ${stencilIdx} to Firebase:`, err);
                return { index: stencilIdx, path: null };
              }
            });
            
            // Promise.all preserves the order of results
            // Since data.stencils is already in correct order matching images, results[i] corresponds to images[i]
            const uploadResults = await Promise.all(uploadPromises);
            // Assign paths to correct indices to maintain correspondence with images
            uploadResults.forEach((result) => {
              stencilPaths[result.index] = result.path;
              if (result.path) {
                console.log(`📌 Mapped stencilPaths[${result.index}] = ${result.path} (for images[${result.index}])`);
              }
            });
            
            console.log(`📋 Final stencilPaths array (length=${stencilPaths.length}):`, stencilPaths);
            
            // Filter out nulls for the API call (only send paths that exist)
            const validStencilPaths = stencilPaths.filter(path => path !== null);
            
            // Update the generation with stencil paths (maintain full array with nulls for index correspondence)
            if (validStencilPaths.length > 0) {
              // Use stencilPaths (with nulls) to maintain index correspondence with images
              // This ensures stencilPaths[i] corresponds to images[i]
              const token = await user.getIdToken();
              
              // Try to get the generation ID from sessionStorage (saved when generation was created)
              let generationId = sessionStorage.getItem('lastGenerationId');
              const savedCustomerId = sessionStorage.getItem('lastGenerationCustomerId');
              
              // Verify it's for the same customer
              if (generationId && savedCustomerId === selectedCustomerId) {
                // Update generation with stencil paths
                const updateRes = await fetch(`/api/generations/${generationId}/stencils`, {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                  },
                    body: JSON.stringify({ stencils: stencilPaths }), // Full array with nulls for index correspondence
                  });
                  
                  if (updateRes.ok) {
                    console.log("Successfully linked stencils to generation");
                  } else {
                    console.error("Failed to link stencils to generation");
                  }
                } else {
                  // Fallback: find the most recent generation for this customer
                  const generationsRes = await fetch(`/api/generations/customer/${selectedCustomerId}`, {
                    headers: {
                      "Authorization": `Bearer ${token}`,
                    },
                  });
                  
                  if (generationsRes.ok) {
                    const generationsData = await generationsRes.json();
                    const gens = generationsData.generations || [];
                    // Find the most recent generation (should be the one we just created)
                    const mostRecentGen = gens.sort((a, b) => 
                      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    )[0];
                    
                    if (mostRecentGen) {
                      // Update generation with stencil paths
                      const updateRes = await fetch(`/api/generations/${mostRecentGen.id}/stencils`, {
                        method: "PUT",
                        headers: {
                          "Content-Type": "application/json",
                          "Authorization": `Bearer ${token}`,
                        },
                        body: JSON.stringify({ stencils: stencilPaths }), // Full array with nulls for index correspondence
                    });
                    
                    if (updateRes.ok) {
                      console.log("Successfully linked stencils to generation");
                    } else {
                      console.error("Failed to link stencils to generation");
                    }
                  }
                }
              }
            }
          } catch (err) {
            console.error("Error saving stencils:", err);
            // Don't show error to user - stencils are still available locally
          }
        }
      } else {
        setResultText("No stencils returned from the server.");
      }
    } catch (err) {
      console.error("Error generating stencils:", err);
      setResultText("An error occurred while generating stencils.");
    } finally {
      setIsGeneratingStencils(false);
    }
  };

  const handleResetForm = async () => {
    // Reset all form fields
    setPrompt("");
    setSelectedModel("nanobanana");
    setSelectedCategoryId(null);
    setSelectedStyleIds([]); // Clear selected styles (including favorites)
    setCurrentStyleId("");
    setSelectedPlacements([]);
    setCustomPlacement("");
    setShowCustomPlacement(false);
    setReferenceImages([]);
    setReferenceImageType("");
    setStyleSearchQuery("");
    setShowStyleSearchResults(false);
    setSelectedColor("");
    setMonochromaticColor("");
    setCustomColor("");
    setShowCustomColor(false);
    setSelectedSkinColor("");
    setSelectedSize("");
    setCustomSize("");
    setNumberOfImages(1);
    setSelectedCustomerId(null);
    setSelectedCustomerName(null);
    setIsForMe(false);
    setImages(null);
    setStencils(null);
    setResultText("");
    setShowPurchaseCredits(false);
    // Clear Firebase form state
    if (user) {
      try {
        const token = await user.getIdToken();
        await fetch("/api/users/form-state", {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.error("Error clearing form state:", error);
      }
    }
    // Mark that form was reset - this prevents favorites from auto-loading
    setFormWasReset(true);
    
    // Clear favorites from Firebase when resetting form
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
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-3 sm:px-4 py-6 sm:py-10 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />
      </div>
      
      <div className="relative w-full max-w-3xl backdrop-blur-sm border border-white/10 bg-black/40 rounded-2xl p-5 sm:p-8 lg:p-10 space-y-6 sm:space-y-8 shadow-[0_0_60px_rgba(0,0,0,0.5)]">
        <div className="space-y-6">
          {/* Back to Gallery button - top left, always visible */}
          <div className="flex items-start">
            <Link
              href="/"
              className="group inline-flex items-center gap-2 text-xs sm:text-sm text-white/60 hover:text-white px-4 py-2.5 rounded-full border border-white/10 hover:border-white/30 bg-white/5 hover:bg-white/10 transition-all duration-300"
            >
              <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Gallery
            </Link>
          </div>
          
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="hidden sm:flex items-center gap-2 flex-wrap">
              {user && (
                <>
                  <Link
                    href="/history"
                    className="group inline-flex items-center gap-2 text-xs sm:text-sm text-white/60 hover:text-white px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 transition-all duration-300"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    History
                  </Link>
                  {userMode === "parlor" && (
                    <Link
                      href="/customers"
                      className="group inline-flex items-center gap-2 text-xs sm:text-sm text-white/60 hover:text-white px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 transition-all duration-300"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Customers
                    </Link>
                  )}
                </>
              )}
            </div>
            <div className="hidden sm:flex items-center gap-3">
              {/* Mode Toggle */}
              <div className="flex items-center gap-1 border border-white/10 rounded-xl p-1.5 bg-black/60 backdrop-blur-sm">
                  <button
                    type="button"
                    onClick={async () => {
                      if (userMode !== "individual") {
                        setUserMode("individual");
                        setIsForMe(true);
                        setSelectedCustomerId(null);
                        
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
                  className={`px-4 py-2 text-xs rounded-lg transition-all duration-300 whitespace-nowrap font-medium ${
                    userMode === "individual"
                      ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                      : "text-white/40 hover:text-white/70 hover:bg-white/5"
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
                        // Reset customer field when switching to parlor mode
                        setIsForMe(false);
                        setSelectedCustomerId(null);
                        setSelectedCustomerName(null);
                        
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
                  className={`px-4 py-2 text-xs rounded-lg transition-all duration-300 whitespace-nowrap font-medium ${
                    userMode === "parlor"
                      ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                      : "text-white/40 hover:text-white/70 hover:bg-white/5"
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
                    className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-2 rounded-full min-h-[44px] flex items-center"
                  >
                    Credits
                  </Link>
                </>
              )}
              {!user && <AuthButton />}
            </div>
            <div className="sm:hidden flex items-center justify-between w-full">
              <MobileNav />
              <div className="flex items-center gap-2">
                {/* Mode Toggle */}
                <div className="flex items-center gap-1 border border-white/30 rounded-full p-1 bg-black/40">
                  <button
                    type="button"
                    onClick={async () => {
                      if (userMode !== "individual") {
                        setUserMode("individual");
                        setIsForMe(true);
                        setSelectedCustomerId(null);

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
                        // Reset customer field when switching to parlor mode
                        setIsForMe(false);
                        setSelectedCustomerId(null);
                        setSelectedCustomerName(null);

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
                      className="group inline-flex items-center gap-2 text-xs sm:text-sm text-white/60 hover:text-white px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 transition-all duration-300"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Credits
                    </Link>
                  </>
                )}
                {!user && <AuthButton />}
              </div>
            </div>
          </div>
          
          {/* Header Section */}
          <div className="relative pb-6 border-b border-white/10">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-white mb-3">
                  Generate Tattoo Design
                </h1>
                <p className="text-sm sm:text-base text-white/50 leading-relaxed max-w-xl">
                  Describe your vision, select styles and preferences, and create unique AI-generated tattoo artwork.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetForm}
                className="group flex items-center gap-2 text-xs sm:text-sm text-red-400/80 hover:text-red-300 border border-red-500/30 hover:border-red-400/50 px-4 py-2.5 rounded-xl bg-red-500/5 hover:bg-red-500/10 transition-all duration-300 whitespace-nowrap"
              >
                <svg className="w-4 h-4 transition-transform group-hover:rotate-180 duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset
              </button>
            </div>
          </div>
        </div>

        {GENERATION_ENABLED ? (
          <form onSubmit={handleGenerate} className="space-y-8">
          {/* Customer Selection - Only show in Parlor mode */}
          {userMode === "parlor" && (
            <div className={`space-y-3 p-5 rounded-xl transition-all duration-300 ${
              selectedCustomerId !== null 
                ? "border border-white/10 bg-white/[0.02]" 
                : "border border-red-500/40 bg-red-500/[0.02] shadow-[0_0_15px_rgba(239,68,68,0.1)]"
            }`}>
              <label className={`flex items-center gap-3 text-sm font-medium tracking-wide transition-colors duration-300 ${
                selectedCustomerId !== null
                  ? "text-white" 
                  : "text-white/50"
              }`}>
                <span className={`w-2 h-2 rounded-full transition-all duration-300 ${selectedCustomerId !== null ? "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"}`} />
                <span>Customer <span className="text-red-400/80 text-xs ml-1">(Required)</span></span>
                {renderInfoButton(showCustomerInfo, setShowCustomerInfo)}
              </label>
              {showCustomerInfo && (
                <div className="mb-2 p-4 border border-white/10 bg-black/40 rounded-lg">
                  <p className="text-xs text-white/60 leading-relaxed">
                    Select a customer from your customer list. You can create new customers directly from this page using the &quot;+ Add Customer&quot; button.
                  </p>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <CustomerSelector
                    selectedCustomerId={selectedCustomerId}
                    onSelectCustomer={setSelectedCustomerId}
                    hideLabel={true}
                    placeholder="Type in a customer name and select or add a customer..."
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateCustomerModal(true)}
                  className="px-4 py-3 text-xs sm:text-sm text-white/70 border border-white/20 hover:border-white/30 bg-white/5 hover:bg-white/10 rounded-xl transition-all duration-300 min-h-[44px] flex items-center justify-center whitespace-nowrap gap-2"
                  title="Create new customer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Customer
                </button>
              </div>
            </div>
          )}
          
          {/* Individual mode - show hidden customer info */}
          {userMode === "individual" && (
            <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span className="text-white/70 text-sm">Personal design generation for you</span>
            </div>
          )}
          
          {/* Model picker */}
          <div className="space-y-3">
            {renderLabel("Model", selectedModel !== "", renderInfoButton(showModelInfo, setShowModelInfo))}
            {showModelInfo && (
              <div className="p-4 border border-white/10 bg-white/[0.02] rounded-xl">
                <p className="text-xs text-white/60 leading-relaxed">
                  Choose the AI model that will generate your tattoo design. <span className="text-white/80">NanoBanana</span> and <span className="text-white/80">Gemini 2.5</span> support reference images (placement or subject photos) and offer more creative control. <span className="text-white/80">Imagen 4</span> provides high-quality results but doesn&apos;t support reference images.
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedModel(m.id)}
                  className={`px-5 py-3 text-xs sm:text-sm rounded-xl transition-all duration-300 min-h-[44px] flex items-center justify-center font-medium ${
                    selectedModel === m.id
                      ? "bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                      : "bg-white/5 text-white/70 border border-white/10 hover:border-white/20 hover:bg-white/10"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Placement selection */}
          <div className="space-y-3">
            {renderLabel(
              "Placement (optional)",
              selectedPlacements.length > 0 || (showCustomPlacement && customPlacement.trim()),
              renderInfoButton(showPlacementInfo, setShowPlacementInfo)
            )}
            {showPlacementInfo && (
              <div className="p-4 border border-white/10 bg-white/[0.02] rounded-xl">
                <p className="text-xs text-white/60 leading-relaxed">
                  Select where on the body the tattoo will be placed. This helps the AI understand the context and proportions. You can choose from common placements or enter a custom body part. For more precise visualization, use a placement photo in the Reference Image section.
                </p>
              </div>
            )}
          <div className="flex flex-wrap gap-2">
            {PLACEMENTS.map((place) => {
              const active = selectedPlacements.includes(place);
              return (
                <button
                  key={place}
                  type="button"
                  onClick={() => {
                    setSelectedPlacements((prev) =>
                      prev.includes(place)
                        ? prev.filter((p) => p !== place)
                        : [...prev, place]
                    );
                    // If selecting a predefined placement, clear custom placement
                    if (!active) {
                      setShowCustomPlacement(false);
                      setCustomPlacement("");
                    }
                  }}
                  className={`px-4 py-3 text-xs rounded-xl transition-all duration-300 capitalize min-h-[44px] flex items-center justify-center font-medium ${
                    active
                      ? "bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                      : "bg-white/5 text-white/70 border border-white/10 hover:border-white/20 hover:bg-white/10"
                  }`}
                >
                  {place}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setShowCustomPlacement(!showCustomPlacement);
                if (showCustomPlacement) {
                  setCustomPlacement("");
                } else {
                  // Clear predefined placements when selecting "Other"
                  setSelectedPlacements([]);
                }
              }}
              className={`px-4 py-3 text-xs rounded-xl transition-all duration-300 min-h-[44px] flex items-center justify-center font-medium ${
                showCustomPlacement
                  ? "bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                  : "bg-white/5 text-white/70 border border-white/10 hover:border-white/20 hover:bg-white/10"
              }`}
            >
              Other
            </button>
          </div>
          {showCustomPlacement && (
            <div className="mt-3">
              <input
                type="text"
                value={customPlacement}
                onChange={(e) => setCustomPlacement(e.target.value)}
                placeholder="Enter body part (e.g., wrist, ankle, thigh)"
                className="w-full bg-black/50 border border-white/20 rounded-xl text-sm px-4 py-3.5 outline-none focus:border-purple-500/50 focus:bg-black/70 text-white placeholder:text-white/30 transition-all duration-300"
              />
            </div>
          )}
          </div>

          {/* Style selection with search */}
          <div className="space-y-3">
            {renderLabel("Styles (optional)", selectedStyleIds.length > 0, renderInfoButton(showStyleInfo, setShowStyleInfo))}
            {showStyleInfo && (
              <div className="p-4 border border-white/10 bg-white/[0.02] rounded-xl">
                <p className="text-xs text-white/60 leading-relaxed">
                  Select one or more tattoo styles to guide the design aesthetic. You can search for specific styles or browse by category. Combining multiple styles creates unique hybrid designs. Use the &quot;Find Favorite Styles&quot; button to browse and select from your saved favorite tattoo images.
                </p>
              </div>
            )}
            
            {/* Style Search */}
            <div className="flex gap-3">
              <div className="relative flex-1" ref={styleSearchRef}>
                <input
                  type="text"
                  value={styleSearchQuery}
                  onChange={(e) => {
                    setStyleSearchQuery(e.target.value);
                    setShowStyleSearchResults(true);
                  }}
                  onFocus={() => {
                    if (styleSearchQuery.trim()) {
                      setShowStyleSearchResults(true);
                    }
                  }}
                  placeholder="Search styles (e.g., 'realism', 'mandala', 'minimalist')"
                  className="w-full bg-black/50 border border-white/20 rounded-xl text-sm px-4 py-3.5 outline-none focus:border-purple-500/50 focus:bg-black/70 text-white placeholder:text-white/30 transition-all duration-300"
                />
              
              {/* Search Results Dropdown */}
              {showStyleSearchResults && styleSearchQuery.trim() && (
                <div className="absolute z-50 w-full mt-2 bg-black/95 backdrop-blur-sm border border-white/20 rounded-xl max-h-60 overflow-y-auto shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
                  {getFilteredStyles().length > 0 ? (
                    <div className="p-2 space-y-1">
                      {getFilteredStyles().map((item) => {
                        const isSelected = selectedStyleIds.includes(item.style.id);
                        return (
                          <button
                            key={item.style.id}
                            type="button"
                            onClick={() => handleStyleSearchSelect(item.style.id)}
                            disabled={isSelected}
                            className={`w-full text-left px-4 py-3 text-sm rounded-lg transition-all duration-200 ${
                              isSelected
                                ? "bg-purple-500/20 text-white/50 cursor-not-allowed"
                                : "text-white/80 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{item.style.name}</span>
                              {isSelected && (
                                <span className="text-purple-400 text-xs">Added</span>
                              )}
                            </div>
                            <div className="text-xs text-white/40 mt-0.5">
                              {item.category.name}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 text-sm text-white/50 text-center">
                      No styles found matching &quot;{styleSearchQuery}&quot;
                    </div>
                  )}
                </div>
              )}
              </div>
              <button
                type="button"
                onClick={() => {
                  // Reset formWasReset flag so favorites can be loaded when returning
                  setFormWasReset(false);
                  // Form state is already auto-saved, just navigate
                  window.location.href = "/favorite-styles";
                }}
                className="group px-5 py-3.5 text-xs sm:text-sm rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:bg-purple-500/20 hover:border-purple-500/50 transition-all duration-300 whitespace-nowrap shrink-0 min-h-[44px] flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                Find Favorites
              </button>
            </div>

            {/* Alternative: Category-based selection */}
            <details className="mt-3 group">
              <summary className="text-xs text-white/40 cursor-pointer hover:text-white/60 transition-colors flex items-center gap-2">
                <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Or select by category
              </summary>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <select
                  value={selectedCategoryId ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    const id = val ? Number(val) : null;
                    setSelectedCategoryId(id);
                    setCurrentStyleId("");
                  }}
                  className="w-full bg-black/50 border border-white/20 rounded-xl text-sm px-4 py-3.5 outline-none focus:border-purple-500/50 text-white/80"
                >
                  <option value="">All categories</option>
                  {TATTOO_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2">
                  <select
                    value={currentStyleId}
                    onChange={(e) => setCurrentStyleId(e.target.value)}
                  className="w-full bg-black/50 border border-white/20 rounded-xl text-sm px-4 py-3.5 outline-none focus:border-purple-500/50 text-white/80"
                  disabled={!selectedCategoryId}
                  >
                    <option value="">
                      {selectedCategoryId
                        ? "Select a style"
                        : "Select a category first"}
                    </option>
                    {selectedCategoryId &&
                      TATTOO_CATEGORIES.find(
                        (c) => c.id === selectedCategoryId
                      )?.styles.map((style) => (
                        <option key={style.id} value={style.id}>
                          {style.name}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (!currentStyleId) return;
                      const id = Number(currentStyleId);
                      // Reset formWasReset flag when user manually selects a style
                      setFormWasReset(false);
                      setSelectedStyleIds((prev) =>
                        prev.includes(id) ? prev : [...prev, id]
                      );
                      setCurrentStyleId("");
                    }}
                    disabled={
                      !selectedCategoryId ||
                      !currentStyleId ||
                      selectedStyleIds.includes(Number(currentStyleId))
                    }
                    className="px-3 py-2 text-sm rounded-lg bg-white/10 text-white hover:bg-white hover:text-black disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300"
                    aria-label="Add style"
                  >
                    +
                  </button>
                </div>
              </div>
            </details>

            {/* Selected Styles */}
            {selectedStyleIds.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedStyleIds.map((id) => {
                  // Find style across all categories so multiple-category
                  // selections are supported.
                  let style = null;
                  for (const cat of TATTOO_CATEGORIES) {
                    const found = (cat.styles || []).find((s) => s.id === id);
                    if (found) {
                      style = found;
                      break;
                    }
                  }
                  if (!style) return null;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() =>
                        setSelectedStyleIds((prev) =>
                          prev.filter((styleId) => styleId !== id)
                        )
                      }
                      className="group px-3 py-1.5 text-xs rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30 flex items-center gap-2 transition-all duration-300"
                    >
                      <span>{style.name}</span>
                      <span className="text-purple-400/60 group-hover:text-red-400">×</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Size selection */}
          <div className="space-y-3">
            {renderLabel(
              "Size (optional)",
              selectedSize !== "" && (selectedSize !== "other" || customSize.trim()),
              renderInfoButton(showSizeInfo, setShowSizeInfo)
            )}
            {showSizeInfo && (
              <div className="p-4 border border-white/10 bg-white/[0.02] rounded-xl">
                <p className="text-xs text-white/60 leading-relaxed">
                  Specify the approximate size of the tattoo. This helps the AI understand scale and detail level. <span className="text-white/80">S:</span> Small (5-10cm, credit card size), <span className="text-white/80">M:</span> Medium (10-15cm, smartphone size), <span className="text-white/80">L:</span> Large (&gt;15cm, hand size), <span className="text-white/80">XL:</span> Extra Large (&gt;20cm, covers arm or leg). You can also enter custom sizes like &quot;full-sleeve&quot; or &quot;back-piece&quot;.
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  if (selectedSize === "S") {
                    setSelectedSize("");
                    setCustomSize("");
                  } else {
                    setSelectedSize("S");
                    setCustomSize("");
                  }
                }}
                className={`px-4 py-3 text-xs rounded-xl transition-all duration-300 min-h-[44px] flex items-center justify-center font-medium ${
                  selectedSize === "S"
                    ? "bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                    : "bg-white/5 text-white/70 border border-white/10 hover:border-white/20 hover:bg-white/10"
                }`}
              >
                S: 5-10cm
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedSize === "M") {
                    setSelectedSize("");
                    setCustomSize("");
                  } else {
                    setSelectedSize("M");
                    setCustomSize("");
                  }
                }}
                className={`px-4 py-3 text-xs rounded-xl transition-all duration-300 min-h-[44px] flex items-center justify-center font-medium ${
                  selectedSize === "M"
                    ? "bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                    : "bg-white/5 text-white/70 border border-white/10 hover:border-white/20 hover:bg-white/10"
                }`}
              >
                M: 10-15cm
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedSize === "L") {
                    setSelectedSize("");
                    setCustomSize("");
                  } else {
                    setSelectedSize("L");
                    setCustomSize("");
                  }
                }}
                className={`px-4 py-3 text-xs rounded-xl transition-all duration-300 min-h-[44px] flex items-center justify-center font-medium ${
                  selectedSize === "L"
                    ? "bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                    : "bg-white/5 text-white/70 border border-white/10 hover:border-white/20 hover:bg-white/10"
                }`}
              >
                L: &gt;15cm
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedSize === "XL") {
                    setSelectedSize("");
                    setCustomSize("");
                  } else {
                    setSelectedSize("XL");
                    setCustomSize("");
                  }
                }}
                className={`px-4 py-3 text-xs rounded-xl transition-all duration-300 min-h-[44px] flex items-center justify-center font-medium ${
                  selectedSize === "XL"
                    ? "bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                    : "bg-white/5 text-white/70 border border-white/10 hover:border-white/20 hover:bg-white/10"
                }`}
              >
                XL: &gt;20cm
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedSize === "other") {
                    setSelectedSize("");
                    setCustomSize("");
                  } else {
                    setSelectedSize("other");
                  }
                }}
                className={`px-4 py-3 text-xs rounded-xl transition-all duration-300 min-h-[44px] flex items-center justify-center font-medium ${
                  selectedSize === "other"
                    ? "bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                    : "bg-white/5 text-white/70 border border-white/10 hover:border-white/20 hover:bg-white/10"
                }`}
              >
                Other
              </button>
            </div>
            {selectedSize === "other" && (
              <input
                type="text"
                value={customSize}
                onChange={(e) => setCustomSize(e.target.value)}
                placeholder="full-sleeve, leg-sleeve, back-piece"
                className="w-full bg-black/50 border border-white/20 rounded-xl text-sm px-4 py-3.5 outline-none focus:border-purple-500/50 focus:bg-black/70 text-white placeholder:text-white/30 transition-all duration-300"
              />
            )}
          </div>

          {/* Color selection */}
          <div className="space-y-3">
            {renderLabel(
              "Color (optional)",
              selectedColor !== "" && (selectedColor !== "custom" || customColor.trim()) && (selectedColor !== "monochromatic" || monochromaticColor.trim()),
              renderInfoButton(showColorInfo, setShowColorInfo)
            )}
            {showColorInfo && (
              <div className="p-4 border border-white/10 bg-white/[0.02] rounded-xl">
                <p className="text-xs text-white/60 leading-relaxed">
                  Choose the color scheme for your tattoo. <span className="text-white/80">Black & Grey:</span> Classic monochrome tattoos. <span className="text-white/80">Full Color:</span> Vibrant, colorful designs. <span className="text-white/80">Natural Palette:</span> Earthy, realistic colors. <span className="text-white/80">Monochromatic:</span> Single color of your choice. <span className="text-white/80">Sepia/Vintage:</span> Aged, vintage look. <span className="text-white/80">White Ink:</span> Subtle white ink tattoos. <span className="text-white/80">Other:</span> Specify custom color descriptions.
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  if (selectedColor === "black-grey") {
                    setSelectedColor("");
                  } else {
                    setSelectedColor("black-grey");
                    setShowCustomColor(false);
                    setCustomColor("");
                  }
                }}
                  className={`px-4 py-3 text-xs rounded-xl transition-all duration-300 min-h-[44px] flex items-center justify-center font-medium ${
                    selectedColor === "black-grey"
                      ? "bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                      : "bg-white/5 text-white/70 border border-white/10 hover:border-white/20 hover:bg-white/10"
                  }`}
              >
                Black & Grey
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedColor === "full-color") {
                    setSelectedColor("");
                  } else {
                    setSelectedColor("full-color");
                    setShowCustomColor(false);
                    setCustomColor("");
                  }
                }}
                className={`px-4 py-3 text-xs rounded-xl transition-all duration-300 min-h-[44px] flex items-center justify-center font-medium ${
                  selectedColor === "full-color"
                    ? "bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                    : "bg-white/5 text-white/70 border border-white/10 hover:border-white/20 hover:bg-white/10"
                }`}
              >
                Full Color
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedColor === "natural-palette") {
                    setSelectedColor("");
                  } else {
                    setSelectedColor("natural-palette");
                    setShowCustomColor(false);
                    setCustomColor("");
                  }
                }}
                className={`px-4 py-3 text-xs rounded-xl transition-all duration-300 min-h-[44px] flex items-center justify-center font-medium ${
                  selectedColor === "natural-palette"
                    ? "bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                    : "bg-white/5 text-white/70 border border-white/10 hover:border-white/20 hover:bg-white/10"
                }`}
              >
                Natural
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedColor === "monochromatic") {
                    setSelectedColor("");
                    setMonochromaticColor("");
                  } else {
                    setSelectedColor("monochromatic");
                    setShowCustomColor(false);
                    setCustomColor("");
                  }
                }}
                className={`px-4 py-3 text-xs rounded-xl transition-all duration-300 min-h-[44px] flex items-center justify-center font-medium ${
                  selectedColor === "monochromatic"
                    ? "bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                    : "bg-white/5 text-white/70 border border-white/10 hover:border-white/20 hover:bg-white/10"
                }`}
              >
                Monochromatic
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedColor === "sepia-vintage") {
                    setSelectedColor("");
                  } else {
                    setSelectedColor("sepia-vintage");
                    setShowCustomColor(false);
                    setCustomColor("");
                    setMonochromaticColor("");
                  }
                }}
                className={`px-4 py-3 text-xs rounded-xl transition-all duration-300 min-h-[44px] flex items-center justify-center font-medium ${
                  selectedColor === "sepia-vintage"
                    ? "bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                    : "bg-white/5 text-white/70 border border-white/10 hover:border-white/20 hover:bg-white/10"
                }`}
              >
                Sepia / Vintage
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedColor === "white-ink") {
                    setSelectedColor("");
                  } else {
                    setSelectedColor("white-ink");
                    setShowCustomColor(false);
                    setCustomColor("");
                    setMonochromaticColor("");
                  }
                }}
                className={`px-4 py-3 text-xs rounded-xl transition-all duration-300 min-h-[44px] flex items-center justify-center font-medium ${
                  selectedColor === "white-ink"
                    ? "bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                    : "bg-white/5 text-white/70 border border-white/10 hover:border-white/20 hover:bg-white/10"
                }`}
              >
                White Ink
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedColor === "custom") {
                    setSelectedColor("");
                    setShowCustomColor(false);
                    setCustomColor("");
                  } else {
                    setSelectedColor("custom");
                    setShowCustomColor(true);
                    setMonochromaticColor("");
                  }
                }}
                className={`px-4 py-3 text-xs rounded-xl transition-all duration-300 min-h-[44px] flex items-center justify-center font-medium ${
                  selectedColor === "custom"
                    ? "bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                    : "bg-white/5 text-white/70 border border-white/10 hover:border-white/20 hover:bg-white/10"
                }`}
              >
                Other
              </button>
            </div>
            {selectedColor === "monochromatic" && (
              <div className="mt-2">
                <input
                  type="text"
                  value={monochromaticColor}
                  onChange={(e) => setMonochromaticColor(e.target.value)}
                  placeholder="Enter color (e.g., red, blue, green)"
                  className="w-full bg-black border border-white/30 text-sm sm:text-base px-4 py-3 outline-none focus:border-white text-white placeholder:text-white/40 min-h-[44px]"
                />
              </div>
            )}
            {showCustomColor && (
              <div className="mt-2">
                <input
                  type="text"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  placeholder="Custom color (e.g., Golden Accents)"
                  className="w-full bg-black border border-white/30 text-sm sm:text-base px-4 py-3 outline-none focus:border-white text-white placeholder:text-white/40 min-h-[44px]"
                />
              </div>
            )}
          </div>

          {/* Reference image upload (NanoBanana / Gemini only) */}
          {(selectedModel === "nanobanana" || selectedModel === "gemini25") && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {renderLabel("Reference Image (optional)", referenceImages.filter(img => img.type === referenceImageType).length > 0 && referenceImageType !== "", renderInfoButton(showReferenceImageInfo, setShowReferenceImageInfo))}
                </div>
                
                {/* TLDR Version (always visible) */}
                <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
                  <p className="text-xs text-white/50 leading-relaxed">
                    <span className="text-white/70 font-medium">Placement:</span> Upload a body part photo to visualize the tattoo placement.<br />
                    <span className="text-white/70 font-medium">Subject:</span> Upload a reference photo (family, pet, Pinterest) for design inspiration.
                  </p>
                </div>
                
                {/* Expanded Info (toggleable) */}
                {showReferenceImageInfo && (
                  <div className="space-y-3 p-4 border border-white/10 bg-white/[0.02] rounded-xl">
                    <p className="text-xs text-white/60 leading-relaxed">
                      Choose one reference type to guide your tattoo generation. Both options serve different purposes and cannot be used simultaneously.
                    </p>
                    
                    <div className="space-y-3 text-xs text-white/50">
                      <div className="border-l-2 border-purple-500/30 pl-4 py-2 bg-purple-500/5 rounded-r-lg">
                        <p className="font-medium text-white/80 mb-1 flex items-center gap-2">
                          <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Placement Photo
                        </p>
                        <p className="leading-relaxed">
                          Perfect for visualizing how a tattoo will look on a specific body part. Upload a photo of your customer&apos;s arm, back, chest, or other body area.
                        </p>
                      </div>
                      
                      <div className="border-l-2 border-blue-500/30 pl-4 py-2 bg-blue-500/5 rounded-r-lg">
                        <p className="font-medium text-white/80 mb-1 flex items-center gap-2">
                          <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Subject Photo
                        </p>
                        <p className="leading-relaxed">
                          Ideal for using a photo as the subject matter of your tattoo design. Upload photos of family members, pets, objects, or Pinterest tattoos.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Image type selector */}
                <div className="flex gap-3 items-center">
                  <button
                    type="button"
                    onClick={() => {
                      // Toggle: if already selected, deselect; otherwise select and clear other type's images
                      if (referenceImageType === "placement") {
                        setReferenceImageType("");
                        // Clear only placement images when deselecting
                        setReferenceImages(prev => prev.filter(img => img.type !== "placement"));
                      } else {
                        setReferenceImageType("placement");
                        // Clear subject images when switching to placement
                        setReferenceImages(prev => prev.filter(img => img.type !== "subject"));
                      }
                    }}
                    className={`group px-5 py-3 text-xs rounded-xl transition-all duration-300 min-h-[44px] flex items-center justify-center gap-2 font-medium ${
                      referenceImageType === "placement"
                        ? "bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                        : "bg-white/5 text-white/70 border border-white/10 hover:border-white/20 hover:bg-white/10"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Placement Photo
                  </button>
                  <span className="text-xs text-white/30 font-medium">OR</span>
                  <button
                    type="button"
                    onClick={() => {
                      // Toggle: if already selected, deselect; otherwise select and clear other type's images
                      if (referenceImageType === "subject") {
                        setReferenceImageType("");
                        // Clear only subject images when deselecting
                        setReferenceImages(prev => prev.filter(img => img.type !== "subject"));
                      } else {
                        setReferenceImageType("subject");
                        // Clear placement images when switching to subject
                        setReferenceImages(prev => prev.filter(img => img.type !== "placement"));
                      }
                    }}
                    className={`group px-5 py-3 text-xs rounded-xl transition-all duration-300 min-h-[44px] flex items-center justify-center gap-2 font-medium ${
                      referenceImageType === "subject"
                        ? "bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                        : "bg-white/5 text-white/70 border border-white/10 hover:border-white/20 hover:bg-white/10"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Subject Photo
                  </button>
                </div>
              </div>
              
              {/* Only show file input when a type is selected */}
              {referenceImageType && (
                <div className="p-4 rounded-xl border border-dashed border-white/20 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04] transition-all duration-300">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePortraitChange}
                    className={`block w-full text-xs file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-medium transition-colors cursor-pointer ${
                      referenceImages.filter(img => img.type === referenceImageType).length > 0
                        ? "text-white/70 file:bg-purple-500 file:text-white hover:file:bg-purple-600"
                        : "text-white/50 file:bg-white/10 file:text-white/70 hover:file:bg-white/20"
                    }`}
                  />
                  <p className="text-xs text-white/30 mt-2">Drag and drop or click to upload</p>
                </div>
              )}
              {referenceImageType && referenceImages.filter(img => img.type === referenceImageType).length > 0 && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${referenceImageType === "placement" ? "bg-purple-500" : "bg-blue-500"}`} />
                    <p className="text-xs text-white/60 font-medium">
                      {referenceImages.filter(img => img.type === referenceImageType).length} {referenceImageType} image{referenceImages.filter(img => img.type === referenceImageType).length > 1 ? "s" : ""} uploaded
                    </p>
                  </div>
                  <div className="space-y-3">
                    {/* Show images for current type */}
                    {referenceImages.filter(img => img.type === referenceImageType).length > 0 && (
                      <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
                        <p className="text-xs text-white/40 mb-3 font-medium uppercase tracking-wide">
                          {referenceImageType === "placement" ? "Placement Photos" : "Subject Photos"}
                        </p>
                        <div className="flex flex-wrap gap-3">
                          {referenceImages
                            .map((img, originalIndex) => ({ img, originalIndex }))
                            .filter(({ img }) => img.type === referenceImageType)
                            .map(({ img, originalIndex }) => (
                              <div
                                key={originalIndex}
                                className="group relative flex items-center gap-3 rounded-lg border border-white/10 bg-black/40 p-2 pr-3 hover:border-white/20 transition-all duration-300"
                              >
                                <div className="w-14 h-14 rounded-lg border border-white/20 bg-black/60 overflow-hidden flex items-center justify-center">
                                  <img
                                    src={`data:${img.mimeType || "image/png"};base64,${img.data}`}
                                    alt={`Reference ${originalIndex + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <p className="text-xs text-white/60 truncate max-w-[100px]">
                                  {img.fileName}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => removeReferenceImage(originalIndex)}
                                  className="ml-auto w-6 h-6 flex items-center justify-center rounded-full text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300"
                                  aria-label="Remove image"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                    {/* Show images for other type (if any) */}
                    {referenceImageType && referenceImages.filter(img => img.type !== referenceImageType).length > 0 && (
                      <div className="p-3 rounded-lg border border-white/5 bg-white/[0.01]">
                        <p className="text-xs text-white/30 mb-1">
                          {referenceImageType === "placement" ? "Subject Photos" : "Placement Photos"} (switch type to see)
                        </p>
                        <p className="text-xs text-white/40">
                          {referenceImages.filter(img => img.type !== referenceImageType).length} image{referenceImages.filter(img => img.type !== referenceImageType).length > 1 ? "s" : ""} of other type
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Skin Color selection */}
          <div className="space-y-3">
            {renderLabel("Skin Color (optional)", selectedSkinColor !== "", renderInfoButton(showSkinColorInfo, setShowSkinColorInfo))}
            {showSkinColorInfo && (
              <div className="p-4 border border-white/10 bg-white/[0.02] rounded-xl">
                <p className="text-xs text-white/60 leading-relaxed">
                  Select the skin tone to help the AI render the tattoo with appropriate contrast and color adaptation. This ensures the design looks realistic and visible on the chosen skin tone.
                </p>
              </div>
            )}
            <p className="text-xs text-white/40">
              Select the skin tone for realistic tattoo rendering
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "light", label: "Light", color: "#F4C2A1" },
                { id: "light-medium", label: "Light Med", color: "#E6B89C" },
                { id: "medium", label: "Medium", color: "#D4A574" },
                { id: "medium-dark", label: "Med Dark", color: "#B8864F" },
                { id: "dark", label: "Dark", color: "#8B5A3C" },
                { id: "very-dark", label: "Very Dark", color: "#5C3A2A" },
              ].map((skinTone) => (
                <button
                  key={skinTone.id}
                  type="button"
                  onClick={() => {
                    if (selectedSkinColor === skinTone.id) {
                      setSelectedSkinColor("");
                    } else {
                      setSelectedSkinColor(skinTone.id);
                    }
                  }}
                  className={`group flex flex-col items-center gap-2 px-4 py-3 rounded-xl transition-all duration-300 ${
                    selectedSkinColor === skinTone.id
                      ? "bg-white/10 border border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                      : "bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full transition-all duration-300 ${
                      selectedSkinColor === skinTone.id
                        ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-110"
                        : "group-hover:scale-105"
                    }`}
                    style={{ backgroundColor: skinTone.color }}
                  />
                  <span className={`text-[10px] font-medium transition-colors ${
                    selectedSkinColor === skinTone.id ? "text-white" : "text-white/60"
                  }`}>{skinTone.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt */}
          <div className="space-y-3">
            <label className={`flex items-center gap-3 text-sm font-medium tracking-wide transition-colors duration-300 ${
              prompt.trim().length > 0
                ? "text-white" 
                : "text-white/50"
            }`}>
              <span className={`w-2 h-2 rounded-full transition-all duration-300 ${prompt.trim().length > 0 ? "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"}`} />
              Design Description <span className="text-red-400/80 text-xs ml-1">(Required)</span>
              {renderInfoButton(showSubjectInfo, setShowSubjectInfo)}
            </label>
            {showSubjectInfo && (
              <div className="p-4 border border-white/10 bg-white/[0.02] rounded-xl">
                <p className="text-xs text-white/60 leading-relaxed">
                  Describe the main subject or design elements you want in your tattoo. Be specific: include what you want (e.g., &quot;howling wolf&quot;, &quot;rose with thorns&quot;, &quot;dragon in flight&quot;), style hints (e.g., &quot;mandala&quot;, &quot;realism&quot;), placement context, mood (e.g., &quot;delicate&quot;, &quot;bold&quot;, &quot;mystical&quot;), and any symbols or elements. The more detail you provide, the better the AI can create your vision.
                </p>
              </div>
            )}
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                placeholder="Describe your tattoo vision... (e.g., Phoenix rising from flames, Rose with thorns, Dragon in flight)"
                className={`w-full px-5 py-4 text-sm bg-black/50 rounded-xl text-white outline-none focus:bg-black/70 resize-none min-h-[140px] placeholder:text-white/30 transition-all duration-300 ${
                  prompt.trim().length > 0 
                    ? "border border-white/20 focus:border-purple-500/50" 
                    : "border border-red-500/40 focus:border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                }`}
              />
              <div className="absolute bottom-3 right-3 text-xs text-white/30">
                {prompt.length} characters
              </div>
            </div>
          </div>

          {/* Number of Generated Images */}
          <div className="space-y-3">
            {renderLabel("Number of Images", numberOfImages > 0, renderInfoButton(showNumberOfImagesInfo, setShowNumberOfImagesInfo))}
            {showNumberOfImagesInfo && (
              <div className="p-4 border border-white/10 bg-white/[0.02] rounded-xl">
                <p className="text-xs text-white/60 leading-relaxed">
                  Choose how many design variations you want to generate. Each image costs credits, so generating more gives you more options to choose from. You can generate 1-4 designs at a time. After generation, you can create stencils from any of the designs.
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4].map((num) => {
                const creditsNeeded = num * CREDIT_COSTS.GENERATE_DESIGN;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setNumberOfImages(num)}
                    className={`px-5 py-3 text-sm rounded-xl transition-all duration-300 min-h-[44px] min-w-[50px] flex items-center justify-center font-medium ${
                      numberOfImages === num
                        ? "bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                        : "bg-white/5 text-white/70 border border-white/10 hover:border-white/20 hover:bg-white/10"
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-white/40 flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {numberOfImages} image{numberOfImages > 1 ? "s" : ""} = {numberOfImages * CREDIT_COSTS.GENERATE_DESIGN} credit{numberOfImages * CREDIT_COSTS.GENERATE_DESIGN > 1 ? "s" : ""}
            </p>
          </div>

          {(() => {
            const requiredCredits = numberOfImages * CREDIT_COSTS.GENERATE_DESIGN;
            const hasEnoughCredits = userCredits !== null && userCredits >= requiredCredits;
            const insufficientCredits = userCredits !== null && userCredits < requiredCredits;
            const missingCustomer = userMode === "parlor" && !selectedCustomerId;
            const missingPrompt = !prompt.trim();
            const showCustomerHelp = hasEnoughCredits && missingCustomer;
            const showPromptHelp = missingPrompt && !missingCustomer && hasEnoughCredits;
            const isButtonEnabled = !isGenerating && !missingPrompt && !missingCustomer && !insufficientCredits;
            
            // Build summary of choices (in same order as form)
            const buildSummary = () => {
              const parts = [];
              
              // 1. Customer (always show)
              if (userMode === "individual") {
                parts.push("Customer: For Me");
              } else if (selectedCustomerId && selectedCustomerName) {
                parts.push(`Customer: ${selectedCustomerName}`);
              } else if (selectedCustomerId) {
                parts.push("Customer: Selected");
              } else {
                parts.push("Customer: Not set");
              }
              
              // 2. Placement (always show)
              if (showCustomPlacement && customPlacement.trim()) {
                parts.push(`Placement: ${customPlacement.trim()}`);
              } else if (selectedPlacements.length > 0) {
                const placements = selectedPlacements.length <= 2
                  ? selectedPlacements.join(", ")
                  : `${selectedPlacements[0]} and ${selectedPlacements.length - 1} more`;
                parts.push(`Placement: ${placements}`);
              } else {
                parts.push("Placement: Not set");
              }
              
              // 3. Style(s) (always show)
              if (selectedStyleIds.length > 0) {
                const selectedStyles = TATTOO_CATEGORIES.flatMap((c) =>
                  (c.styles || []).filter((s) => selectedStyleIds.includes(s.id))
                );
                if (selectedStyles.length > 0) {
                  const styleNames = selectedStyles.length <= 2
                    ? selectedStyles.map((s) => s.name).join(", ")
                    : `${selectedStyles[0].name} and ${selectedStyles.length - 1} more`;
                  parts.push(`Style: ${styleNames}`);
                } else {
                  parts.push("Style: Not set");
                }
              } else if (selectedCategoryId) {
                const category = TATTOO_CATEGORIES.find((c) => c.id === selectedCategoryId);
                if (category) {
                  parts.push(`Category: ${category.name}`);
                } else {
                  parts.push("Style: Not set");
                }
              } else {
                parts.push("Style: Not set");
              }
              
              // 4. Size (always show)
              if (selectedSize === "other" && customSize.trim()) {
                parts.push(`Size: ${customSize.trim()}`);
              } else if (selectedSize === "S") {
                parts.push("Size: S (5-10cm)");
              } else if (selectedSize === "M") {
                parts.push("Size: M (10-15cm)");
              } else if (selectedSize === "L") {
                parts.push("Size: L (>15cm)");
              } else if (selectedSize === "XL") {
                parts.push("Size: XL (>20cm)");
              } else {
                parts.push("Size: Not set");
              }
              
              // 5. Color (always show)
              if (selectedColor === "custom" && customColor.trim()) {
                parts.push(`Color: ${customColor.trim()}`);
              } else if (selectedColor === "black-grey") {
                parts.push("Color: Black & Grey");
              } else if (selectedColor === "full-color") {
                parts.push("Color: Full Color");
              } else if (selectedColor === "natural-palette") {
                parts.push("Color: Natural Palette");
              } else if (selectedColor === "monochromatic") {
                if (monochromaticColor.trim()) {
                  parts.push(`Color: Monochromatic ${monochromaticColor.trim()}`);
                } else {
                  parts.push("Color: Monochromatic");
                }
              } else if (selectedColor === "sepia-vintage") {
                parts.push("Color: Sepia/Vintage");
              } else if (selectedColor === "white-ink") {
                parts.push("Color: White Ink");
              } else {
                parts.push("Color: Not set");
              }
              
              // 6. Reference Image (always show - only applicable for nanobanana/gemini25)
              const placementImages = referenceImages.filter(img => img.type === "placement");
              const subjectImages = referenceImages.filter(img => img.type === "subject");
              if (placementImages.length > 0) {
                parts.push(`Reference Image: Placement (${placementImages.length} image${placementImages.length > 1 ? "s" : ""})`);
              } else if (subjectImages.length > 0) {
                parts.push(`Reference Image: Subject (${subjectImages.length} image${subjectImages.length > 1 ? "s" : ""})`);
              } else {
                parts.push("Reference Image: Not set");
              }
              
              // 7. Skin Color (always show)
              if (selectedSkinColor) {
                const skinColorLabels = {
                  "light": "Light",
                  "light-medium": "Light Medium",
                  "medium": "Medium",
                  "medium-dark": "Medium Dark",
                  "dark": "Dark",
                  "very-dark": "Very Dark",
                };
                parts.push(`Skin Color: ${skinColorLabels[selectedSkinColor] || selectedSkinColor}`);
              } else {
                parts.push("Skin Color: Not set");
              }
              
              // 8. Subject/Design Elements (always show)
              if (prompt.trim()) {
                const promptPreview = prompt.trim().length > 50 
                  ? prompt.trim().substring(0, 50) + "..." 
                  : prompt.trim();
                parts.push(`Subject: "${promptPreview}"`);
              } else {
                parts.push("Subject: Not set");
              }
              
              // 9. Number of images (always show - has default)
              parts.push(`Quantity: ${numberOfImages} design${numberOfImages > 1 ? "s" : ""}`);
              
              return parts.join(" • ");
            };
            
            return (
              <div className="space-y-4 pt-4 border-t border-white/10">
                {!user ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowAuthModal(true);
                    }}
                    className="group w-full sm:w-auto px-8 py-4 text-sm font-semibold rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:shadow-[0_0_40px_rgba(139,92,246,0.5)] transition-all duration-300 flex items-center justify-center gap-3"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Sign in to Generate
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isGenerating || missingPrompt || missingCustomer || insufficientCredits}
                    className={`group w-full sm:w-auto px-8 py-4 text-sm font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-3 ${
                      insufficientCredits || (missingCustomer && hasEnoughCredits) || (missingPrompt && !missingCustomer && hasEnoughCredits)
                        ? "bg-red-500/20 text-red-300 border border-red-500/30 cursor-not-allowed"
                        : isButtonEnabled
                          ? "text-black bg-white shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.3)] hover:scale-[1.02] cursor-pointer"
                          : "text-white/40 bg-white/10 border border-white/10 cursor-not-allowed"
                    }`}
                  >
                    {isGenerating ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating {numberOfImages} design{numberOfImages > 1 ? "s" : ""}...
                      </>
                    ) : insufficientCredits ? (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Not enough Credits
                      </>
                    ) : missingCustomer && hasEnoughCredits ? (
                      "Select a Customer"
                    ) : missingPrompt && !missingCustomer && hasEnoughCredits ? (
                      "Add Design Description"
                    ) : (
                      <>
                        <svg className="w-5 h-5 transition-transform group-hover:rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Generate {numberOfImages} Design{numberOfImages > 1 ? "s" : ""} • {requiredCredits} Credit{requiredCredits > 1 ? "s" : ""}
                      </>
                    )}
                  </button>
                )}
                {isButtonEnabled && !isGenerating && (
                  <div className="p-4 bg-white/[0.02] border border-white/10 rounded-xl max-w-2xl">
                    <p className="text-sm text-white/70 leading-relaxed">
                      {buildSummary()}
                    </p>
                  </div>
                )}
                {showCustomerHelp && (
                  <p className="text-xs text-white/50 max-w-md flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Create a customer using &quot;+ Add Customer&quot;, or select an existing one
                  </p>
                )}
                {showPromptHelp && (
                  <p className="text-xs text-white/60 max-w-md">
                    The Subject/Design Elements field is mandatory, please fill something in like a &quot;howling wolf&quot; or &quot;a beautiful giraffe&quot;.
                  </p>
                )}
              </div>
            );
          })()}
        </form>
        ) : (
          <div className="border border-white/20 bg-black/60 p-8 text-center space-y-4">
            <h2 className="text-xl font-light">Coming Soon</h2>
            <p className="text-sm text-white/60">
              Tattoo generation will be available soon. Stay tuned!
            </p>
          </div>
        )}

        {images && images.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/60">
                Preview ({images.length} image{images.length > 1 ? "s" : ""})
              </p>
              {images.length > 0 && (
                <div className="flex flex-col items-end gap-1">
                  <button
                    type="button"
                    onClick={handleGenerateStencils}
                    disabled={isGeneratingStencils}
                    className="px-5 py-3 text-sm font-medium text-white bg-white/10 border border-white/30 hover:bg-white/20 disabled:bg-white/5 disabled:text-white/40 disabled:cursor-not-allowed transition-colors min-h-[44px]"
                  >
                    {isGeneratingStencils 
                      ? `Generating ${images.length} stencil${images.length > 1 ? "s" : ""}...` 
                      : `Generate ${images.length} stencil${images.length > 1 ? "s" : ""} for ${images.length * CREDIT_COSTS.GENERATE_STENCIL} credit${images.length * CREDIT_COSTS.GENERATE_STENCIL > 1 ? "s" : ""}`}
                  </button>
                  {referenceImages.filter(img => img.type === "placement").length > 0 && selectedPlacements.length > 0 && (
                    <p className="text-[10px] text-white/40 text-right">
                      Will infer unseen curved areas
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="border border-white/15 bg-black/60 p-2 flex items-center justify-center cursor-pointer hover:border-white/30 transition-colors"
                  onClick={() => setSelectedImageIndex(idx)}
                >
                  <img
                    src={img}
                    alt={`Generated tattoo design ${idx + 1}`}
                    className="w-full h-auto object-contain"
                  />
                </div>
              ))}
            </div>
            
            {/* Modal for enlarged image view */}
            {selectedImageIndex !== null && images && images[selectedImageIndex] && (
              <div
                className="fixed inset-0 z-[9997] flex items-center justify-center p-4 sm:p-6 bg-black/95 backdrop-blur-sm"
                onClick={() => setSelectedImageIndex(null)}
              >
                <div
                  className="max-w-6xl w-full max-h-[90vh] overflow-y-auto relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="bg-black border border-white/10 p-4 sm:p-8 md:p-12">
                    {/* Close button */}
                    <button
                      onClick={() => setSelectedImageIndex(null)}
                      className="absolute top-4 right-4 sm:top-6 sm:right-6 text-white/40 hover:text-white/80 text-3xl font-light w-10 h-10 flex items-center justify-center transition-colors z-10 min-h-[44px] min-w-[44px]"
                      aria-label="Close"
                    >
                      ×
                    </button>

                    {/* Main image */}
                    <div className="mb-6">
                      <div className="relative aspect-square max-w-2xl mx-auto border border-white/10">
                        <img
                          src={images[selectedImageIndex]}
                          alt={`Generated tattoo design ${selectedImageIndex + 1}`}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="mt-6 text-center">
                        <h3 className="text-2xl sm:text-3xl md:text-4xl font-light text-white mb-2 tracking-tight">
                          Generated Design {selectedImageIndex + 1} of {images.length}
                        </h3>
                      </div>
                    </div>

                    {/* Navigation arrows */}
                    {images.length > 1 && (
                      <div className="flex items-center justify-between mt-6">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedImageIndex(selectedImageIndex > 0 ? selectedImageIndex - 1 : images.length - 1);
                          }}
                          className="px-4 py-2 text-white/70 hover:text-white border border-white/30 hover:border-white/50 transition-colors min-h-[44px]"
                          aria-label="Previous image"
                        >
                          ← Previous
                        </button>
                        <span className="text-white/50 text-sm">
                          {selectedImageIndex + 1} / {images.length}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedImageIndex(selectedImageIndex < images.length - 1 ? selectedImageIndex + 1 : 0);
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
            )}
          </div>
        )}

        {stencils && stencils.length > 0 && (
          <div className="mt-6 space-y-2">
            <p className="text-xs text-white/60">
              Stencils ({stencils.length} stencil{stencils.length > 1 ? "s" : ""})
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {stencils.map((stencil, idx) => (
                <div
                  key={idx}
                  className="border border-white/15 bg-black/60 p-2 flex items-center justify-center"
                >
                  <img
                    src={stencil}
                    alt={`Stencil ${idx + 1}`}
                    className="w-full h-auto object-contain"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {resultText && (
          <div className="mt-4 border border-white/15 bg-black/60 p-4 text-xs sm:text-sm whitespace-pre-wrap text-white/70">
            {resultText}
          </div>
        )}
        
        {showPurchaseCredits && (
          <div className="mt-4 border border-white/20 bg-black/60 p-6">
            <PurchaseCredits />
            <button
              type="button"
              onClick={() => setShowPurchaseCredits(false)}
              className="mt-4 text-xs text-white/60 hover:text-white/80"
            >
              Close
            </button>
          </div>
        )}
      </div>

      {/* Create Customer Modal */}
      {showCreateCustomerModal && user && (
        <CreateCustomerModal
          isOpen={showCreateCustomerModal}
          onClose={() => setShowCreateCustomerModal(false)}
          onSuccess={async (customerId) => {
            // Refresh customer list by triggering a re-render
            // The CustomerSelector will automatically refresh
            setSelectedCustomerId(customerId);
            setIsForMe(false);
            setShowCreateCustomerModal(false);
          }}
          userId={user.uid}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        signInMessage="Sign in to create AI tattoo designs"
      />
    </div>
  );
}

// Customer Creation Modal Component
function CreateCustomerModal({ isOpen, onClose, onSuccess, userId }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError("Name, email, and phone are required");
      return;
    }

    if (!user) {
      setError("You must be signed in to create a customer");
      return;
    }

    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setName("");
        setEmail("");
        setPhone("");
        setNotes("");
        onSuccess(data.customerId);
      } else {
        setError(data.error || "Failed to create customer");
      }
    } catch (err) {
      console.error("Error creating customer:", err);
      setError("Failed to create customer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-y-auto p-4">
      <div className="relative w-full max-w-md mx-auto my-auto bg-black border border-white/20 p-4 sm:p-6 lg:p-8">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 text-white/60 hover:text-white text-2xl leading-none min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Close"
        >
          ×
        </button>

        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-light tracking-tight text-white mb-2">
              Add Customer
            </h2>
            <p className="text-sm text-white/60">
              Create a new customer profile
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-900/30 border border-red-500/50 text-red-200 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-white/60 uppercase tracking-[0.16em] mb-2">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-black border border-white/30 text-sm sm:text-base px-4 py-3 outline-none focus:border-white text-white min-h-[44px]"
                placeholder="Customer name"
              />
            </div>

            <div>
              <label className="block text-xs text-white/60 uppercase tracking-[0.16em] mb-2">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-black border border-white/30 text-sm px-3 py-2 outline-none focus:border-white text-white min-h-[44px]"
                placeholder="customer@email.com"
              />
            </div>

            <div>
              <label className="block text-xs text-white/60 uppercase tracking-[0.16em] mb-2">
                Phone <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full bg-black border border-white/30 text-sm px-3 py-2 outline-none focus:border-white text-white min-h-[44px]"
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <label className="block text-xs text-white/60 uppercase tracking-[0.16em] mb-2">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full bg-black border border-white/30 text-sm px-3 py-2 outline-none focus:border-white text-white resize-none"
                placeholder="Additional notes about the customer..."
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 text-sm font-medium text-white border border-white/30 hover:bg-white/10 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 text-sm font-medium text-black bg-white border border-white/20 disabled:bg-white/30 disabled:text-black/40 disabled:cursor-not-allowed min-h-[44px]"
              >
                {loading ? "Creating..." : "Create Customer"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

