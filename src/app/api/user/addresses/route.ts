import { NextResponse, type NextRequest } from "next/server";
import { AddressService } from "@/lib/services/address-service";
import { getVerifiedUser } from "@/lib/auth-request";

export async function GET(req: NextRequest) {
  try {
    const verified = await getVerifiedUser(req);
    if (!verified) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const addresses = await AddressService.getAddresses(verified.user.id);
    return NextResponse.json({ success: true, addresses });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load addresses";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const verified = await getVerifiedUser(req);
    if (!verified) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "A valid address payload is required." }, { status: 400 });
    }
    const saved = await AddressService.saveAddress({
      ...body,
      user_id: verified.user.id,
    });
    return NextResponse.json({ success: true, address: saved }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to save address";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const verified = await getVerifiedUser(req);
    if (!verified) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "Address ID required" }, { status: 400 });
    const deleted = await AddressService.deleteAddress(id, verified.user.id);
    if (!deleted) return NextResponse.json({ success: false, error: "Address not found." }, { status: 404 });
    return NextResponse.json({ success: true, message: "Address deleted." });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to delete address";
    const status = msg.includes("at least one") ? 400 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
