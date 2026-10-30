import { NextRequest, NextResponse } from "next/server";
import { getAllTattooImages, TattooImageFilters } from "@/lib/firebase-utils";
import {
  catalogDeniedResponse,
  hasTattooCatalogAccess,
} from "@/lib/catalog-access";

export async function GET(req: NextRequest) {
  if (!hasTattooCatalogAccess(req)) {
    return catalogDeniedResponse();
  }

  try {
    const { searchParams } = new URL(req.url);
    
    // Extract filter parameters from query string
    const filters: TattooImageFilters = {};
    
    const bodyPart = searchParams.get('bodyPart');
    if (bodyPart) {
      filters.bodyPart = bodyPart;
    }
    
    const categoryId = searchParams.get('categoryId');
    if (categoryId) {
      const parsed = parseInt(categoryId, 10);
      if (!isNaN(parsed)) {
        filters.categoryId = parsed;
      }
    }
    
    const styleId = searchParams.get('styleId');
    if (styleId) {
      const parsed = parseInt(styleId, 10);
      if (!isNaN(parsed)) {
        filters.styleId = parsed;
      }
    }
    
    const searchQuery = searchParams.get('search');
    if (searchQuery) {
      filters.searchQuery = searchQuery;
    }
    
    // Pass filters to getAllTattooImages (filters at filename level before fetching URLs)
    const tattoos = await getAllTattooImages('/', Object.keys(filters).length > 0 ? filters : undefined);
    
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

