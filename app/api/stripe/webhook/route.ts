import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { addCredits } from "@/lib/credit-utils";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

// Get webhook secret and trim any whitespace (common issue when copying from Stripe)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() || "";

// Disable body parsing for webhook route - critical for Stripe signature verification
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Test endpoint to verify route is accessible
export async function GET() {
  return NextResponse.json({ 
    message: "Stripe webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    const url = req.url;
    const host = req.headers.get("host");
    console.log("🔔 Webhook received at", new Date().toISOString());
    console.log("🌐 Request URL:", url);
    console.log("🌐 Host header:", host);
    
    if (!process.env.STRIPE_SECRET_KEY || !webhookSecret) {
      console.error("❌ Stripe configuration missing");
      console.error("STRIPE_SECRET_KEY exists:", !!process.env.STRIPE_SECRET_KEY);
      console.error("STRIPE_WEBHOOK_SECRET exists:", !!webhookSecret);
      console.error("STRIPE_WEBHOOK_SECRET length:", webhookSecret.length);
      return NextResponse.json(
        { error: "Stripe configuration missing" },
        { status: 500 }
      );
    }
    
    // Get raw body as text - critical for signature verification
    // In Next.js App Router, req.text() should give us the raw body
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    
    console.log("📦 Body length:", body.length);
    console.log("📦 Body preview (first 100 chars):", body.substring(0, 100));
    console.log("📦 Signature present:", !!signature);
    console.log("📦 Webhook secret length:", webhookSecret.length);
    console.log("📦 Webhook secret starts with:", webhookSecret.substring(0, 5));
    
    if (!signature) {
      console.error("❌ Missing stripe-signature header");
      const headers: Record<string, string> = {};
      req.headers.forEach((value, key) => {
        headers[key] = value;
      });
      console.error("Available headers:", Object.keys(headers));
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }
    
    // Log signature for debugging (first and last few chars only for security)
    console.log("📦 Signature preview:", signature.substring(0, 20) + "..." + signature.substring(signature.length - 10));
    
    let event: Stripe.Event;
    
    try {
      // Verify the webhook signature
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log(`✅ Webhook verified: ${event.type} (ID: ${event.id})`);
    } catch (err: any) {
      console.error("❌ Webhook signature verification failed:", err.message);
      console.error("Error type:", err.constructor.name);
      console.error("Webhook secret configured:", !!webhookSecret);
      console.error("Webhook secret length:", webhookSecret.length);
      console.error("Body length:", body.length);
      console.error("Body is empty:", body.length === 0);
      console.error("Signature length:", signature.length);
      console.error("Signature preview:", signature.substring(0, 30) + "...");
      
      // Check if webhook secret format is correct
      if (!webhookSecret.startsWith("whsec_")) {
        console.error("⚠️ WARNING: Webhook secret should start with 'whsec_'");
      }
      
      return NextResponse.json(
        { 
          error: `Webhook signature verification failed: ${err.message}`,
          hint: "Check that STRIPE_WEBHOOK_SECRET matches the signing secret from Stripe Dashboard"
        },
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
        const duration = Date.now() - startTime;
        console.log(`✅ Successfully added ${credits} credits to user ${userId} (took ${duration}ms)`);
        return NextResponse.json({ 
          received: true,
          message: `Added ${credits} credits to user ${userId}`,
          duration: `${duration}ms`,
        }, { status: 200 });
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
      return NextResponse.json({ received: true, eventType: event.type }, { status: 200 });
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error("❌ Unexpected error in webhook handler:", error);
    console.error("Error stack:", error.stack);
    console.error("Error occurred after", duration, "ms");
    return NextResponse.json(
      { error: `Internal server error: ${error.message}` },
      { status: 500 }
    );
  }
}
