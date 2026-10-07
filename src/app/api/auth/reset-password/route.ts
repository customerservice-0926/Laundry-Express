import { NextResponse } from "next/server";
import { OtpService } from "@/lib/security/otp-service";
import { UserDbService } from "@/lib/services/user-db-service";
import { consumeRateLimit } from "@/lib/security/rate-limit";

/**
 * POST /api/auth/reset-password
 *
 * Finalizes user password update via verified email OTP:
 * - Rate limiting check (5 attempts/min)
 * - Cryptographically verifies matching 6-digit email OTP
 * - Updates hashed credentials across database and memory store
 */
export async function POST(req: Request) {
  try {
    if (!await consumeRateLimit(req, "password-reset", 5, 60)) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many attempts. Please wait 60 seconds.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": "60",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-store, max-age=0",
          },
        }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "A valid reset payload is required." }, { status: 400 });
    }
    const { email, otp, newPassword } = body as Record<string, unknown>;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Email address is required." },
        { status: 400 }
      );
    }

    if (!otp || typeof otp !== "string" || otp.trim().length !== 6) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid 6-digit verification code." },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: "New password must be at least 8 characters long.",
        },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Strictly verify 6-digit OTP dispatched to this email
    const verifyResult = await OtpService.verifyAndConsumeOtp(normalizedEmail, otp.trim(), "reset_password");
    if (!verifyResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: verifyResult.error || "Incorrect or expired verification code. Please check your email.",
        },
        { status: 400 }
      );
    }

    // 2. Persist new hashed password into database and memory registry
    const updated = await UserDbService.updatePassword(normalizedEmail, newPassword);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Unable to update password. Please retry." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Your password has been successfully reset. You may now sign in.",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Password reset service temporarily unavailable.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
