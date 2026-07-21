import { cookies } from "next/headers";
import { prisma } from "./db";
import type { Role } from "@/types";

const SESSION_COOKIE = "tms_session";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  employeeId: string | null;
  sessionId?: string;
};

/** Lazy-load bcrypt so session/API routes don't depend on a webpack vendor chunk. */
export async function hashPassword(password: string) {
  const bcrypt = (await import("bcryptjs")).default;
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  const bcrypt = (await import("bcryptjs")).default;
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    if (!cookieStore || typeof cookieStore.get !== "function") return null;
    const userId = cookieStore.get(SESSION_COOKIE)?.value;
    if (!userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        employeeId: true,
        active: true,
      },
    });
    if (!user || !user.active) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Role,
      employeeId: user.employeeId,
      sessionId: userId,
    };
  } catch (error) {
    console.error("getSession error:", error);
    return null;
  }
}

export async function requireSession(roles?: Role[]) {
  const user = await getSession();
  if (!user) return null;
  if (roles && !roles.includes(user.role)) return null;
  return user;
}

export function roleHomePath(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/";
    case "TRAINER":
      return "/";
    default:
      return "/";
  }
}
