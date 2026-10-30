import { NextRequest, NextResponse } from "next/server";
import { getBodyPartsList } from "@/lib/firebase-utils";
import {
  catalogDeniedResponse,
  hasTattooCatalogAccess,
} from "@/lib/catalog-access";

export async function GET(req: NextRequest) {
  if (!hasTattooCatalogAccess(req)) {
    return catalogDeniedResponse();
  }

  try {
    const bodyParts = await getBodyPartsList();
    
    return NextResponse.json({
      success: true,
      bodyParts,
    });
  } catch (error) {
    console.error("Error fetching body parts:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch body parts",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
