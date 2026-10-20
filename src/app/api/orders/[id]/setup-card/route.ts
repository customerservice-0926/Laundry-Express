import { NextResponse, type NextRequest } from "next/server";
import { CardOnFileService } from "@/lib/services/card-on-file-service";
import { getVerifiedUser } from "@/lib/auth-request";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const verified = await getVerifiedUser(req);
    if (!verified || verified.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Admin access required." }, { status: 403 });
    }
    const { id } = await params;
    if (!id) return NextResponse.json({ success: false, error: "Order ID required." }, { status: 400 });

    const origin = req.nextUrl.origin || process.env.NEXT_PUBLIC_SITE_URL || "https://www.laundryexpressservices.com";
    const setupUrl = await CardOnFileService.createCardSetupLink(id, origin);

    return NextResponse.json({ success: true, setupUrl, message: "Card setup link generated." });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to generate card setup link.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
