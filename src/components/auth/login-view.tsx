"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn, Eye, EyeOff, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";

/**
 * LoginView Component
 *
 * Dedicated clean authentication card for customer and staff sign-in:
 * - Brand logo badge positioned prominently at the top
 * - One-click NextAuth Google OAuth sign-in
 * - Secure credentials authentication with remember me toggle
 * - Direct navigation to /register for new customers
 */
export function LoginView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("callbackUrl") || searchParams.get("redirect");

  const { login, loginWithGoogle, isAuthenticated, user, isAdmin } = useAuth();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);

  // Redirect if user is already authenticated
  React.useEffect(() => {
    if (isAuthenticated && user) {
      const destination = redirectPath || "/dashboard";
      router.push(destination);
    }
  }, [isAuthenticated, user, isAdmin, redirectPath, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsSubmitting(true);

    try {
      const res = await login(email, password);
      if (!res.success) {
        setErrorMsg(res.error || "Invalid email or password.");
        setIsSubmitting(false);
        return;
      }

      const destination = redirectPath || "/dashboard";
      router.push(destination);
    } catch {
      setErrorMsg("An unexpected error occurred during sign-in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg("");
    setIsGoogleLoading(true);
    try {
      const destination = redirectPath || "/dashboard";
      const res = await loginWithGoogle(destination);
      if (!res.success) {
        setErrorMsg(res.error || "Google authentication was not completed.");
      }
    } catch {
      setErrorMsg("Unable to connect to Google service.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
      {/* Brand Logo Header */}
      <div className="text-center space-y-3">
        <div className="relative h-16 w-16 mx-auto rounded-2xl overflow-hidden shadow-sm border border-slate-100">
          <Image
            src="/brand/logo-badge.jpeg"
            alt="Laundry Express Logo"
            fill
            sizes="64px"
            priority
            className="object-cover"
          />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Welcome Back
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Sign in to track orders, manage pickups, or access your portal
          </p>
        </div>
      </div>

      {/* Google OAuth Button via NextAuth */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isGoogleLoading || isSubmitting}
        className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs disabled:opacity-50"
      >
        <Globe className="h-4 w-4 text-sky-600" />
        <span>{isGoogleLoading ? "Connecting to Google..." : "Continue with Google"}</span>
      </button>

      {/* Visual Divider */}
      <div className="relative flex items-center justify-center">
        <div className="border-t border-slate-200 w-full" />
        <span className="bg-white px-3 text-[10px] uppercase font-bold text-slate-400 absolute">
          Or sign in with email
        </span>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200 leading-relaxed space-y-1.5">
          <p>{errorMsg}</p>
          {(errorMsg.toLowerCase().includes("forgot password") || errorMsg.toLowerCase().includes("google")) && (
            <Link
              href={`/forgot-password${email ? `?email=${encodeURIComponent(email.trim().toLowerCase())}` : ""}`}
              className="inline-block font-bold text-primary hover:underline pt-0.5"
            >
              Reset / Create a password &rarr;
            </Link>
          )}
        </div>
      )}

      {/* Credentials Form */}
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Email Address
          </label>
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="font-bold text-slate-700 uppercase tracking-wider">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-[11px] text-primary font-bold hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center text-[11px] pt-0.5">
          <label className="flex items-center gap-2 cursor-pointer text-slate-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
            />
            <span>Remember this device</span>
          </label>
        </div>

        <Button
          type="submit"
          variant="hero"
          size="lg"
          disabled={isSubmitting || isGoogleLoading}
          className="w-full shadow-md shadow-pink-500/20 mt-2"
        >
          <LogIn className="h-4 w-4 mr-1.5" />
          <span>{isSubmitting ? "Signing in..." : "Sign In to Account"}</span>
        </Button>
      </form>

      {/* Switch to Registration */}
      <div className="pt-2 text-center border-t border-slate-100 text-xs text-slate-600">
        Don&apos;t have an account?{" "}
        <Link
          href={redirectPath ? `/register?callbackUrl=${encodeURIComponent(redirectPath)}` : "/register"}
          className="font-bold text-primary hover:underline"
        >
          Create an account
        </Link>
      </div>
    </div>
  );
}
