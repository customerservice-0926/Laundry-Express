import { NextResponse, type NextRequest } from "next/server";
import { OtpService } from "@/lib/security/otp-service";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { getVerifiedUser } from "@/lib/auth-request";
import { UserDbService } from "@/lib/services/user-db-service";

/**
 * POST /api/auth/otp/send
 * Securely persists hashed 6-digit OTP in the database and dispatches code to email
 */
export async function POST(req: NextRequest) {
  try {
    if (!await consumeRateLimit(req, "otp-send", 5, 60)) {
      return NextResponse.json(
        { success: false, error: "Too many code requests. Please wait 60 seconds." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "A valid JSON payload is required." }, { status: 400 });
    }
    const { email, purpose } = body as Record<string, unknown>;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Email address is required." },
        { status: 400 }
      );
    }

    if (purpose !== "change_password" && purpose !== "reset_password" && purpose !== "register_email") {
      return NextResponse.json(
        { success: false, error: "Invalid purpose specified." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // If changing password in settings, verify caller is authenticated and owns the email
    if (purpose === "change_password") {
      const verified = await getVerifiedUser(req);
      if (!verified) {
        return NextResponse.json(
          { success: false, error: "Unauthorized. Please sign in to change your password." },
          { status: 401 }
        );
      }
      if (verified.user.email.toLowerCase() !== normalizedEmail) {
        return NextResponse.json(
          { success: false, error: "Forbidden. You can only request codes for your own account." },
          { status: 403 }
        );
      }
    }

    if (purpose === "reset_password") {
      const user = await UserDbService.getUserByEmail(normalizedEmail);
      if (!user?.is_active) {
        return NextResponse.json({
          success: true,
          message: "If an active account is associated with this email, a verification code has been sent.",
        }, { headers: { "Cache-Control": "no-store, max-age=0" } });
      }
    }

    // Persist OTP in database and dispatch
    const result = await OtpService.generateAndSaveOtp(normalizedEmail, purpose);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to generate verification code." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: "A 6-digit verification code has been dispatched." },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to dispatch verification code.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
