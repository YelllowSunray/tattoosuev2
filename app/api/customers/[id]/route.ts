import { NextRequest, NextResponse } from "next/server";
import { getCustomer, updateCustomer } from "@/lib/crm-utils";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth(req);
    const { id } = await params;
    const customer = await getCustomer(id, userId);

    if (!customer) {
      return NextResponse.json(
        {
          error: "Customer not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        notes: customer.notes,
        createdAt: customer.createdAt.toISOString(),
        updatedAt: customer.updatedAt.toISOString(),
        createdBy: customer.createdBy,
      },
    });
  } catch (error) {
    console.error("Error fetching customer:", error);
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
        error: "Failed to fetch customer",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth(req);
    const { id } = await params;
    const body = await req.json();
    const { name, email, phone, notes } = body;

    await updateCustomer(id, userId, {
      name,
      email,
      phone,
      notes,
    });

    return NextResponse.json({
      success: true,
      message: "Customer updated successfully",
    });
  } catch (error) {
    console.error("Error updating customer:", error);
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          details: "Authentication required",
        },
        { status: 401 }
      );
    }
    if (error instanceof Error && (error.message.includes("not found") || error.message.includes("access denied"))) {
      return NextResponse.json(
        {
          error: "Customer not found or access denied",
        },
        { status: 404 }
      );
    }
    return NextResponse.json(
      {
        error: "Failed to update customer",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
