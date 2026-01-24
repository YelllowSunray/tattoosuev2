import { NextRequest, NextResponse } from "next/server";
import { getAllTattooImages } from "@/lib/firebase-utils";

export async function GET(req: NextRequest) {
  try {
    const tattoos = await getAllTattooImages();
    
    return NextResponse.json({
      success: true,
      tattoos: tattoos.map((t) => ({
        fileName: t.fileName,
        url: t.url,
        style: t.style,
        bodyPart: t.bodyPart,
        category: t.category ? {
          id: t.category.id,
          name: t.category.name,
        } : null,
        matchedStyle: t.matchedStyle ? {
          id: t.matchedStyle.id,
          name: t.matchedStyle.name,
        } : null,
      })),
    });
  } catch (error) {
    console.error("Error fetching tattoos:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch tattoos",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}







