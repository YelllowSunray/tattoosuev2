import { NextRequest, NextResponse } from "next/server";
import { GoogleAuth, type JWTInput } from "google-auth-library";

const VERTEX_LOCATION = process.env.VERTEX_LOCATION || "us-central1";
const IMAGE_MODEL = "imagen-4.0-generate-001";

function parseServiceAccount(): JWTInput {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!json) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_JSON env. Keep the service account key in .env.local."
    );
  }
  return JSON.parse(json) as JWTInput;
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

    if (model && model !== "imagen4") {
      return NextResponse.json(
        { error: "Only Imagen 4 is wired up right now." },
        { status: 400 }
      );
    }

    const projectId = getProjectId();
    const accessToken = await getAccessToken();

    const images = await generateImagen4Images(
      promptRaw,
      accessToken,
      projectId
    );

    return NextResponse.json({
      prompt: promptRaw,
      images,
    });
  } catch (error) {
    console.error("Imagen 4 generation failed:", error);
    return NextResponse.json(
      {
        error:
          "Unable to generate images with Imagen 4. Check server logs for details.",
      },
      { status: 500 }
    );
  }
}

