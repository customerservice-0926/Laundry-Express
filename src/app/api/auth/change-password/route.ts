import { NextResponse, type NextRequest } from "next/server";
import { OtpService } from "@/lib/security/otp-service";
import { UserDbService } from "@/lib/services/user-db-service";
import { getVerifiedUser } from "@/lib/auth-request";

/**
 * POST /api/auth/change-password
 * Updates account password strictly upon matching 6-digit email OTP
 */
export async function POST(req: NextRequest) {
  try {
    const verified = await getVerifiedUser(req);
    if (!verified) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "A valid JSON payload is required." }, { status: 400 });
    }
    const { email, otp, newPassword } = body as Record<string, unknown>;

    if (typeof email !== "string" || typeof otp !== "string" || typeof newPassword !== "string" || !email.trim() || !otp.trim()) {
      return NextResponse.json(
        { success: false, error: "Email, verification OTP, and new password are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Verify session user matches requested email (or is admin)
    if (verified.user.email.toLowerCase() !== normalizedEmail) {
      return NextResponse.json(
        { success: false, error: "Forbidden. You cannot change another user's password." },
        { status: 403 }
      );
    }

    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: "New password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    // 1. Strictly match OTP in DB
    const verifyResult = await OtpService.verifyAndConsumeOtp(normalizedEmail, otp, "change_password");
    if (!verifyResult.success) {
      return NextResponse.json(
        { success: false, error: verifyResult.error || "Incorrect or expired verification code." },
        { status: 400 }
      );
    }

    // 2. Persist new hashed password
    const updated = await UserDbService.updatePassword(normalizedEmail, newPassword);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Failed to update password in database." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Your password has been successfully updated." },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Password change service error.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
