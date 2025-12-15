"use client";

import { useState } from "react";

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

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), model: selectedModel }),
      });

      const data = await res.json();

      if (!res.ok) {
        setResultText(data.error || "Failed to generate image.");
        return;
      }

      if (Array.isArray(data.images) && data.images.length > 0) {
        setImages(data.images);
        setResultText(`Generated ${data.images.length} image(s) with ${selectedModel}.`);
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
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-light tracking-tight">
            Generate Tattoo Design
          </h1>
          <p className="text-xs sm:text-sm text-white/60">
            Choose a model and describe the tattoo you want. This page is wired
            up for UI only – you can connect Imagen 4, NanoBanana, or Gemini
            2.5 APIs in the generate handler.
          </p>
        </div>

        <form onSubmit={handleGenerate} className="space-y-5">
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

