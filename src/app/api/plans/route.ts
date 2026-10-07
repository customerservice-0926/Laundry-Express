import { NextResponse, type NextRequest } from "next/server";
import { PricingPlanService } from "@/lib/services/pricing-plan-service";
import { getVerifiedUser } from "@/lib/auth-request";

export async function GET(req: NextRequest) {
  try {
    const verified = await getVerifiedUser(req);
    const allPlans = await PricingPlanService.getPlans();
    const plans = verified?.user.role === "admin" ? allPlans : allPlans.filter((plan) => plan.is_active);
    return NextResponse.json({ success: true, plans }, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load packages";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const verified = await getVerifiedUser(req);
    if (!verified || verified.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Unauthorized. Admin role required." }, { status: 403 });
    }
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "A valid plan payload is required." }, { status: 400 });
    }
    const saved = await PricingPlanService.savePlan(body);
    return NextResponse.json({ success: true, plan: saved }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to save package";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  return POST(req);
}

export async function PATCH(req: NextRequest) {
  try {
    const verified = await getVerifiedUser(req);
    if (!verified || verified.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Unauthorized. Admin role required." }, { status: 403 });
    }
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "A valid plan payload is required." }, { status: 400 });
    }
    const updated = await PricingPlanService.updatePlan(body);
    return NextResponse.json({ success: true, plan: updated }, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update package";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const verified = await getVerifiedUser(req);
    if (!verified || verified.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Unauthorized. Admin role required." }, { status: 403 });
    }
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Plan ID is required." }, { status: 400 });
    }
    await PricingPlanService.deletePlan(id);
    return NextResponse.json({ success: true, message: "Package removed." });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to delete package";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
