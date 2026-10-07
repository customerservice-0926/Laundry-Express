import { NextResponse } from "next/server";
import { UserDbService } from "@/lib/services/user-db-service";
import { consumeRateLimit } from "@/lib/security/rate-limit";

/**
 * POST /api/auth/login
 *
 * Production endpoint for secure user authentication:
 * - Rate limiting enforcement (5 req/min)
 * - Email and password format validation
 * - Role-based assignment (Customer vs Admin)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "A valid login payload is required." }, { status: 400 });
    }
    const { email, password } = body as Record<string, unknown>;

    if (!email || typeof email !== "string" || !password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Email and password are required." },
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

    if (!await consumeRateLimit(req, "auth_login", 5, 60, normalizedEmail)) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many login attempts. Please wait 60 seconds before trying again.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": "60",
            "X-Content-Type-Options": "nosniff",
          },
        }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    // Strictly verify credentials using database records
    const user = await UserDbService.verifyCredentials(normalizedEmail, password);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        user,
        message: "Authentication successful.",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
          "X-Content-Type-Options": "nosniff",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal authentication service error." },
      { status: 500 }
    );
  }
}
