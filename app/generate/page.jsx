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
  const [selectedStyleId, setSelectedStyleId] = useState(null);
  const [selectedPlacements, setSelectedPlacements] = useState([]);
  const [portraitFileName, setPortraitFileName] = useState("");
  const [portraitBase64, setPortraitBase64] = useState(null);

  const handlePortraitChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setPortraitBase64(null);
      setPortraitFileName("");
      return;
    }
    setPortraitFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === "string" && result.startsWith("data:")) {
        // Strip "data:mime;base64," prefix to send clean base64
        const base64 = result.split(",")[1];
        setPortraitBase64({
          data: base64,
          mimeType: file.type || "image/png",
        });
      } else {
        setPortraitBase64(null);
      }
    };
    reader.readAsDataURL(file);
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

      const category =
        typeof selectedCategoryId === "number"
          ? TATTOO_CATEGORIES.find((c) => c.id === selectedCategoryId)
          : null;
      const style =
        category && typeof selectedStyleId === "number"
          ? category.styles.find((s) => s.id === selectedStyleId)
          : null;

      if (style) {
        extraParts.push(`${style.name} tattoo style`);
      } else if (category) {
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

      // Only send portrait reference when using NanoBanana / Gemini models
      if (
        (selectedModel === "nanobanana" || selectedModel === "gemini25") &&
        portraitBase64
      ) {
        body.referenceImage = portraitBase64.data;
        body.referenceImageMimeType = portraitBase64.mimeType;
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
                  setSelectedCategoryId(val ? Number(val) : null);
                  setSelectedStyleId(null);
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

              <select
                value={selectedStyleId ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedStyleId(val ? Number(val) : null);
                }}
                className="w-full bg-black border border-white/30 text-xs sm:text-sm px-3 py-2 outline-none focus:border-white"
                disabled={!selectedCategoryId}
              >
                <option value="">
                  {selectedCategoryId
                    ? "All styles in category"
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
            </div>
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

          {/* Portrait reference upload (NanoBanana / Gemini only) */}
          {(selectedModel === "nanobanana" || selectedModel === "gemini25") && (
            <div className="space-y-2">
              <label className="block text-xs text-white/60 uppercase tracking-[0.16em]">
                Portrait reference (optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePortraitChange}
                className="block w-full text-xs text-white/70 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-white file:text-black hover:file:bg-zinc-200"
              />
              {portraitFileName && (
                <div className="flex items-center gap-3 mt-2">
                  {portraitBase64 && (
                    <div className="w-12 h-12 border border-white/30 bg-black/60 overflow-hidden flex items-center justify-center">
                      <img
                        src={`data:${portraitBase64.mimeType || "image/png"};base64,${portraitBase64.data}`}
                        alt="Portrait preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <p className="text-[11px] text-white/50 truncate">
                    {portraitFileName}
                  </p>
                </div>
              )}
              <p className="text-[11px] text-white/40">
                Upload a portrait photo to guide the design (NanoBanana /
                Gemini only). The AI will keep the likeness but apply the
                chosen style.
              </p>
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

