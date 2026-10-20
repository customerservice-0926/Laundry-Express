import { NextResponse, type NextRequest } from "next/server";
import { CustomerService } from "@/lib/services/customer-service";
import { getVerifiedUser } from "@/lib/auth-request";

const requireAdmin = async (req: NextRequest) => {
  const verified = await getVerifiedUser(req);
  if (!verified) return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  if (verified.user.role !== "admin") return NextResponse.json({ success: false, error: "Forbidden. Admin access required." }, { status: 403 });
  return null;
};

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!id || !body) {
      return NextResponse.json({ success: false, error: "Customer ID and update payload are required." }, { status: 400 });
    }
    await CustomerService.updateCustomer(id, body);
    return NextResponse.json({ success: true, message: "Customer profile updated successfully." });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update customer";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ success: false, error: "Customer ID is required." }, { status: 400 });
    await CustomerService.deleteCustomer(id);
    return NextResponse.json({ success: true, message: "Customer account deleted successfully." });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to delete customer";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
