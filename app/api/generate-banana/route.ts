import { NextRequest, NextResponse } from "next/server";
import { GoogleAuth, type JWTInput } from "google-auth-library";

// Gemini / NanoBanana image model to use via Vertex / OAuth, NOT Imagen4.
// Example values (you must ensure the model exists and supports images):
//  - gemini-2.5-flash-image
//  - gemini-3-pro-image-preview
const BANANA_VERTEX_MODEL_ID =
  (process.env.BANANA_VERTEX_MODEL_ID || "").trim() || "gemini-2.5-flash-image";

function parseServiceAccount(): JWTInput {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!json) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_JSON env. Keep the service account key in .env.local."
    );
  }
  return JSON.parse(json) as JWTInput;
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

  // Call the API 4 times sequentially to get 4 images
  for (let i = 0; i < 4; i++) {
    const body = {
      contents: [
        {
          role: "user",
          parts: [
            // If a reference image is provided, send it as inlineData first
            ...(referenceImage
              ? [
                  {
                    inlineData: {
                      data: referenceImage.data,
                      mimeType: referenceImage.mimeType || "image/png",
                    },
                  },
                ]
              : []),
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
      throw new Error(
        `Gemini (NanoBanana) generation failed: ${res.status} ${res.statusText} – ${errorText}`
      );
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

    const images = await generateBananaImages(promptRaw, {
      data: referenceImage,
      mimeType: referenceImageMimeType,
    });

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

