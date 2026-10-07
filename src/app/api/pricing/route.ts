import { NextResponse, type NextRequest } from "next/server";
import { PricingPlanService } from "@/lib/services/pricing-plan-service";
import { getVerifiedUser } from "@/lib/auth-request";

export async function GET() {
  try {
    const pricing = await PricingPlanService.getPricing();
    return NextResponse.json(
      { success: true, configured: pricing !== null, pricing },
      { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load pricing";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const verified = await getVerifiedUser(req);
    if (!verified || verified.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Unauthorized. Admin role required." }, { status: 403 });
    }
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "A valid pricing payload is required." }, { status: 400 });
    }
    const updated = await PricingPlanService.updatePricing(body);
    return NextResponse.json({ success: true, pricing: updated }, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update pricing";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
