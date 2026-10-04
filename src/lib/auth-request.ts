import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import type { JWT } from "next-auth/jwt";
import { getAuthSecret } from "@/lib/auth-secret";
import { UserDbService } from "@/lib/services/user-db-service";
import type { User } from "@/types";

export async function getVerifiedUser(
  req: NextRequest
): Promise<{ token: JWT; user: User } | null> {
  const token = await getToken({ req, secret: getAuthSecret() });
  if (!token || (!token.id && !token.email && !token.sub)) return null;

  let user: User | null = null;
  if (token.id) {
    user = await UserDbService.getActiveUserById(String(token.id));
  }
  if (!user && token.email) {
    user = await UserDbService.getUserByEmail(String(token.email));
  }
  if (!user && token.email) {
    user = await UserDbService.syncUser({
      id: (token.id as string) || token.sub || undefined,
      email: String(token.email),
      name: (token.name as string) || "Customer",
      role: (token.role as "admin" | "customer") || "customer",
      image: (token.picture as string) || undefined,
    });
  }

  return user ? { token, user } : null;
}

