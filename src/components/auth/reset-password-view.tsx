"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, RefreshCw, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";

/**
 * ResetPasswordView Component
 *
 * Password reset form requiring 6-digit email OTP match:
 * - Email, 6-digit OTP code, and new password confirmation
 * - Matches OTP strictly against server-generated code
 */
export function ResetPasswordView() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";

  const { resetPasswordWithOtp, sendOtp } = useAuth();

  const [email, setEmail] = React.useState(initialEmail);
  const [otpCode, setOtpCode] = React.useState("");

  const handleOtpChange = (val: string) => {
    setOtpCode(val.replace(/\D/g, ""));
  };
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isResending, setIsResending] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [resendNotice, setResendNotice] = React.useState("");
  const [isSuccess, setIsSuccess] = React.useState(false);

  const handleResend = async () => {
    if (!email || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address to receive a code.");
      return;
    }
    setIsResending(true);
    setErrorMessage("");
    try {
      const res = await sendOtp(email.trim().toLowerCase(), "reset_password");
      if (res.success) {
        setResendNotice(`A fresh 6-digit code was sent to ${email}.`);
        setTimeout(() => setResendNotice(""), 6000);
      } else {
        setErrorMessage(res.error || "Failed to resend code.");
      }
    } catch {
      setErrorMessage("Unable to resend code. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email) {
      setErrorMessage("Please enter your account email address.");
      return;
    }

    if (!otpCode || otpCode.trim().length !== 6) {
      setErrorMessage("Please enter the complete 6-digit verification code sent to your email.");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please verify.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await resetPasswordWithOtp(email.trim().toLowerCase(), otpCode.trim(), newPassword);
      if (res.success) {
        setIsSuccess(true);
      } else {
        setErrorMessage(res.error || "Incorrect or expired code. Please verify.");
      }
    } catch {
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
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
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Verify Code &amp; Reset</h1>
          <p className="text-xs text-slate-500 mt-1">
            Enter the 6-digit OTP code sent to your email and set your new password
          </p>
        </div>
      </div>

      {isSuccess ? (
        <div className="space-y-4 animate-in fade-in">
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="font-bold text-sm text-emerald-950">Password Successfully Reset!</p>
            <p className="text-slate-600">Your new password is now active. You may log in immediately.</p>
          </div>

          <Link href="/login" className="block">
            <Button variant="hero" size="lg" className="w-full shadow-md shadow-pink-500/20">
              <span>Sign In with New Password</span>
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {resendNotice && (
            <div className="p-3 rounded-xl bg-sky-50 text-sky-800 text-xs border border-sky-200">
              {resendNotice}
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Account Email *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700 uppercase tracking-wider">6-Digit Email Code *</label>
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`h-3 w-3 ${isResending ? "animate-spin" : ""}`} />
                <span>Resend Code</span>
              </button>
            </div>
            <input
              type="text"
              required
              maxLength={6}
              placeholder="e.g. 123456"
              value={otpCode}
              onChange={(e) => handleOtpChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-mono text-base tracking-widest text-center focus:ring-2 focus:ring-primary font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">New Password (Min 8 chars) *</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Confirm New Password *</label>
            <input
              type={showPassword ? "text" : "password"}
              required
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-primary"
            />
          </div>

          <Button type="submit" variant="hero" size="lg" disabled={isSubmitting} className="w-full shadow-md shadow-pink-500/20 mt-1">
            <KeyRound className="h-4 w-4 mr-1.5" />
            <span>{isSubmitting ? "Verifying & Updating..." : "Verify OTP & Set Password"}</span>
          </Button>

          <div className="text-center pt-2">
            <Link href="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
