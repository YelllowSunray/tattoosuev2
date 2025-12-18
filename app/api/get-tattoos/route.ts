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
      })),
    });
  } catch (error) {
    console.error("Error fetching tattoos:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch tattoos",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}






