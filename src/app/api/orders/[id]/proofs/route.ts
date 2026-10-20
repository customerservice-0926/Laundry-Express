import { NextResponse, type NextRequest } from "next/server";
import { OrderManagementService } from "@/lib/services/order-management-service";
import { OrderService } from "@/lib/services/order-service";
import { getVerifiedUser } from "@/lib/auth-request";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const requireAdmin = async (req: NextRequest) => {
  const verified = await getVerifiedUser(req);
  if (!verified) return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  if (verified.user.role !== "admin") return NextResponse.json({ success: false, error: "Forbidden. Admin access required." }, { status: 403 });
  return null;
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!id || !body?.imageUrl) {
      return NextResponse.json({ success: false, error: "Order ID and imageUrl are required." }, { status: 400 });
    }
    const proofType = (body.proofType as "pickup" | "dropoff" | "damage") || "pickup";
    await OrderService.uploadProof(id, proofType, body.imageUrl, body.notes);
    const updated = await OrderService.getOrderByNumber(id);
    return NextResponse.json({ success: true, order: updated, message: "Photo added successfully." });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to add photo";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!id || !body?.proofId) {
      return NextResponse.json({ success: false, error: "Proof ID is required." }, { status: 400 });
    }
    const supabase = createAdminSupabaseClient();
    const updates: Record<string, unknown> = {};
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.proofType) {
      const typeMap = { pickup: "pickup_doorstep", dropoff: "delivery_doorstep", damage: "processing_wash" };
      updates.proof_type = typeMap[body.proofType as keyof typeof typeMap] || "pickup_doorstep";
    }
    await supabase.from("order_proofs").update(updates).eq("id", body.proofId);
    const updated = await OrderService.getOrderByNumber(id);
    return NextResponse.json({ success: true, order: updated, message: "Photo updated successfully." });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update photo";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  try {
    const { id } = await params;
    const proofId = req.nextUrl.searchParams.get("proofId");
    if (!id || !proofId) {
      return NextResponse.json({ success: false, error: "Order ID and proofId are required." }, { status: 400 });
    }
    await OrderManagementService.deleteProof(id, proofId);
    const updated = await OrderService.getOrderByNumber(id);
    return NextResponse.json({ success: true, order: updated, message: "Photo deleted successfully." });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to delete photo";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
