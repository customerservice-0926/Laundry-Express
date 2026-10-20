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

    const body = await req.json().catch(() => ({}));
    const customAmount = typeof body.amount === "number" && body.amount > 0 ? body.amount : undefined;

    const result = await CardOnFileService.chargeCardOnFile(id, customAmount);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || "Card charge failed." }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      order: result.order,
      totalAmount: result.totalAmount,
      message: "Customer card charged successfully.",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to charge customer card.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
