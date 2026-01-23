import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { getUserCreditsDoc } from "@/lib/credit-utils";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth(req);
    const creditsDoc = await getUserCreditsDoc(userId);
    
    if (!creditsDoc) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      credits: creditsDoc.credits,
      totalPurchased: creditsDoc.totalPurchased,
      totalSpent: creditsDoc.totalSpent,
    });
  } catch (error: any) {
    console.error("Error getting credits:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get credits" },
      { status: 500 }
    );
  }
}
