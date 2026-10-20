import { NextResponse, type NextRequest } from "next/server";
import { OrderManagementService } from "@/lib/services/order-management-service";
import { OrderService } from "@/lib/services/order-service";
import { getVerifiedUser } from "@/lib/auth-request";

const requireAdmin = async (req: NextRequest) => {
  const verified = await getVerifiedUser(req);
  if (!verified) return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  if (verified.user.role !== "admin") return NextResponse.json({ success: false, error: "Forbidden. Admin access required." }, { status: 403 });
  return null;
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const order = await OrderService.getOrderByNumber(id);
    if (!order) return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
    return NextResponse.json({ success: true, order });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load order";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!id || !body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Order ID and valid update payload are required." }, { status: 400 });
    }
    const order = await OrderManagementService.updateOrder(id, body);
    return NextResponse.json({ success: true, order, message: "Order updated successfully." });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update order";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ success: false, error: "Order ID is required." }, { status: 400 });
    await OrderManagementService.deleteOrder(id);
    return NextResponse.json({ success: true, message: "Order deleted successfully." });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to delete order";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
