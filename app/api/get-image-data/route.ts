import { NextRequest, NextResponse } from "next/server";
import { getAdminStorage } from "@/lib/firebase-admin";
import { requireAuth } from "@/lib/auth-helpers";

/**
 * API route to get image data from Firebase Storage as base64 data URL.
 * This is used to avoid CORS issues when fetching images client-side.
 */
export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const userId = await requireAuth(req);

    const body = await req.json();
    const { imagePath } = body;

    if (!imagePath || typeof imagePath !== "string") {
      return NextResponse.json(
        { error: "imagePath is required and must be a string" },
        { status: 400 }
      );
    }

    // Verify the image path belongs to the authenticated user
    // Path format: generated/{userId}/...
    if (!imagePath.startsWith(`generated/${userId}/`)) {
      return NextResponse.json(
        { error: "Unauthorized - you can only access your own images" },
        { status: 403 }
      );
    }

    // Get the file from Firebase Storage using Admin SDK (server-side, no CORS)
    const storage = getAdminStorage();
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'tattoosuev2.firebasestorage.app';
    const bucket = storage.bucket(bucketName);
    
    // Ensure the path doesn't have URL encoding issues
    const decodedPath = decodeURIComponent(imagePath);
    const file = bucket.file(decodedPath);

    console.log(`[get-image-data] Fetching file: ${decodedPath} from bucket: ${bucketName}`);

    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      console.error(`[get-image-data] File not found: ${decodedPath}`);
      return NextResponse.json(
        { error: "Image not found" },
        { status: 404 }
      );
    }

    // Download the file as a buffer
    console.log(`[get-image-data] Downloading file: ${decodedPath}`);
    const [buffer] = await file.download();
    console.log(`[get-image-data] Downloaded ${buffer.length} bytes`);

    // Determine MIME type from file extension
    let mimeType = "image/png"; // default
    if (imagePath.endsWith(".jpg") || imagePath.endsWith(".jpeg")) {
      mimeType = "image/jpeg";
    } else if (imagePath.endsWith(".png")) {
      mimeType = "image/png";
    } else if (imagePath.endsWith(".webp")) {
      mimeType = "image/webp";
    }

    // Convert buffer to base64 data URL
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return NextResponse.json({
      success: true,
      dataUrl,
      mimeType,
    });
  } catch (err: any) {
    console.error("Error getting image data:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to get image data" },
      { status: 500 }
    );
  }
}
