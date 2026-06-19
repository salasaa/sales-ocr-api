import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { db } from "../lib/db";
import { createContactSchema } from "./schema";

// Gunakan OpenAPIHono, bukan Hono biasa
const contactRouter = new OpenAPIHono();

// Definisikan Dokumentasi Route untuk GET All
const getContactsRoute = createRoute({
  method: "get",
  path: "/",
  summary: "Get all contacts",
  description: "Mengambil semua data pelanggan dan supplier",
  responses: {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            data: z.array(z.any()),
          }),
        },
      },
    },
  },
});

// Implementasikan logikanya
contactRouter.openapi(getContactsRoute, async (c) => {
  const contacts = await db.contact.findMany({
    orderBy: { createdAt: "desc" },
  });
  return c.json({ success: true, data: contacts }, 200);
});

export default contactRouter;
