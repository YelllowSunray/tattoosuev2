import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { requireAuth } from "@/lib/auth-helpers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

// Credit packages
const CREDIT_PACKAGES = [
  { credits: 10, price: 100 }, // €1.00 for 10 credits
  { credits: 100, price: 1000 }, // €10.00 for 100 credits
  { credits: 200, price: 2000 }, // €20.00 for 200 credits
  { credits: 500, price: 5000 }, // €50.00 for 500 credits
  { credits: 1000, price: 10000 }, // €100.00 for 1000 credits
];

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe secret key not configured" },
        { status: 500 }
      );
    }
    
    const userId = await requireAuth(req);
    const { packageId } = await req.json();
    
    const packageIndex = parseInt(packageId);
    if (packageIndex < 0 || packageIndex >= CREDIT_PACKAGES.length) {
      return NextResponse.json(
        { error: "Invalid package" },
        { status: 400 }
      );
    }
    
    const creditPackage = CREDIT_PACKAGES[packageIndex];
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `${creditPackage.credits} Credits`,
              description: `Purchase ${creditPackage.credits} credits for generating tattoo designs`,
            },
            unit_amount: creditPackage.price,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/credits?success=true&credits=${creditPackage.credits}`,
      cancel_url: `${baseUrl}/credits?canceled=true`,
      metadata: {
        userId,
        credits: creditPackage.credits.toString(),
      },
    });
    
    console.log(`💳 Created checkout session: ${session.id}`);
    console.log(`📦 Metadata: userId=${userId}, credits=${creditPackage.credits}`);
    console.log(`🔗 Session URL: ${session.url}`);
    
    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
