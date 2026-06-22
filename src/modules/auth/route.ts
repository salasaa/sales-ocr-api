import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { db } from "../lib/db";
import {
  AuthHeaderSchema,
  LoginUserSchema,
  PrivateUserSchema,
  RegisterUserSchema,
  TokenSchema,
  UserSchema,
} from "../user/schema";

import { checkAuthorized } from "./middleware";
import { signToken } from "../lib/token";
import type { AppEnv } from "../../types/env";

export const authRoute = new OpenAPIHono<AppEnv>();

// POST register
authRoute.openapi(
  createRoute({
    method: "post",
    path: "/register",
    tags: ["Auth"],
    summary: "Register new user",
    request: {
      body: { content: { "application/json": { schema: RegisterUserSchema } } },
    },
    responses: {
      201: {
        description: "Register new users",
        content: { "application/json": { schema: UserSchema } },
      },
      400: {
        description: "Failed to register new user",
        content: {
          "application/json": { schema: z.object({ message: z.string() }) },
        }, // 💡 Ditambahkan biar sinkron dengan return error c.json
      },
    },
  }),
  async (c) => {
    const body = c.req.valid("json");

    try {
      const hash = await Bun.password.hash(body.password);

      const users = await db.user.create({
        data: {
          username: body.username,
          email: body.email,
          fullName: body.fullName,
          password: { create: { hash } },
        },
      });
      return c.json(users, 201);
    } catch (error) {
      return c.json(
        {
          message: "Username or email already exist",
        },
        400,
      );
    }
  },
);

// POST log in
authRoute.openapi(
  createRoute({
    method: "post",
    path: "/login",
    tags: ["Auth"],
    summary: "Login user",
    request: {
      body: { content: { "application/json": { schema: LoginUserSchema } } },
    },
    responses: {
      200: {
        description: "Logged in user",
        content: { "text/plain": { schema: TokenSchema } },
      },
      400: {
        description: "Failed to login user",
      },
      404: {
        description: "User not found",
      },
    },
  }),
  async (c) => {
    const body = c.req.valid("json");

    try {
      const user = await db.user.findUnique({
        where: { email: body.email },
        include: {
          password: true,
        },
      });

      if (!user) {
        return c.notFound();
      }

      if (!user.password?.hash) {
        return c.json(
          {
            message: "User has no password",
          },
          400,
        ); // 💡 Tambahkan status code eksplisit
      }

      const isMatch = await Bun.password.verify(
        body.password,
        user.password.hash,
      );

      if (!isMatch) {
        return c.json(
          {
            message: "Password incorrect",
          },
          400,
        ); // 💡 Tambahkan status code eksplisit
      }

      const token = await signToken(user.id);

      return c.json(
        {
          token: token,
          user: {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
        },
        200,
      );
    } catch (error) {
      return c.json(
        {
          message: "Email or password incorrect",
        },
        400,
      );
    }
  },
);

// GET auth/me
authRoute.openapi(
  createRoute({
    method: "get",
    path: "/me",
    tags: ["Auth"],
    summary: "Get authenticated user",
    request: { headers: AuthHeaderSchema },
    middleware: checkAuthorized,
    responses: {
      200: {
        description: "Get authenticated user",
        content: { "application/json": { schema: PrivateUserSchema } },
      },
      404: {
        description: "User by id not found",
      },
    },
  }),
  async (c) => {
    const user = c.get("user");
    return c.json(user, 200);
  },
);

export default authRoute;
