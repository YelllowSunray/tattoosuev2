import { NextRequest, NextResponse } from "next/server";
import { GoogleAuth, type JWTInput } from "google-auth-library";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { parseServiceAccountJson } from "@/lib/service-account-parser";

const VERTEX_LOCATION = process.env.VERTEX_LOCATION || "us-central1";
const IMAGE_MODEL = "imagen-4.0-generate-001";

function parseServiceAccount(): JWTInput {
  return parseServiceAccountJson(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
}

function getProjectId(): string {
  const parsed = parseServiceAccount();
  const projectId =
    (parsed as { project_id?: string }).project_id ||
    process.env.VERTEX_PROJECT_ID;

  if (!projectId) {
    throw new Error("Missing project id (project_id in service account JSON).");
  }
  return projectId;
}

async function getAccessToken(): Promise<string> {
  const auth = new GoogleAuth({
    credentials: parseServiceAccount(),
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });

  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token =
    typeof tokenResponse === "string" ? tokenResponse : tokenResponse?.token;

  if (!token) {
    throw new Error("Failed to acquire Google access token.");
  }
  return token;
}

function baseUrl(projectId: string) {
  return `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${VERTEX_LOCATION}`;
}

async function generateImagen4Images(
  prompt: string,
  accessToken: string,
  projectId: string
): Promise<string[]> {
  const response = await fetch(
    `${baseUrl(projectId)}/publishers/google/models/${IMAGE_MODEL}:predict`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instances: [
          {
            prompt,
          },
        ],
        parameters: {
          // Ask Vertex Imagen 4 to generate up to 4 images
          sampleCount: 4,
          outputMimeType: "image/png",
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Imagen 4 generation failed: ${errorText}`);
  }

  const data = await response.json();
  const predictions = Array.isArray(data?.predictions) ? data.predictions : [];

  const images: string[] = predictions
    .map(
      (prediction: { bytesBase64Encoded?: string; imageBytes?: string }) =>
        prediction?.bytesBase64Encoded || prediction?.imageBytes || ""
    )
    .filter((b64: string) => !!b64)
    .map((b64: string) => `data:image/png;base64,${b64}`);

  return images;
}

async function generateGeminiImages(prompt: string): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to your .env.local to use Gemini image generation."
    );
  }

  // Model name for image generation via Google AI Studio (adjust via env if needed)
  const modelId =
    (process.env.GEMINI_IMAGE_MODEL || "").trim() || "imagegeneration";

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelId });

  const response = await model.generateContent(prompt);

  const parts = response.response?.candidates?.[0]?.content?.parts || [];

  const images = parts
    .filter((p: any) => p.inlineData && p.inlineData.data)
    .map(
      (p: any) =>
        `data:${p.inlineData.mimeType || "image/png"};base64,${p.inlineData.data}`
    );

  if (!images.length) {
    throw new Error("Gemini did not return any image data.");
  }

  return images;
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, model } = await req.json();

    const promptRaw = String(prompt || "").trim();

    if (!promptRaw) {
      return NextResponse.json(
        { error: "Provide a prompt to generate Imagen 4 images." },
        { status: 400 }
      );
    }

    let images: string[] = [];

    // Imagen 4 via Vertex AI
    if (!model || model === "imagen4") {
      const projectId = getProjectId();
      const accessToken = await getAccessToken();

      images = await generateImagen4Images(promptRaw, accessToken, projectId);
    }
    // Gemini / NanoBanana image generation via Generative Language API
    else if (model === "nanobanana" || model === "gemini25") {
      images = await generateGeminiImages(promptRaw);
    } else {
      return NextResponse.json(
        { error: `Unknown model '${model}'.` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      prompt: promptRaw,
      images,
    });
  } catch (error) {
    console.error("Imagen 4 generation failed:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // In development, provide more detailed error messages
    const isDevelopment = process.env.NODE_ENV === "development";
    
    return NextResponse.json(
      {
        error: isDevelopment 
          ? errorMessage 
          : "Unable to generate images with Imagen 4. Check server logs for details.",
      },
      { status: 500 }
    );
  }
}

