"use client";

import { useState } from "react";
import Link from "next/link";
import { TATTOO_CATEGORIES } from "@/lib/tattoo-categories";
import { storage } from "@/lib/firebase";
import { ref, uploadString } from "firebase/storage";

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
  { id: "imagen4", label: "Imagen 4" },
  { id: "nanobanana", label: "NanoBanana" },
  { id: "gemini25", label: "Gemini 2.5" },
];

export default function GeneratePage() {
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("imagen4");
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultText, setResultText] = useState("");
  const [images, setImages] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedStyleIds, setSelectedStyleIds] = useState([]);
  const [currentStyleId, setCurrentStyleId] = useState("");
  const [selectedPlacements, setSelectedPlacements] = useState([]);
  const [referenceImages, setReferenceImages] = useState([]);
  const [referenceImageType, setReferenceImageType] = useState("placement"); // "placement" or "subject"

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
          
          // Add to state
          setReferenceImages((prev) => [...prev, imageData]);
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

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

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

      if (selectedPlacements.length > 0) {
        const places = selectedPlacements.map((p) => p.toLowerCase()).join(" or ");
        extraParts.push(`placement on the ${places}`);
      }

      if (extraParts.length > 0) {
        fullPrompt = `${fullPrompt}\n\nStyle / placement: ${extraParts.join(
          ", "
        )}`;
      }

      const body = {
        prompt: fullPrompt,
        model: selectedModel,
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
        // Include selected placements for placement photos
        if (referenceImageType === "placement" && selectedPlacements.length > 0) {
          body.selectedPlacements = selectedPlacements;
        }
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setResultText(data.error || "Failed to generate image.");
        return;
      }

      if (Array.isArray(data.images) && data.images.length > 0) {
        setImages(data.images);
        setResultText(`Generated ${data.images.length} image(s) with ${selectedModel}.`);

        // Fire-and-forget save to Firebase Storage under generated/
        const timestamp = Date.now();
        data.images.forEach((img, idx) => {
          if (typeof img !== "string" || !img.startsWith("data:")) return;
          const path = `generated/${timestamp}-${idx}.png`;
          const storageRef = ref(storage, path);
          uploadString(storageRef, img, "data_url").catch((err) => {
            console.error("Failed to save generated image to Firebase:", err);
          });
        });
      } else {
        setResultText("No image returned from the server.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl border border-white/10 bg-black/70 p-6 sm:p-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-light tracking-tight">
              Generate Tattoo Design
            </h1>
            <p className="text-xs sm:text-sm text-white/60">
              Choose a model and describe the tattoo you want. This page is
              wired up for different AI models to help you explore tattoo
              ideas.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Link
              href="/"
              className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-1 rounded-full"
            >
              ← Back to gallery
            </Link>
            <Link
              href="/history"
              className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-1 rounded-full"
            >
              History
            </Link>
          </div>
        </div>

        <form onSubmit={handleGenerate} className="space-y-6">
          {/* Placement selection */}
          <div className="space-y-2">
            <label className="block text-xs text-white/60 uppercase tracking-[0.16em]">
              Placement (optional)
            </label>
          <div className="flex flex-wrap gap-2">
            {PLACEMENTS.map((place) => {
              const active = selectedPlacements.includes(place);
              return (
                <button
                  key={place}
                  type="button"
                  onClick={() =>
                    setSelectedPlacements((prev) =>
                      prev.includes(place)
                        ? prev.filter((p) => p !== place)
                        : [...prev, place]
                    )
                  }
                  className={`px-3 py-1.5 text-xs border transition-colors capitalize ${
                    active
                      ? "bg-white text-black border-white"
                      : "bg-transparent text-white/70 border-white/30 hover:bg-white/10"
                  }`}
                >
                  {place}
                </button>
              );
            })}
          </div>
          </div>

          {/* Category + style selection */}
          <div className="space-y-2">
            <label className="block text-xs text-white/60 uppercase tracking-[0.16em]">
              Style (optional)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={selectedCategoryId ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  const id = val ? Number(val) : null;
                  setSelectedCategoryId(id);
                  setCurrentStyleId("");
                }}
                className="w-full bg-black border border-white/30 text-xs sm:text-sm px-3 py-2 outline-none focus:border-white"
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
                  className="w-full bg-black border border-white/30 text-xs sm:text-sm px-3 py-2 outline-none focus:border-white"
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
                  className="px-2 py-1 text-xs border border-white/40 rounded-full text-white hover:bg-white hover:text-black disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Add style"
                >
                  +
                </button>
              </div>
            </div>

            {selectedStyleIds.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
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
                      className="px-2 py-1 text-[11px] border border-white/40 rounded-full text-white/80 hover:bg-white hover:text-black flex items-center gap-1"
                    >
                      <span>{style.name}</span>
                      <span>×</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Model picker */}
          <div className="space-y-2">
            <label className="block text-xs text-white/60 uppercase tracking-[0.16em]">
              Model
            </label>
            <div className="flex flex-wrap gap-2">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedModel(m.id)}
                  className={`px-3 py-1.5 text-xs sm:text-sm border transition-colors ${
                    selectedModel === m.id
                      ? "bg-white text-black border-white"
                      : "bg-transparent text-white/70 border-white/30 hover:border-white/60"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reference image upload (NanoBanana / Gemini only) */}
          {(selectedModel === "nanobanana" || selectedModel === "gemini25") && (
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="block text-xs text-white/60 uppercase tracking-[0.16em]">
                  Reference Image (optional)
                </label>
                
                {/* Image type selector */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReferenceImageType("placement");
                    }}
                    className={`px-3 py-1.5 text-xs border transition-colors ${
                      referenceImageType === "placement"
                        ? "bg-white text-black border-white"
                        : "bg-transparent text-white/70 border-white/30 hover:bg-white/10"
                    }`}
                  >
                    Placement Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReferenceImageType("subject");
                    }}
                    className={`px-3 py-1.5 text-xs border transition-colors ${
                      referenceImageType === "subject"
                        ? "bg-white text-black border-white"
                        : "bg-transparent text-white/70 border-white/30 hover:bg-white/10"
                    }`}
                  >
                    Subject Photo
                  </button>
                </div>
                
                <p className="text-[11px] text-white/50">
                  {referenceImageType === "placement" 
                    ? "Placement: Body photo showing where the tattoo should be placed (e.g., arm, back, chest)"
                    : "Subject: Photo of the subject matter for the tattoo design (e.g., animal, flower, symbol)"}
                </p>
              </div>
              
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePortraitChange}
                className="block w-full text-xs text-white/70 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-white file:text-black hover:file:bg-zinc-200"
              />
              {referenceImages.length > 0 && (
                <div className="mt-2 space-y-2">
                  <p className="text-[11px] text-white/50">
                    {referenceImages.length} image{referenceImages.length > 1 ? "s" : ""} total
                    {referenceImages.filter(img => img.type === referenceImageType).length > 0 && (
                      <span className="ml-1">
                        ({referenceImages.filter(img => img.type === referenceImageType).length} {referenceImageType})
                      </span>
                    )}
                  </p>
                  <div className="space-y-2">
                    {/* Show images for current type */}
                    {referenceImages.filter(img => img.type === referenceImageType).length > 0 && (
                      <div>
                        <p className="text-[10px] text-white/40 mb-1 uppercase">
                          {referenceImageType === "placement" ? "Placement Photos" : "Subject Photos"}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {referenceImages
                            .map((img, originalIndex) => ({ img, originalIndex }))
                            .filter(({ img }) => img.type === referenceImageType)
                            .map(({ img, originalIndex }) => (
                              <div
                                key={originalIndex}
                                className="relative group flex items-center gap-2 border border-white/30 bg-black/60 p-2"
                              >
                                <div className="w-12 h-12 border border-white/30 bg-black/60 overflow-hidden flex items-center justify-center">
                                  <img
                                    src={`data:${img.mimeType || "image/png"};base64,${img.data}`}
                                    alt={`Reference ${originalIndex + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <p className="text-[11px] text-white/50 truncate max-w-[120px]">
                                  {img.fileName}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => removeReferenceImage(originalIndex)}
                                  className="ml-1 text-white/70 hover:text-white text-xs px-1"
                                  aria-label="Remove image"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                    {/* Show images for other type (if any) */}
                    {referenceImages.filter(img => img.type !== referenceImageType).length > 0 && (
                      <div>
                        <p className="text-[10px] text-white/30 mb-1 uppercase">
                          {referenceImageType === "placement" ? "Subject Photos" : "Placement Photos"} (switch type to see)
                        </p>
                        <p className="text-[10px] text-white/40">
                          {referenceImages.filter(img => img.type !== referenceImageType).length} image{referenceImages.filter(img => img.type !== referenceImageType).length > 1 ? "s" : ""} of other type
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Prompt */}
          <div className="space-y-2">
            <label className="block text-xs text-white/60 uppercase tracking-[0.16em]">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder="Example: Fine line mandala forearm tattoo, symmetrical, black ink, delicate details, negative space, mystical but minimal."
              className="w-full px-3 py-2 text-sm bg-black border border-white/20 text-white outline-none focus:border-white resize-none"
            />
            <p className="text-[11px] text-white/40">
              Tip: include style (e.g. mandala, color realism), placement
              (forearm, ribs, back), mood (delicate, bold, mystical), and any
              symbols you want.
            </p>
          </div>

          <button
            type="submit"
            disabled={isGenerating || !prompt.trim()}
            className="w-full sm:w-auto px-5 py-2 text-sm font-medium text-black bg-white border border-white/20 disabled:bg-white/30 disabled:text-black/40 disabled:cursor-not-allowed"
          >
            {isGenerating ? "Generating..." : "Generate design"}
          </button>
        </form>

        {images && images.length > 0 && (
          <div className="mt-6 space-y-2">
            <p className="text-xs text-white/60">
              Preview ({images.length} image{images.length > 1 ? "s" : ""})
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="border border-white/15 bg-black/60 p-2 flex items-center justify-center"
                >
                  <img
                    src={img}
                    alt={`Generated tattoo design ${idx + 1}`}
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
      </div>
    </div>
  );
}

