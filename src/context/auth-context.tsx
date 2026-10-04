"use client";

import * as React from "react";
import { SessionProvider, useSession, signIn, signOut } from "next-auth/react";
import type { User } from "@/types";
import { authService, type RegisterPayload } from "@/lib/services/auth-service";

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isCustomer: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (callbackUrl?: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterPayload) => Promise<{ success: boolean; error?: string }>;
  sendOtp: (email: string, purpose: "change_password" | "reset_password" | "register_email") => Promise<{ success: boolean; message?: string; error?: string }>;
  changePasswordWithOtp: (email: string, otp: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  resetPasswordWithOtp: (email: string, otp: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  updateAvatar: (avatarUrl: string) => void;
  updateUserProfile: (updates: Partial<Pick<User, "full_name" | "phone" | "address">>) => void;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);
const PROFILE_CHECK_INTERVAL_MS = 120_000; // 2 minutes periodic sync
const PROFILE_CHECK_TIMEOUT_MS = 8_000;

function AuthStateBridge({ children }: { children: React.ReactNode }) {
  const { data: session, status, update: updateSession } = useSession();
  const [verifiedProfile, setVerifiedProfile] = React.useState<{ user: User; sessionId: string } | null>(null);
  const [profileFailure, setProfileFailure] = React.useState<{ sessionId: string; message: string } | null>(null);
  const [profileRetry, setProfileRetry] = React.useState(0);

  const sessionId = session?.user?.id || session?.user?.email || "";

  React.useEffect(() => {
    if (status !== "authenticated" || !sessionId) return;

    let disposed = false;
    let checking = false;

    const validateProfile = async () => {
      if (checking || disposed) return;
      checking = true;
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), PROFILE_CHECK_TIMEOUT_MS);
      try {
        const response = await fetch("/api/user/profile", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.status === 401) {
          if (verifiedProfile) {
            setVerifiedProfile(null);
            setProfileFailure(null);
            await signOut({ callbackUrl: "/login" });
          }
          return;
        }
        if (!response.ok) return;
        const result = await response.json();
        if (!result?.success || !result.user || disposed) return;
        const dbUser = result.user as User;
        if (!dbUser.is_active) throw new Error("Account is no longer active.");

        setVerifiedProfile((prev) => {
          if (prev && prev.sessionId === sessionId && prev.user.updated_at === dbUser.updated_at) return prev;
          return { user: dbUser, sessionId };
        });
        setProfileFailure(null);
      } catch {
        // Fallback user keeps customer operational during momentary connection issues
      } finally {
        window.clearTimeout(timeout);
        checking = false;
      }
    };

    void validateProfile();
    const timer = window.setInterval(validateProfile, PROFILE_CHECK_INTERVAL_MS);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [sessionId, status, profileRetry, verifiedProfile]);

  const login = React.useCallback(async (email: string, password: string) => {
    try {
      const res = await signIn("credentials", { redirect: false, email: email.trim().toLowerCase(), password });
      if (!res || res.error) return { success: false, error: res?.error || "Invalid email or password." };
      const refreshed = await updateSession();
      if (!refreshed?.user?.id) return { success: false, error: "Session setup failed. Please try again." };
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : "Authentication failed." };
    }
  }, [updateSession]);

  const loginWithGoogle = React.useCallback(async (callbackUrl: string = "/dashboard") => {
    try {
      await signIn("google", { callbackUrl });
      return { success: true };
    } catch {
      return { success: false, error: "Google authentication failed. Please try again." };
    }
  }, []);

  const register = React.useCallback(async (data: RegisterPayload) => {
    const res = await authService.register(data);
    if (!res.success) return { success: false, error: res.error || "Registration failed." };
    return login(data.email, data.password);
  }, [login]);

  const sendOtp = React.useCallback((email: string, purpose: "change_password" | "reset_password" | "register_email") =>
    authService.sendOtp(email, purpose), []);
  const changePasswordWithOtp = React.useCallback((email: string, otp: string, newPass: string) =>
    authService.changePasswordWithOtp(email, otp, newPass), []);
  const resetPasswordWithOtp = React.useCallback((email: string, otp: string, newPass: string) =>
    authService.resetPasswordWithOtp(email, otp, newPass), []);

  const updateAvatar = React.useCallback((avatarUrl: string) => {
    setVerifiedProfile((prev) => prev ? { ...prev, user: { ...prev.user, avatar_url: avatarUrl } } : null);
    if (updateSession) updateSession({ image: avatarUrl, avatar_url: avatarUrl });
  }, [updateSession]);

  const updateUserProfile = React.useCallback((updates: Partial<Pick<User, "full_name" | "phone" | "address">>) => {
    setVerifiedProfile((prev) => prev ? { ...prev, user: { ...prev.user, ...updates } } : null);
    if (updateSession && updates.full_name) updateSession({ name: updates.full_name });
  }, [updateSession]);

  const logout = React.useCallback(() => { signOut({ callbackUrl: "/login" }); }, []);

  // Baseline user from session prevents flickering during background re-validations
  const fallbackUser: User | null = session?.user ? {
    id: session.user.id || session.user.email || "customer",
    email: session.user.email || "",
    full_name: session.user.name || "Valued Customer",
    role: (session.user as { role?: "admin" | "customer" }).role || "customer",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } : null;

  const activeUser = status === "authenticated"
    ? (verifiedProfile ? verifiedProfile.user : fallbackUser)
    : null;

  const profileError = profileFailure && profileFailure.sessionId === sessionId && !activeUser
    ? profileFailure.message : null;

  const contextValue = React.useMemo<AuthContextType>(() => ({
    user: activeUser,
    isAuthenticated: !!activeUser,
    isAdmin: activeUser?.role === "admin",
    isCustomer: activeUser?.role === "customer",
    isLoading: status === "loading",
    login,
    loginWithGoogle,
    register,
    sendOtp,
    changePasswordWithOtp,
    resetPasswordWithOtp,
    updateAvatar,
    updateUserProfile,
    logout,
  }), [activeUser, status, login, loginWithGoogle, register, sendOtp, changePasswordWithOtp, resetPasswordWithOtp, updateAvatar, updateUserProfile, logout]);

  return (
    <AuthContext.Provider value={contextValue}>
      {status === "authenticated" && profileError ? (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
          <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-lg font-semibold text-slate-900">Account verification unavailable</h1>
            <p className="mt-2 text-sm text-slate-600">{profileError}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white" onClick={() => setProfileRetry((r) => r + 1)} type="button">Retry</button>
              <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700" onClick={logout} type="button">Sign out</button>
            </div>
          </section>
        </main>
      ) : children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      <AuthStateBridge>{children}</AuthStateBridge>
    </SessionProvider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
