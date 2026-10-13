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

  // If user was deleted from the database or deactivated, do not resurrect them.
  if (!user || !user.is_active) {
    return null;
  }

  return { token, user };
}

