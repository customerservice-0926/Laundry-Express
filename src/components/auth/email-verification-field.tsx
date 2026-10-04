"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";

export function EmailVerificationField({
  email,
  onCodeChange,
  disabled,
}: {
  email: string;
  onCodeChange: (code: string) => void;
  disabled: boolean;
}) {
  const { sendOtp } = useAuth();
  const [sending, setSending] = React.useState(false);
  const [codeValue, setCodeValue] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (codeValue) onCodeChange(codeValue);
  }, [codeValue, onCodeChange]);

  const handleChange = (val: string) => {
    const cleaned = val.replace(/\D/g, "");
    setCodeValue(cleaned);
    onCodeChange(cleaned);
  };

  const sendCode = async () => {
    setMessage("");
    setError("");
    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }
    setSending(true);
    const result = await sendOtp(email, "register_email");
    if (result.success) {
      setMessage("Verification code sent. Check your email.");
    } else {
      setError(result.error || "Could not send a verification code.");
    }
    setSending(false);
  };

  return (
    <>
      <div className="mt-2 flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          placeholder="Email verification code"
          value={codeValue}
          onChange={(event) => handleChange(event.target.value)}
          className="min-w-0 flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
        <button
          type="button"
          onClick={sendCode}
          disabled={disabled || sending}
          className="shrink-0 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {sending ? "Sending..." : "Send code"}
        </button>
      </div>
      {message && <p className="mt-1 text-xs text-emerald-700">{message}</p>}
      {error && <p className="mt-1 text-xs text-rose-700">{error}</p>}
    </>
  );
}
