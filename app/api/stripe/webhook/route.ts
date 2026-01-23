import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { addCredits } from "@/lib/credit-utils";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Stripe configuration missing" },
      { status: 500 }
    );
  }
  
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }
  
  // Handle the event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    
    const userId = session.metadata?.userId;
    const credits = parseInt(session.metadata?.credits || "0");
    
    if (userId && credits > 0) {
      try {
        await addCredits(userId, credits, "stripe_purchase");
        console.log(`✅ Added ${credits} credits to user ${userId}`);
      } catch (error) {
        console.error("Error adding credits:", error);
        return NextResponse.json(
          { error: "Failed to add credits" },
          { status: 500 }
        );
      }
    }
  }
  
  return NextResponse.json({ received: true });
}
