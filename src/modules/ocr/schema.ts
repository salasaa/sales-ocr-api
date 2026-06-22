import { z } from "@hono/zod-openapi";

// Skema untuk input (Multipart Form Data untuk Upload Gambar)
export const OcrUploadRequestSchema = z.object({
  image: z.instanceof(File).openapi({
    description: "File gambar struk/nota belanja (PNG/JPG)",
    type: "string",
    format: "binary",
  }),
});

// Skema untuk output sukses (Response 200)
export const OcrUploadResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z
    .object({
      id: z.string().or(z.number()),
      storeName: z.string(),
      total: z.number(),
      createdAt: z.string(),
    })
    .openapi({
      description: "Data transaksi yang berhasil disimpan ke database",
    }),
});

// Skema untuk output error (Response 400 / 500)
export const OcrErrorResponseSchema = z.object({
  success: z.boolean(),
  error: z.string(),
});
