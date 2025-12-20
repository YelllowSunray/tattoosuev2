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
  referenceImages?: Array<{ data: string; mimeType?: string; type?: string }>,
  referenceImageType?: string
): Promise<string[]> {
  const accessToken = await getAccessToken();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${BANANA_VERTEX_MODEL_ID}:generateContent`;

  const images: string[] = [];

  // Call the API 4 times sequentially to get 4 images
  for (let i = 0; i < 4; i++) {
    // Build the request body with optional reference images
    const parts: any[] = [];
    
    // If reference images are provided, include them (order may matter)
    if (referenceImages && referenceImages.length > 0) {
      // Use the passed referenceImageType, not the first image's type
      const imageType = referenceImageType || referenceImages[0].type || "placement";
      console.log(`📸 Sending ${referenceImages.length} reference image(s) of type: ${imageType}`);
      console.log(`📝 Prompt preview (first 200 chars): ${prompt.substring(0, 200)}`);
      
      // Order matters! For Vertex Studio format: subject images first (first pic), then placement (second pic)
      // Separate images by type to ensure correct order
      const subjectImgs = referenceImages.filter(img => img.type === "subject");
      const placementImgs = referenceImages.filter(img => img.type === "placement");
      
      // Send subject images first (first pic), then placement images (second pic)
      for (const refImg of [...subjectImgs, ...placementImgs]) {
        parts.push({
          inlineData: {
            data: refImg.data,
            mimeType: refImg.mimeType || "image/png",
          },
        });
      }
      // Then add the text prompt
      parts.push({ text: prompt });
    } else {
      // No reference images, just text prompt
      parts.push({ text: prompt });
    }
    
    console.log(`🎨 Generation ${i + 1}/4 - Prompt length: ${prompt.length} chars, Images: ${referenceImages?.length || 0}`);
    
    const body = {
      contents: [
        {
          role: "user",
          parts: parts,
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
    const { prompt, referenceImage, referenceImageMimeType, referenceImages, referenceImageType, selectedPlacements } =
      await req.json();

    let promptRaw = String(prompt || "").trim();
    if (!promptRaw) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Validate and prepare reference images if provided
    // Support both old format (single image) and new format (multiple images)
    const imagesToProcess = referenceImages || (referenceImage ? [{ data: referenceImage, mimeType: referenceImageMimeType || "image/png" }] : []);
    
    let referenceImageDataArray: Array<{ data: string; mimeType: string; type?: string }> = [];
    
    if (imagesToProcess.length > 0) {
      for (const img of imagesToProcess) {
        // Clean the base64 data - remove data URL prefix if present
        let cleanBase64 = String(img.data).trim();
        if (cleanBase64.includes(",")) {
          cleanBase64 = cleanBase64.split(",")[1];
        }
        
        // Validate base64 format
        if (!cleanBase64 || cleanBase64.length === 0) {
          console.warn("⚠️  Reference image provided but base64 data is empty, ignoring");
          continue;
        }
        
        // Validate base64 characters
        const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
        if (!base64Regex.test(cleanBase64)) {
          console.warn("⚠️  Reference image base64 data appears invalid, ignoring");
          continue;
        }
        
        // Check image size (Gemini has limits - typically 20MB, but base64 is ~33% larger)
        const sizeInBytes = (cleanBase64.length * 3) / 4;
        const maxSize = 15 * 1024 * 1024; // 15MB to be safe
        if (sizeInBytes > maxSize) {
          return NextResponse.json(
            { 
              error: `Reference image is too large (${Math.round(sizeInBytes / 1024 / 1024)}MB). Maximum size is 15MB per image.` 
            },
            { status: 400 }
          );
        }
        
        referenceImageDataArray.push({
          data: cleanBase64,
          mimeType: img.mimeType || "image/png",
          type: referenceImageType || "placement",
        });
      }
    }

    // Enhance prompt based on reference image type
    // Support both subject images (tattoo design) and placement images (body part)
    if (referenceImageDataArray.length > 0) {
      // Separate images by type
      const subjectImages = referenceImageDataArray.filter(img => img.type === "subject");
      const placementImages = referenceImageDataArray.filter(img => img.type === "placement");
      
      console.log(`🔍 Processing images - Subject: ${subjectImages.length}, Placement: ${placementImages.length}`);
      
       // Extract body part from selectedPlacements (user's selection: arm, leg, chest, etc.)
       let bodyPart = "";
       if (selectedPlacements && Array.isArray(selectedPlacements) && selectedPlacements.length > 0) {
         bodyPart = selectedPlacements[0].toLowerCase();
       }
       
       // If we have BOTH subject and placement images
       if (subjectImages.length > 0 && placementImages.length > 0) {
         console.log(`🎯 BOTH TYPES: Subject (first pic) = WHAT to tattoo, Placement (second pic) = WHERE to tattoo`);
         
         // Vertex Studio format: "Create an arm tattoo of the first pic, on the second pic"
         // First pic = subject (WHAT to tattoo), Second pic = placement (WHERE - body part)
         if (bodyPart) {
           promptRaw = `Create a ${bodyPart} tattoo of the first pic, on the second pic: ${promptRaw}`;
         } else {
           promptRaw = `Create a tattoo of the first pic, on the second pic: ${promptRaw}`;
         }
         
         // Update the array to send subject images first (WHAT), then placement images (WHERE)
         referenceImageDataArray = [...subjectImages, ...placementImages];
         
      } else if (placementImages.length > 0) {
        // Only placement images - WHERE the tattoo goes (body part photo)
        console.log(`📍 PLACEMENT ONLY: The placement image IS the body part where the tattoo should go`);
        
        // The placement image IS the body part photo - put the tattoo ON that image
        // Body part selector (arm, leg, chest, etc.) determines which body part
        if (bodyPart) {
          promptRaw = `Create a ${bodyPart} tattoo on my body: ${promptRaw}`;
        } else {
          promptRaw = `Create a tattoo on my body: ${promptRaw}`;
        }
         
       } else if (subjectImages.length > 0) {
         // Only subject images - WHAT to tattoo (the design/content)
         console.log(`🎨 SUBJECT ONLY: The image IS what should be tattooed`);
         
         // The subject image IS what should be tattooed - create a tattoo design based on it
         promptRaw = `Create a tattoo design based on this: ${promptRaw}`;
      }
    }

    const images = await generateBananaImages(promptRaw, referenceImageDataArray, referenceImageType);

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

