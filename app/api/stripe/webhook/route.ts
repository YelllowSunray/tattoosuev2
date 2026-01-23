import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { addCredits } from "@/lib/credit-utils";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Disable body parsing for webhook route - critical for Stripe signature verification
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    console.log("🔔 Webhook received");
    
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
      console.error("❌ Stripe configuration missing");
      return NextResponse.json(
        { error: "Stripe configuration missing" },
        { status: 500 }
      );
    }
    
    // Get raw body as text - critical for signature verification
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    
    if (!signature) {
      console.error("❌ Missing stripe-signature header");
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }
    
    let event: Stripe.Event;
    
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log(`✅ Webhook verified: ${event.type} (ID: ${event.id})`);
    } catch (err: any) {
      console.error("❌ Webhook signature verification failed:", err.message);
      console.error("Webhook secret configured:", !!webhookSecret);
      console.error("Body length:", body.length);
      console.error("Signature:", signature.substring(0, 20) + "...");
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }
    
    // Handle the event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      console.log(`💰 Checkout session completed: ${session.id}`);
      console.log(`📦 Session metadata:`, JSON.stringify(session.metadata, null, 2));
      
      const userId = session.metadata?.userId;
      const credits = parseInt(session.metadata?.credits || "0");
      
      if (!userId) {
        console.error("❌ No userId in session metadata");
        return NextResponse.json(
          { error: "Missing userId in session metadata" },
          { status: 400 }
        );
      }
      
      if (!credits || credits <= 0) {
        console.error(`❌ Invalid credits value: ${credits}`);
        return NextResponse.json(
          { error: `Invalid credits value: ${credits}` },
          { status: 400 }
        );
      }
      
      try {
        await addCredits(userId, credits, "stripe_purchase");
        console.log(`✅ Successfully added ${credits} credits to user ${userId}`);
        return NextResponse.json({ 
          received: true,
          message: `Added ${credits} credits to user ${userId}` 
        });
      } catch (error: any) {
        console.error("❌ Error adding credits:", error);
        console.error("Error stack:", error.stack);
        return NextResponse.json(
          { error: `Failed to add credits: ${error.message}` },
          { status: 500 }
        );
      }
    } else {
      // Return success for unhandled events (Stripe expects 200 response)
      console.log(`ℹ️ Unhandled event type: ${event.type} (ID: ${event.id})`);
      return NextResponse.json({ received: true, eventType: event.type });
    }
  } catch (error: any) {
    console.error("❌ Unexpected error in webhook handler:", error);
    console.error("Error stack:", error.stack);
    return NextResponse.json(
      { error: `Internal server error: ${error.message}` },
      { status: 500 }
    );
  }
}
