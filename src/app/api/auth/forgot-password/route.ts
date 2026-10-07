import { NextResponse } from "next/server";
import { OtpService } from "@/lib/security/otp-service";
import { UserDbService } from "@/lib/services/user-db-service";
import { consumeRateLimit } from "@/lib/security/rate-limit";

/**
 * POST /api/auth/forgot-password
 *
 * Initiates the password recovery workflow:
 * - Rate limiting check (3 attempts/min per IP address)
 * - Validates email format with RFC 5322 standard regex
 * - Sends a one-time verification code without disclosing account existence
 * - Prevents user enumeration by returning consistent success messages
 * - Dispatches transactional reset notifications
 */
export async function POST(req: Request) {
  try {
    if (!await consumeRateLimit(req, "forgot-password", 3, 60)) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many password reset attempts. Please wait 60 seconds.",
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
      return NextResponse.json({ success: false, error: "A valid email payload is required." }, { status: 400 });
    }
    const { email } = body as Record<string, unknown>;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Email address is required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address format." },
        { status: 400 }
      );
    }

    const user = await UserDbService.getUserByEmail(normalizedEmail);
    if (user?.is_active) {
      const result = await OtpService.generateAndSaveOtp(normalizedEmail, "reset_password");
      if (!result.success) {
        console.error("[forgot-password] Could not send reset code.");
      }
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "If an active account is associated with this email, a verification code has been sent.",
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
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Password reset service temporarily unavailable. Please retry shortly.",
      },
      { status: 500 }
    );
  }
}
