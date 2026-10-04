"use client";

import * as React from "react";
import { Mail, KeyRound, AlertCircle, ShieldCheck, Eye, EyeOff, Send, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";

interface SettingsPasswordProps {
  userEmail?: string;
  userPhone?: string;
}

/**
 * SettingsPassword Component
 * Implements password change strictly via email OTP verification.
 * State is strictly kept in-memory for security; credentials and OTPs never touch client storage.
 */
export function SettingsPassword({ userEmail = "customer@laundryexpressservices.com" }: SettingsPasswordProps) {
  const { sendOtp, changePasswordWithOtp } = useAuth();
  const [step, setStep] = React.useState<"request" | "verify" | "success">("request");
  const [otpCode, setOtpCode] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState("");
  const [infoMsg, setInfoMsg] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const handleOtpChange = (val: string) => {
    setOtpCode(val.replace(/\D/g, ""));
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    setInfoMsg("");

    try {
      const res = await sendOtp(userEmail, "change_password");
      if (res.success) {
        setStep("verify");
        setInfoMsg(`A 6-digit verification code has been dispatched to ${userEmail}.`);
      } else {
        setErrorMsg(res.error || "Failed to dispatch verification code.");
      }
    } catch {
      setErrorMsg("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setStep("request");
    setErrorMsg("");
    setInfoMsg("");
  };

  const handleVerifyAndChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!otpCode || otpCode.trim().length !== 6) {
      setErrorMsg("Please enter the complete 6-digit verification code from your email.");
      return;
    }
    if (newPassword.length < 8) {
      setErrorMsg("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("New passwords do not match. Please verify.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await changePasswordWithOtp(userEmail, otpCode.trim(), newPassword);
      if (res.success) {
        setStep("success");
        setOtpCode("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setErrorMsg(res.error || "Incorrect or expired code. Please verify.");
      }
    } catch {
      setErrorMsg("Unable to update password. Please retry.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
      <div className="border-b border-slate-100 pb-3">
        <h3 className="text-base font-black text-slate-900">Security &amp; Password Update</h3>
        <p className="text-xs text-slate-500">
          Reset or update your password via a single-use 6-digit verification code sent to your registered email.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {infoMsg && step === "verify" && (
        <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900 flex items-center gap-2">
          <Mail className="h-4 w-4 text-sky-600 shrink-0" />
          <span>{infoMsg}</span>
        </div>
      )}

      {step === "request" && (
        <form onSubmit={handleSendOtp} className="space-y-4 max-w-md text-xs">
          <div className="p-4 rounded-xl border border-pink-100 bg-pink-50/50 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Mail className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-slate-900 block truncate">Email Verification Required</span>
              <span className="text-[11px] text-slate-500 block truncate">{userEmail}</span>
            </div>
          </div>

          <Button type="submit" variant="hero" size="sm" isLoading={isLoading} className="cursor-pointer">
            <Send className="h-3.5 w-3.5 mr-1.5" />
            <span>Send 6-Digit OTP to Email</span>
          </Button>
        </form>
      )}

      {step === "verify" && (
        <form onSubmit={handleVerifyAndChange} className="space-y-4 max-w-md text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Enter 6-Digit Email Code *</label>
            <input
              type="text"
              required
              maxLength={6}
              placeholder="e.g. 123456"
              value={otpCode}
              onChange={(e) => handleOtpChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono text-base tracking-widest text-center focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">New Password (Min 8 Characters) *</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-primary"
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
            <label className="block text-slate-700 font-semibold mb-1">Confirm New Password *</label>
            <input
              type={showPassword ? "text" : "password"}
              required
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={handleCancel} className="cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" variant="hero" size="sm" isLoading={isLoading} className="cursor-pointer">
              <KeyRound className="h-3.5 w-3.5 mr-1" />
              <span>Verify OTP &amp; Save Password</span>
            </Button>
            <button
              type="button"
              onClick={() => handleSendOtp()}
              className="ml-auto text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Resend Code</span>
            </button>
          </div>
        </form>
      )}

      {step === "success" && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-3 max-w-md">
          <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <span>Password Successfully Updated!</span>
          </div>
          <p>Your password was securely updated via email OTP verification. Your new password is now active.</p>
          <Button type="button" variant="outline" size="sm" onClick={handleCancel} className="cursor-pointer text-xs">
            Done
          </Button>
        </div>
      )}
    </div>
  );
}

export default SettingsPassword;
