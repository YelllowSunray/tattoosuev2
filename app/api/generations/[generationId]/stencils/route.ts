import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { requireAuth } from "@/lib/auth-helpers";

/**
 * PUT /api/generations/[generationId]/stencils
 * Update stencil paths for a generation
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ generationId: string }> }
) {
  try {
    const { generationId } = await params;
    const body = await req.json();
    const { stencils } = body;

    if (!stencils || !Array.isArray(stencils)) {
      return NextResponse.json(
        { error: "stencils must be an array" },
        { status: 400 }
      );
    }

    // Verify auth token
    const userId = await requireAuth(req);

    // Get the generation to verify ownership
    const db = getAdminFirestore();
    const generationRef = db.collection("generations").doc(generationId);
    const generationDoc = await generationRef.get();

    if (!generationDoc.exists) {
      return NextResponse.json(
        { error: "Generation not found" },
        { status: 404 }
      );
    }

    const generationData = generationDoc.data();
    if (generationData?.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized - you can only update your own generations" },
        { status: 403 }
      );
    }

    // Update stencils (allow null values in array for index correspondence)
    // Filter out nulls only if entire array is null, otherwise keep nulls for index matching
    const hasAnyStencils = stencils.some(s => s !== null);
    await generationRef.update({
      stencils: hasAnyStencils ? stencils : null,
    });

    return NextResponse.json({
      success: true,
      generationId,
      stencils,
    });
  } catch (err: any) {
    console.error("Error updating generation stencils:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to update stencils" },
      { status: 500 }
    );
  }
}