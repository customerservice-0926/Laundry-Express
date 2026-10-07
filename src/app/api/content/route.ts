import { NextResponse, type NextRequest } from "next/server";
import { ContentService } from "@/lib/services/content-service";
import { getVerifiedUser } from "@/lib/auth-request";
import { getServiceNow } from "@/lib/services/booking-availability-service";

const requireAdmin = async (req: NextRequest) => {
  const verified = await getVerifiedUser(req);
  if (!verified) return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  if (verified.user.role !== "admin") return NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 });
  return null;
};

export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get("type");
    if (type === "faqs") return NextResponse.json({ success: true, faqs: await ContentService.getFaqs() });
    if (type === "terms") return NextResponse.json({ success: true, terms: await ContentService.getTerms() });
    if (type === "settings") {
      return NextResponse.json({
        success: true,
        settings: await ContentService.getSettings(),
        server_time: getServiceNow(),
      });
    }

    const [faqs, terms, settings] = await Promise.all([
      ContentService.getFaqs(),
      ContentService.getTerms(),
      ContentService.getSettings(),
    ]);
    return NextResponse.json({ success: true, faqs, terms, settings, server_time: getServiceNow() });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load content";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "A valid content payload is required." }, { status: 400 });
    }
    const { section, item } = body as Record<string, unknown>;
    if (!item || typeof item !== "object") {
      return NextResponse.json({ success: false, error: "A valid item object is required." }, { status: 400 });
    }
    if (section === "faqs") return NextResponse.json({ success: true, faq: await ContentService.saveFaq(item as Parameters<typeof ContentService.saveFaq>[0]) });
    if (section === "terms") return NextResponse.json({ success: true, term: await ContentService.saveTerm(item as Parameters<typeof ContentService.saveTerm>[0]) });
    if (section === "settings") return NextResponse.json({ success: true, settings: await ContentService.updateSettings(item as Parameters<typeof ContentService.updateSettings>[0]) });
    return NextResponse.json({ success: false, error: "Invalid section." }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update content";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  try {
    const id = req.nextUrl.searchParams.get("id");
    const section = req.nextUrl.searchParams.get("section");

    if (!id) return NextResponse.json({ success: false, error: "ID is required." }, { status: 400 });

    if (section === "faqs") {
      await ContentService.deleteFaq(id);
      return NextResponse.json({ success: true, message: "FAQ deleted." });
    }
    if (section === "terms") {
      await ContentService.deleteTerm(id);
      return NextResponse.json({ success: true, message: "Term deleted." });
    }

    return NextResponse.json({ success: false, error: "Invalid section." }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to delete item";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
