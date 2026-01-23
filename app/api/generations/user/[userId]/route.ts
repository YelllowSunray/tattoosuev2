import { NextRequest, NextResponse } from "next/server";
import { getGenerationsByUser } from "@/lib/crm-utils";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const authenticatedUserId = await requireAuth(req);
    const { userId } = await params;
    
    // Users can only access their own generations
    if (authenticatedUserId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized - you can only access your own generations" },
        { status: 403 }
      );
    }
    
    const generations = await getGenerationsByUser(userId);

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
    console.error("Error fetching user generations:", error);
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          details: "Authentication required",
        },
        { status: 401 }
      );
    }
    return NextResponse.json(
      {
        error: "Failed to fetch generations",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
