import { NextRequest, NextResponse } from "next/server";
import { GoogleAuth, type JWTInput } from "google-auth-library";
import { parseServiceAccountJson } from "@/lib/service-account-parser";

// Gemini / NanoBanana image model to use via Vertex / OAuth, NOT Imagen4.
// Example values (you must ensure the model exists and supports images):
//  - gemini-2.5-flash-image
//  - gemini-3-pro-image-preview
const BANANA_VERTEX_MODEL_ID =
  (process.env.BANANA_VERTEX_MODEL_ID || "").trim() || "gemini-2.5-flash-image";

function parseServiceAccount(): JWTInput {
  return parseServiceAccountJson(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
}

async function getAccessToken(): Promise<string> {
  const auth = new GoogleAuth({
    credentials: parseServiceAccount(),
    // Include both Cloud Platform and Generative Language scopes
    scopes: [
      "https://www.googleapis.com/auth/cloud-platform",
      "https://www.googleapis.com/auth/generative-language",
    ],
  });

  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token =
    typeof tokenResponse === "string" ? tokenResponse : tokenResponse?.token;

  if (!token) {
    throw new Error("Failed to acquire Google access token for Gemini.");
  }
  return token;
}

async function generateBananaImages(
  prompt: string,
  referenceImage?: { data: string; mimeType?: string }
): Promise<string[]> {
  const accessToken = await getAccessToken();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${BANANA_VERTEX_MODEL_ID}:generateContent`;

  const images: string[] = [];

  // Note: Most Gemini image generation models (like gemini-2.5-flash-image) 
  // do NOT support input images - they only generate images from text prompts.
  // If a reference image is provided, we'll log a warning and skip it.
  if (referenceImage) {
    console.warn(`⚠️  Reference image provided, but ${BANANA_VERTEX_MODEL_ID} does not support input images. Generating from text prompt only.`);
  }

  // Call the API 4 times sequentially to get 4 images
  for (let i = 0; i < 4; i++) {
    // Build the request body - image generation models only accept text prompts
    const body = {
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
          ],
        },
      ],
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      let errorMessage = `Gemini (NanoBanana) generation failed: ${res.status} ${res.statusText} – ${errorText}`;
      
      // Provide helpful error message for image processing errors
      if (res.status === 400 && errorText.includes("Unable to process input image")) {
        errorMessage += "\n\n💡 Tip: This model may not support input/reference images. Try generating without a reference image.";
      }
      
      throw new Error(errorMessage);
    }

    const data = await res.json();
    const candidates = Array.isArray(data?.candidates) ? data.candidates : [];

    let added = false;
    for (const c of candidates) {
      const parts = c?.content?.parts || [];
      for (const p of parts) {
        if (p?.inlineData?.data) {
          const mime = p.inlineData.mimeType || "image/png";
          images.push(`data:${mime};base64,${p.inlineData.data}`);
          added = true;
          break;
        }
      }
      if (added) break;
    }
  }

  if (!images.length) {
    throw new Error("Gemini (NanoBanana) did not return any image data.");
  }

  return images;
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, referenceImage, referenceImageMimeType } =
      await req.json();

    const promptRaw = String(prompt || "").trim();
    if (!promptRaw) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Validate and prepare reference image if provided
    let referenceImageData: { data: string; mimeType: string } | undefined;
    if (referenceImage) {
      // Clean the base64 data - remove data URL prefix if present
      let cleanBase64 = String(referenceImage).trim();
      if (cleanBase64.includes(",")) {
        cleanBase64 = cleanBase64.split(",")[1];
      }
      
      // Validate base64 format
      if (!cleanBase64 || cleanBase64.length === 0) {
        console.warn("⚠️  Reference image provided but base64 data is empty, ignoring");
      } else {
        // Validate base64 characters
        const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
        if (!base64Regex.test(cleanBase64)) {
          console.warn("⚠️  Reference image base64 data appears invalid, ignoring");
        } else {
          // Check image size (Gemini has limits - typically 20MB, but base64 is ~33% larger)
          const sizeInBytes = (cleanBase64.length * 3) / 4;
          const maxSize = 15 * 1024 * 1024; // 15MB to be safe
          if (sizeInBytes > maxSize) {
            return NextResponse.json(
              { 
                error: `Reference image is too large (${Math.round(sizeInBytes / 1024 / 1024)}MB). Maximum size is 15MB.` 
              },
              { status: 400 }
            );
          }
          
          referenceImageData = {
            data: cleanBase64,
            mimeType: referenceImageMimeType || "image/png",
          };
        }
      }
    }

    const images = await generateBananaImages(promptRaw, referenceImageData);

    return NextResponse.json({
      prompt: promptRaw,
      images,
      model: BANANA_VERTEX_MODEL_ID,
    });
  } catch (err: any) {
    console.error("Error in /api/generate-banana:", err);
    return NextResponse.json(
      {
        error:
          err?.message ||
          "Failed to generate image with NanoBanana / Gemini image model.",
      },
      { status: 500 }
    );
  }
}

