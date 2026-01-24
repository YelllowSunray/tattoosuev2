import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { addCredits } from "@/lib/credit-utils";
import { getAdminFirestore } from "@/lib/firebase-admin";

/**
 * Manual endpoint to add credits (for fixing failed webhooks)
 * Only accessible by authenticated users for their own account
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth(req);
    const body = await req.json();
    const { targetUserId, credits, reason } = body;

    // For now, only allow users to add credits to their own account
    // You can modify this to allow admins to add credits to any user
    if (targetUserId && targetUserId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized - you can only add credits to your own account" },
        { status: 403 }
      );
    }

    const targetUser = targetUserId || userId;
    const creditsToAdd = parseInt(credits?.toString() || "0");

    if (!creditsToAdd || creditsToAdd <= 0) {
      return NextResponse.json(
        { error: "Invalid credits amount" },
        { status: 400 }
      );
    }

    await addCredits(targetUser, creditsToAdd, reason || "manual_addition");

    console.log(`✅ Manually added ${creditsToAdd} credits to user ${targetUser}`);

    return NextResponse.json({
      success: true,
      message: `Added ${creditsToAdd} credits to user ${targetUser}`,
    });
  } catch (error: any) {
    console.error("Error manually adding credits:", error);
    return NextResponse.json(
      { error: error.message || "Failed to add credits" },
      { status: 500 }
    );
  }
}
