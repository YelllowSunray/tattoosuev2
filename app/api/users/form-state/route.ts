import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

/**
 * GET - Get user's saved form state
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth(req);
    const db = getAdminFirestore();
    const userDoc = await db.collection("users").doc(userId).get();
    
    if (!userDoc.exists) {
      return NextResponse.json({
        success: true,
        formState: null,
      });
    }
    
    const data = userDoc.data();
    const formState = data?.formState || null;
    
    return NextResponse.json({
      success: true,
      formState: formState,
    });
  } catch (error: any) {
    console.error("Error getting form state:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get form state" },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update user's saved form state
 */
export async function PUT(req: NextRequest) {
  try {
    const userId = await requireAuth(req);
    const body = await req.json();
    const { formState } = body;
    
    if (formState === undefined || formState === null) {
      return NextResponse.json(
        { error: "formState is required" },
        { status: 400 }
      );
    }
    
    const db = getAdminFirestore();
    const userRef = db.collection("users").doc(userId);
    
    // Check if user document exists
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      // Create user document with form state
      await userRef.set({
        formState: formState,
        updatedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
      });
    } else {
      // Update existing user document
      await userRef.update({
        formState: formState,
        updatedAt: Timestamp.now(),
      });
    }
    
    return NextResponse.json({
      success: true,
      formState: formState,
    });
  } catch (error: any) {
    console.error("Error updating form state:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update form state" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Clear user's saved form state
 */
export async function DELETE(req: NextRequest) {
  try {
    const userId = await requireAuth(req);
    const db = getAdminFirestore();
    const userRef = db.collection("users").doc(userId);
    
    await userRef.update({
      formState: null,
      updatedAt: Timestamp.now(),
    });
    
    return NextResponse.json({
      success: true,
      message: "Form state cleared",
    });
  } catch (error: any) {
    console.error("Error clearing form state:", error);
    return NextResponse.json(
      { error: error.message || "Failed to clear form state" },
      { status: 500 }
    );
  }
}
