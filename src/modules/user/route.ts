import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { db } from "../lib/db";

const userRouter = new OpenAPIHono();

const getUsersRoute = createRoute({
  method: "get",
  path: "/",
  summary: "Get all users",
  description: "Mengambil semua daftar user beserta detail role-nya",
  responses: {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            data: z.array(
              z.object({
                id: z.string(),
                username: z.string(),
                email: z.string(),
                fullName: z.string(),
                role: z.string(),
                createdAt: z.string(),
              }),
            ),
          }),
        },
      },
    },
  },
});

userRouter.openapi(getUsersRoute, async (c) => {
  const users = await db.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      fullName: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return c.json({ success: true, data: users }, 200);
});

export default userRouter;
