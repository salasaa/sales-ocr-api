import { createMiddleware } from "hono/factory";
import { db } from "../lib/db";
import { verifyToken } from "../lib/token";
import type { AppEnv } from "../../types/env";

/**
 * Check for header and token
 *
 * Authorization: Bearer <token>
 */
export const checkAuthorized = createMiddleware<AppEnv>(async (c, next) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ message: "Authorization header is required" }, 401);
    }

    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) {
      return c.json({ message: "Authorization must be Bearer token" }, 401);
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return c.json({ message: "Invalid token" }, 401);
    }

    const user = await db.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return c.json({ message: "User is no longer available" }, 401);
    }

    c.set("user", user);
    await next();
  } catch {
    return c.json({ message: "Failed to check authorized user" }, 401);
  }
});
