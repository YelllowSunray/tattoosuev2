import { NextRequest, NextResponse } from "next/server";
import { createCustomer, listCustomers } from "@/lib/crm-utils";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth(req);
    const customers = await listCustomers(userId);
    return NextResponse.json({
      success: true,
      customers: customers.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        notes: c.notes,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        createdBy: c.createdBy,
      })),
    });
  } catch (error) {
    console.error("Error fetching customers:", error);
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          details: "Authentication required",
        },
        { status: 401 }
      );
    }
    return NextResponse.json(
      {
        error: "Failed to fetch customers",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth(req);
    const body = await req.json();
    const { name, email, phone, notes } = body;

    if (!name || !email || !phone) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          details: "name, email, and phone are required",
        },
        { status: 400 }
      );
    }

    const customerId = await createCustomer({
      name,
      email,
      phone,
      notes,
      createdBy: userId,
    });

    return NextResponse.json({
      success: true,
      customerId,
      message: "Customer created successfully",
    });
  } catch (error) {
    console.error("Error creating customer:", error);
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          details: "Authentication required",
        },
        { status: 401 }
      );
    }
    return NextResponse.json(
      {
        error: "Failed to create customer",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
