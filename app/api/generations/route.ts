import { NextRequest, NextResponse } from "next/server";
import { createGeneration, getAllGenerations } from "@/lib/crm-utils";

export async function GET(req: NextRequest) {
  try {
    const generations = await getAllGenerations();
    return NextResponse.json({
      success: true,
      generations: generations.map((g) => ({
        id: g.id,
        customerId: g.customerId,
        userId: g.userId,
        prompt: g.prompt,
        fullPrompt: g.fullPrompt,
        model: g.model,
        images: g.images,
        imageUrls: g.imageUrls,
        stencils: g.stencils,
        styleIds: g.styleIds,
        placements: g.placements,
        createdAt: g.createdAt.toISOString(),
        createdBy: g.createdBy,
      })),
    });
  } catch (error) {
    console.error("Error fetching generations:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch generations",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customerId,
      userId,
      prompt,
      fullPrompt,
      model,
      images,
      imageUrls,
      styleIds,
      placements,
      referenceImages,
    } = body;

    if (!customerId || !userId || !prompt || !fullPrompt || !model || !images) {
      const missingFields = [];
      if (!customerId) missingFields.push("customerId");
      if (!userId) missingFields.push("userId");
      if (!prompt) missingFields.push("prompt");
      if (!fullPrompt) missingFields.push("fullPrompt");
      if (!model) missingFields.push("model");
      if (!images) missingFields.push("images");
      
      console.error("Missing required fields:", missingFields);
      return NextResponse.json(
        {
          error: "Missing required fields",
          details: `Missing: ${missingFields.join(", ")}`,
          missingFields,
        },
        { status: 400 }
      );
    }

    // Check that images is a non-empty array
    // Note: We don't store imageUrls (base64 data) in Firestore due to size limits (~1MB per array)
    // Only store the Firebase Storage paths
    if (!Array.isArray(images) || images.length === 0) {
      console.error("Invalid image data:", {
        imagesIsArray: Array.isArray(images),
        imagesLength: Array.isArray(images) ? images.length : "N/A",
      });
      return NextResponse.json(
        {
          error: "Invalid image data",
          details: "images must be a non-empty array",
        },
        { status: 400 }
      );
    }

    // Only store the Firebase Storage paths, not the base64 data URLs (too large for Firestore)
    const generationId = await createGeneration({
      customerId,
      userId,
      prompt,
      fullPrompt,
      model,
      images, // Firebase Storage paths only
      imageUrls: [], // Empty array - we don't store base64 data in Firestore
      styleIds,
      placements,
      referenceImages,
      createdBy: userId,
    });

    return NextResponse.json({
      success: true,
      generationId,
      message: "Generation created successfully",
    });
  } catch (error) {
    console.error("Error creating generation:", error);
    return NextResponse.json(
      {
        error: "Failed to create generation",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
