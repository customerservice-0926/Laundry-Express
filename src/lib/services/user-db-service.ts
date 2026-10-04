import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { hashPassword, verifyPassword } from "@/lib/security/password";
import type { User, UserRole } from "@/types";

/**
 * User Database Service
 * Persists and manages authenticated users dynamically in Supabase (public.users).
 * User roles are dynamic from the database (admin can be any email address).
 */

export interface SyncUserInput {
  id?: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  role?: UserRole;
  image?: string | null;
  avatar_url?: string | null;
}

export class UserDbService {
  static async registerCustomer(input: {
    email: string;
    name: string;
    phone?: string;
    password: string;
  }): Promise<User> {
    const email = input.email.trim().toLowerCase();
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("users")
      .insert({
        email,
        full_name: input.name.trim(),
        phone: input.phone?.trim() || null,
        role: "customer",
        is_active: true,
        password_hash: hashPassword(input.password),
      })
      .select("*")
      .single();

    if (error?.code === "23505") {
      throw new Error("An account with this email already exists.");
    }
    if (error || !data) {
      throw new Error(error?.message || "Unable to create the account.");
    }
    return data as User;
  }

  /**
   * Synchronizes an authenticated user into the database
   */
  static async syncUser(input: SyncUserInput): Promise<User> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const fullName = input.name?.trim() || "Valued Customer";
    const avatarUrl = input.avatar_url || input.image || undefined;
    const fallbackUser: User = {
      id: input.id || normalizedEmail,
      email: normalizedEmail,
      full_name: fullName,
      avatar_url: avatarUrl || undefined,
      phone: input.phone || undefined,
      role: input.role || "customer",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const supabase = createAdminSupabaseClient();
      const { data: existing, error: lookupError } = await supabase
        .from("users").select("id,email,full_name,avatar_url,phone,role,is_active,created_at,updated_at")
        .eq("email", normalizedEmail).maybeSingle();
      if (lookupError || (existing && !existing.is_active)) return fallbackUser;

      if (existing) {
        const { data, error } = await supabase.from("users").update({
          full_name: fullName || existing.full_name,
          phone: input.phone || existing.phone,
          avatar_url: avatarUrl || existing.avatar_url,
          updated_at: new Date().toISOString(),
        }).eq("id", existing.id)
          .select("id,email,full_name,avatar_url,phone,role,is_active,created_at,updated_at").single();
        return (error || !data) ? { ...fallbackUser, id: existing.id, role: existing.role } : (data as User);
      }

      const { data, error } = await supabase.from("users").insert({
        email: normalizedEmail,
        full_name: fullName,
        avatar_url: avatarUrl || null,
        phone: input.phone || null,
        role: input.role || "customer",
        is_active: true,
      }).select("id,email,full_name,avatar_url,phone,role,is_active,created_at,updated_at").single();
      return (error || !data) ? fallbackUser : (data as User);
    } catch {
      return fallbackUser;
    }
  }

  static async verifyCredentialsWithStatus(
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    if (!email || !password || password.length < 6) {
      return { success: false, error: "Please enter your email and password (minimum 6 characters)." };
    }
    const normalized = email.trim().toLowerCase();
    try {
      const supabase = createAdminSupabaseClient();
      const { data: dbUser, error } = await supabase.from("users")
        .select("id,email,full_name,avatar_url,phone,address,role,is_active,created_at,updated_at,password_hash")
        .eq("email", normalized).maybeSingle();
      if (error) return { success: false, error: "Authentication service temporarily unavailable." };
      const targetUser = dbUser as (User & { password_hash?: string }) | null;
      if (!targetUser) return { success: false, error: "No account found with this email. Please check your spelling or register." };
      if (!targetUser.is_active) return { success: false, error: "This account is inactive. Contact support for assistance." };

      const dbHash = targetUser.password_hash;
      if (!dbHash) {
        return {
          success: false,
          error: "This account was created with Google (no password set). Please sign in with Google or use 'Forgot password' to create a password.",
        };
      }
      if (verifyPassword(password, dbHash)) return { success: true, user: targetUser };
      return { success: false, error: "Incorrect password. If you forgot your password, please click 'Forgot password' below." };
    } catch {
      return { success: false, error: "Authentication service temporarily unavailable." };
    }
  }

  static async verifyCredentials(email: string, password: string): Promise<User | null> {
    const res = await this.verifyCredentialsWithStatus(email, password);
    return res.user || null;
  }

  static async verifyAndUpdatePassword(
    email: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    const normalized = email.trim().toLowerCase();
    const supabase = createAdminSupabaseClient();
    const { data: user, error: lookupError } = await supabase.from("users")
      .select("id,password_hash").eq("email", normalized).maybeSingle();
    if (lookupError) throw new Error(`Unable to verify account: ${lookupError.message}`);
    if (!user) return { success: false, error: "User account not found." };
    if (!user.password_hash || !verifyPassword(currentPassword, user.password_hash)) {
      return { success: false, error: "Current password does not match database record." };
    }
    const { data, error } = await supabase.from("users")
      .update({ password_hash: hashPassword(newPassword), updated_at: new Date().toISOString() })
      .eq("id", user.id).select("id").maybeSingle();
    if (error || !data) throw new Error(`Unable to update password: ${error?.message || "User not found."}`);
    return { success: true };
  }

  static async updatePassword(email: string, newPassword: string): Promise<boolean> {
    const normalized = email.trim().toLowerCase();
    if (newPassword.length < 8) throw new Error("Password must be at least 8 characters long.");
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase.from("users")
      .update({ password_hash: hashPassword(newPassword), updated_at: new Date().toISOString() })
      .eq("email", normalized).eq("is_active", true).select("id").maybeSingle();
    if (error || !data) throw new Error(`Unable to update password: ${error?.message || "Active account not found."}`);
    return true;
  }

  /**
   * Retrieves a user profile by email from database
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    try {
      const normalized = email?.trim().toLowerCase() || "";
      if (!normalized) return null;
      const supabase = createAdminSupabaseClient();
      const { data } = await supabase.from("users")
        .select("id,email,full_name,avatar_url,phone,address,role,is_active,created_at,updated_at")
        .eq("email", normalized).maybeSingle();
      return (data as User) || null;
    } catch {
      return null;
    }
  }

  static async getActiveUserById(userId: string): Promise<User | null> {
    try {
      const trimmed = userId?.trim() || "";
      if (!trimmed) return null;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
      const supabase = createAdminSupabaseClient();
      let query = supabase.from("users")
        .select("id,email,full_name,avatar_url,phone,address,role,is_active,created_at,updated_at")
        .eq("is_active", true);

      if (isUUID) query = query.eq("id", trimmed);
      else if (trimmed.includes("@")) query = query.eq("email", trimmed.toLowerCase());
      else return null;

      const { data } = await query.maybeSingle();
      return (data as User) || null;
    } catch {
      return null;
    }
  }

  /**
   * Updates customer profile details or custom avatar
   */
  static async updateProfile(
    userId: string,
    updates: Partial<Pick<User, "full_name" | "phone" | "address" | "avatar_url">>,
    emailHint?: string
  ): Promise<boolean> {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    const supabase = createAdminSupabaseClient();
    let query = supabase.from("users").update({ ...updates, updated_at: new Date().toISOString() });
    if (isUUID) query = query.eq("id", userId);
    else if (emailHint || userId.includes("@")) query = query.eq("email", (emailHint || userId).toLowerCase().trim());
    else return false;
    const { data } = await query.select("id").maybeSingle();
    return Boolean(data);
  }

  static async updateAvatar(userId: string, avatarUrl: string, emailHint?: string): Promise<boolean> {
    return this.updateProfile(userId, { avatar_url: avatarUrl }, emailHint);
  }
}
