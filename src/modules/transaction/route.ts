import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { db } from "../lib/db";
import { checkAuthorized } from "../auth/middleware";
import type { AppEnv } from "../../types/env";
import { GoogleGenAI } from "@google/genai";
import { ContactType, TransactionType } from "../../generated/prisma/client";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

export const transactionRouter = new OpenAPIHono<AppEnv>();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

transactionRouter.use("/*", checkAuthorized);

// ==========================================
// 1. SKEMA VALIDASI (ZOD)
// ==========================================
const UploadOcrSchema = z.object({
  file: z.instanceof(File).openapi({
    type: "string",
    format: "binary",
    description: "File gambar nota cetak sablon (PNG/JPG/JPEG)",
  }),
});

// Skema internal validasi balikan Gemini AI
const GeminiResponseSchema = z.object({
  invoiceNumber: z.string(),
  transactionDate: z.string(), // 🎯 FIX: Dibuat string murni tanpa chain .description() yang bikin error
  type: z.enum(["IN", "OUT"]),
  contactName: z.string(),

  cashierName: z.string().nullable().default(null),
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.number(),
      price: z.number(),
      total: z.number(),
    }),
  ),
  subTotal: z.number(),
  tax: z.number(),
  grandTotal: z.number(),
});

// Skema validasi untuk input penyimpanan ke Database
const CreateTransactionSchema = z.object({
  invoiceNumber: z.string(),
  transactionDate: z.coerce
    .date()
    .openapi({ type: "string", format: "date-time" }),
  type: z.enum(["IN", "OUT"]),
  contactName: z.string(),
  imageUrl: z.string().nullable(),
  cashierName: z.string().nullable(),
  subTotal: z.number(),
  tax: z.number(),
  grandTotal: z.number(),
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.number(),
      price: z.number(),
      total: z.number(),
    }),
  ),
});

// ==========================================
// 2. ENDPOINT: POST /ocr (SCAN GAMBAR VIA AI)
// ==========================================
const transactionOcrRoute = createRoute({
  method: "post",
  path: "/ocr",
  tags: ["Transaction"],
  summary: "Scan image via Gemini AI (No DB Save)",
  description:
    "Menerima gambar nota, mengekstrak teks via Gemini termasuk nama kasir dan tanggal waktu jika tersedia",
  request: {
    body: { content: { "multipart/form-data": { schema: UploadOcrSchema } } },
  },
  responses: {
    200: {
      description: "Hasil tebakan AI OCR",
      // 🎯 UBAH DI SINI: Gunakan z.unknown() atau z.any() untuk skema data pembungkusnya
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), data: z.unknown() }),
        },
      },
    },
    400: {
      description: "Error memproses file",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
    },
  },
});

transactionRouter.openapi(transactionOcrRoute, async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body["file"] as File;
    if (!file || file.size === 0)
      return c.json({ success: false, message: "File kosong" }, 400);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadDir = join(process.cwd(), "public", "uploads");
    mkdirSync(uploadDir, { recursive: true });

    const uniqueFileName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    writeFileSync(join(uploadDir, uniqueFileName), buffer);
    const imageUrlPath = `/uploads/${uniqueFileName}`;

    const currentTimestampStr = new Date().toISOString();

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: { mimeType: file.type, data: buffer.toString("base64") },
        },
        `Ekstrak data nota sablon ini menjadi JSON murni sesuai aturan berikut:
         {
           "invoiceNumber": "string nomor nota",
           "transactionDate": "Wajib ambil tanggal DAN jam yang tertera di nota (Contoh dari nota: '18-07-2025 14:27:44' harus dikonversi menjadi format standar ISO string: '2025-07-18T14:27:44.000Z'). Jika jam benar-benar tidak ada, gunakan tanggal nota digabung dengan waktu sekarang.",
           "type": "IN" (jika penjualan/pendapatan) atau "OUT" (jika pembelian bahan/pengeluaran),
           "contactName": "nama supplier/pelanggan (contoh: Dgandels)",
           "cashierName": "nama kasir (contoh: ESTI), set null jika tidak ada",
           "items": [{"name": "nama item", "quantity": number, "price": number, "total": number}],
           "subTotal": number,
           "tax": number,
           "grandTotal": number
         }
         
         Aturan Mutlak: Format string 'transactionDate' harus berupa standar format Date-Time penuh ISO (YYYY-MM-DDTHH:mm:ss.sssZ).`,
      ],
      config: { responseMimeType: "application/json" },
    });

    let responseText = response.text?.trim() || "{}";
    if (responseText.startsWith("```")) {
      responseText = responseText
        .replace(/^```json\s*/i, "")
        .replace(/```$/, "")
        .trim();
    }

    const aiResult = JSON.parse(responseText);
    const parsedOcr = GeminiResponseSchema.parse(aiResult);

    return c.json(
      { success: true, data: { ...parsedOcr, imageUrl: imageUrlPath } },
      200,
    );
  } catch (error) {
    console.error("OCR API Error:", error);
    return c.json(
      { success: false, message: "Gagal memproses gambar via AI" },
      400,
    );
  }
});

// ==========================================
// 3. ENDPOINT: POST / (SAVE TRANSACTION)
// ==========================================
const saveTransactionRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Transaction"],
  summary: "Save confirmed transaction to DB",
  request: {
    body: {
      content: { "application/json": { schema: CreateTransactionSchema } },
    },
  },
  responses: {
    200: {
      description: "Sukses",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), data: z.any() }),
        },
      },
    },
    400: {
      description: "Error",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
    },
  },
});

transactionRouter.openapi(saveTransactionRoute, async (c) => {
  try {
    const validatedData =
      await c.req.json<z.infer<typeof CreateTransactionSchema>>();

    const saved = await db.$transaction(async (tx) => {
      const finalContactType =
        validatedData.type === "IN"
          ? ContactType.CUSTOMER
          : ContactType.SUPPLIER;

      const contact = await tx.contact.upsert({
        where: { name: validatedData.contactName },
        update: {},
        create: { name: validatedData.contactName, type: finalContactType },
      });

      return await tx.transaction.create({
        data: {
          invoiceNumber: validatedData.invoiceNumber,
          transactionDate: validatedData.transactionDate,
          type: validatedData.type as TransactionType,
          contactId: contact.id,
          imageUrl: validatedData.imageUrl,
          cashierName: validatedData.cashierName,
          dpp: validatedData.subTotal,
          ppn: validatedData.tax,
          grandTotal: validatedData.grandTotal,
          items: {
            create: validatedData.items.map((item) => ({
              itemName: item.name,
              quantity: item.quantity,
              pricePerUnit: item.price,
              totalPrice: item.total,
            })),
          },
        },
        include: { contact: true, items: true },
      });
    });

    return c.json({ success: true, data: saved }, 200);
  } catch (error: any) {
    console.error(error);
    if (error.code === "P2002")
      return c.json(
        { success: false, message: "Nomor invoice sudah terdaftar!" },
        400,
      );
    return c.json(
      { success: false, message: "Gagal menyimpan transaksi" },
      400,
    );
  }
});

// ==========================================
// 4. ENDPOINT: PUT /:id (UPDATE TRANSACTION)
// ==========================================
const updateTransactionRoute = createRoute({
  method: "put",
  path: "/:id",
  tags: ["Transaction"],
  summary: "Update an existing transaction",
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: { "application/json": { schema: CreateTransactionSchema } },
    },
  },
  responses: {
    200: {
      description: "Sukses Update",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), data: z.any() }),
        },
      },
    },
    400: {
      description: "Error Update",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
    },
    404: {
      description: "Transaksi tidak ditemukan",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
    },
  },
});

transactionRouter.openapi(updateTransactionRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const validatedData =
      await c.req.json<z.infer<typeof CreateTransactionSchema>>();

    const existingTx = await db.transaction.findUnique({ where: { id } });
    if (!existingTx)
      return c.json(
        { success: false, message: "Data transaksi tidak ditemukan" },
        404,
      );

    const updated = await db.$transaction(async (tx) => {
      const finalContactType =
        validatedData.type === "IN"
          ? ContactType.CUSTOMER
          : ContactType.SUPPLIER;

      const contact = await tx.contact.upsert({
        where: { name: validatedData.contactName },
        update: {},
        create: { name: validatedData.contactName, type: finalContactType },
      });

      await tx.transactionItem.deleteMany({ where: { transactionId: id } });

      return await tx.transaction.update({
        where: { id },
        data: {
          invoiceNumber: validatedData.invoiceNumber,
          transactionDate: validatedData.transactionDate,
          type: validatedData.type as TransactionType,
          contactId: contact.id,
          imageUrl: validatedData.imageUrl,
          cashierName: validatedData.cashierName,
          dpp: validatedData.subTotal,
          ppn: validatedData.tax,
          grandTotal: validatedData.grandTotal,
          items: {
            create: validatedData.items.map((item) => ({
              itemName: item.name,
              quantity: item.quantity,
              pricePerUnit: item.price,
              totalPrice: item.total,
            })),
          },
        },
        include: { contact: true, items: true },
      });
    });

    return c.json({ success: true, data: updated }, 200);
  } catch (error) {
    console.error(error);
    return c.json(
      { success: false, message: "Gagal memperbarui transaksi" },
      400,
    );
  }
});

// ==========================================
// 5. ENDPOINT: DELETE /:id (DELETE TRANSACTION)
// ==========================================
const deleteTransactionRoute = createRoute({
  method: "delete",
  path: "/:id",
  tags: ["Transaction"],
  summary: "Delete a transaction",
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      description: "Sukses Hapus",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
    },
    400: {
      description: "Error Hapus",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
    },
    404: {
      description: "Tidak ditemukan",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
    },
  },
});

transactionRouter.openapi(deleteTransactionRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");

    const existingTx = await db.transaction.findUnique({ where: { id } });
    if (!existingTx)
      return c.json(
        { success: false, message: "Transaksi tidak ditemukan" },
        404,
      );

    await db.$transaction(async (tx) => {
      await tx.transactionItem.deleteMany({ where: { transactionId: id } });
      await tx.transaction.delete({ where: { id } });
    });

    return c.json(
      { success: true, message: "Transaksi berhasil dihapus dari sistem!" },
      200,
    );
  } catch (error) {
    console.error(error);
    return c.json(
      { success: false, message: "Gagal menghapus transaksi" },
      400,
    );
  }
});

// ==========================================
// 6. ENDPOINT: GET ALL
// ==========================================
const getTransactionsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Transaction"],
  summary: "Get all transactions",
  responses: {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), data: z.array(z.any()) }),
        },
      },
    },
  },
});

transactionRouter.openapi(getTransactionsRoute, async (c) => {
  const transactions = await db.transaction.findMany({
    include: { contact: { select: { name: true, type: true } }, items: true },
    orderBy: { transactionDate: "desc" },
  });
  return c.json({ success: true, data: transactions }, 200);
});

export default transactionRouter;
