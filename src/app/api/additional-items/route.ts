import { NextResponse, type NextRequest } from "next/server";
import { AdditionalItemService } from "@/lib/services/additional-item-service";
import { getVerifiedUser } from "@/lib/auth-request";

const requireAdmin = async (req: NextRequest) => {
  const verified = await getVerifiedUser(req);
  if (!verified) return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  if (verified.user.role !== "admin") return NextResponse.json({ success: false, error: "Forbidden. Admin access required." }, { status: 403 });
  return null;
};

export async function GET(req: NextRequest) {
  try {
    const verified = await getVerifiedUser(req);
    const isAdmin = verified?.user.role === "admin";
    const all = req.nextUrl.searchParams.get("all") === "true" && isAdmin;
    const items = await AdditionalItemService.getItems(all);
    return NextResponse.json({ success: true, items }, { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load additional items";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Valid item payload is required." }, { status: 400 });
    }
    const item = await AdditionalItemService.saveItem(body);
    return NextResponse.json({ success: true, item });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to save item";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  return POST(req);
}

export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "Item ID required" }, { status: 400 });
    await AdditionalItemService.deleteItem(id);
    return NextResponse.json({ success: true, message: "Item deleted." });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to delete item";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
