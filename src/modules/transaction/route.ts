import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { db } from "../lib/db";
import { checkAuthorized } from "../auth/middleware";
import type { AppEnv } from "../../types/env";

export const transactionRouter = new OpenAPIHono<AppEnv>();

// 🎯 CARA YANG BENAR: Cukup satu gerbang utama di sini untuk mengunci semua route di bawahnya
transactionRouter.use("/*", checkAuthorized);

// --- DEFINISI ROUTE GET ALL TRANSACTIONS ---
const getTransactionsRoute = createRoute({
  method: "get",
  path: "/",
  summary: "Get all transactions",
  description:
    "Mengambil semua nota induk hasil OCR lengkap dengan detail item",
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

// ✅ BERSIH: Hapus 'checkAuthorized' dari parameter argumen kedua di sini
transactionRouter.openapi(getTransactionsRoute, async (c) => {
  const transactions = await db.transaction.findMany({
    include: {
      contact: { select: { name: true, type: true } },
      items: true,
    },
    orderBy: { transactionDate: "desc" },
  });
  return c.json({ success: true, data: transactions }, 200);
});

// --- DEFINISI ROUTE GET ALL TRANSACTION ITEMS ---
const getTransactionItemsRoute = createRoute({
  method: "get",
  path: "/items",
  summary: "Get all transaction items",
  description:
    "Mengambil seluruh baris detail item cetak sablon dari semua nota",
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

// ✅ BERSIH: Hapus juga 'checkAuthorized' dari sini
transactionRouter.openapi(getTransactionItemsRoute, async (c) => {
  const items = await db.transactionItem.findMany({
    include: {
      transaction: { select: { invoiceNumber: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return c.json({ success: true, data: items }, 200);
});

export default transactionRouter;
