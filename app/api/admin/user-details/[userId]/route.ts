import { NextRequest, NextResponse } from "next/server";
import { listCustomers, getGenerationsByCustomer } from "@/lib/crm-utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Get all customers for this user
    const customers = await listCustomers(userId);

    // For each customer, get their generations and convert image paths to URLs
    const customersWithGenerations = await Promise.all(
      customers.map(async (customer) => {
        // Get generations for this customer
        const generations = await getGenerationsByCustomer(customer.id, userId);

        // Return image paths - client will generate URLs using Firebase SDK (same as customer detail page)
        const generationsWithPaths = generations.map((gen) => ({
          ...gen,
          createdAt: gen.createdAt.toISOString(),
        }));

        return {
          ...customer,
          createdAt: customer.createdAt.toISOString(),
          updatedAt: customer.updatedAt.toISOString(),
          generations: generationsWithPaths,
          totalImages: generationsWithPaths.reduce(
            (sum, gen) => sum + (gen.images?.length || 0),
            0
          ),
        };
      })
    );

    return NextResponse.json({
      success: true,
      userId,
      customers: customersWithGenerations,
      totalCustomers: customersWithGenerations.length,
      totalGenerations: customersWithGenerations.reduce(
        (sum, c) => sum + c.generations.length,
        0
      ),
      totalImages: customersWithGenerations.reduce(
        (sum, c) => sum + c.totalImages,
        0
      ),
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch user details",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
