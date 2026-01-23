import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

/**
 * GET - Get user's favorite style IDs
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth(req);
    const db = getAdminFirestore();
    const userDoc = await db.collection("users").doc(userId).get();
    
    if (!userDoc.exists) {
      return NextResponse.json({
        success: true,
        favoriteStyleIds: [],
      });
    }
    
    const data = userDoc.data();
    const favoriteStyleIds = data?.favoriteStyleIds || [];
    
    return NextResponse.json({
      success: true,
      favoriteStyleIds: Array.isArray(favoriteStyleIds) ? favoriteStyleIds : [],
    });
  } catch (error: any) {
    console.error("Error getting favorite styles:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get favorite styles" },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update user's favorite style IDs
 */
export async function PUT(req: NextRequest) {
  try {
    const userId = await requireAuth(req);
    const body = await req.json();
    const { favoriteStyleIds } = body;
    
    if (favoriteStyleIds === undefined || favoriteStyleIds === null) {
      return NextResponse.json(
        { error: "favoriteStyleIds is required" },
        { status: 400 }
      );
    }
    
    if (!Array.isArray(favoriteStyleIds)) {
      return NextResponse.json(
        { error: "favoriteStyleIds must be an array" },
        { status: 400 }
      );
    }
    
    // Validate that all items are numbers
    if (favoriteStyleIds.length > 0 && !favoriteStyleIds.every((id) => typeof id === "number")) {
      return NextResponse.json(
        { error: "All favorite style IDs must be numbers" },
        { status: 400 }
      );
    }
    
    const db = getAdminFirestore();
    const userRef = db.collection("users").doc(userId);
    
    // Check if user document exists
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      // Create user document with favorite styles
      await userRef.set({
        favoriteStyleIds: favoriteStyleIds,
        updatedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
      });
    } else {
      // Update existing user document
      await userRef.update({
        favoriteStyleIds: favoriteStyleIds,
        updatedAt: Timestamp.now(),
      });
    }
    
    return NextResponse.json({
      success: true,
      favoriteStyleIds: favoriteStyleIds,
    });
  } catch (error: any) {
    console.error("Error updating favorite styles:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update favorite styles" },
      { status: 500 }
    );
  }
}
