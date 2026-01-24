import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

/**
 * GET - Get user's mode preference
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth(req);
    const db = getAdminFirestore();
    const userDoc = await db.collection("users").doc(userId).get();
    
    if (!userDoc.exists) {
      return NextResponse.json({
        success: true,
        mode: "individual", // Default mode
      });
    }
    
    const data = userDoc.data();
    const mode = data?.mode || "individual";
    
    // Validate mode value
    if (mode !== "individual" && mode !== "parlor") {
      return NextResponse.json({
        success: true,
        mode: "individual",
      });
    }
    
    return NextResponse.json({
      success: true,
      mode: mode,
    });
  } catch (error: any) {
    console.error("Error getting user mode:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get user mode" },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update user's mode preference
 */
export async function PUT(req: NextRequest) {
  try {
    const userId = await requireAuth(req);
    const body = await req.json();
    const { mode } = body;
    
    if (mode === undefined || mode === null) {
      return NextResponse.json(
        { error: "mode is required" },
        { status: 400 }
      );
    }
    
    // Validate mode value
    if (mode !== "individual" && mode !== "parlor") {
      return NextResponse.json(
        { error: "mode must be 'individual' or 'parlor'" },
        { status: 400 }
      );
    }
    
    const db = getAdminFirestore();
    const userRef = db.collection("users").doc(userId);
    
    // Check if user document exists
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      // Create user document with mode
      await userRef.set({
        mode: mode,
        updatedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
      });
    } else {
      // Update existing user document
      await userRef.update({
        mode: mode,
        updatedAt: Timestamp.now(),
      });
    }
    
    return NextResponse.json({
      success: true,
      mode: mode,
    });
  } catch (error: any) {
    console.error("Error updating user mode:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update user mode" },
      { status: 500 }
    );
  }
}
