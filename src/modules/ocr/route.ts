import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { GoogleGenAI } from "@google/genai";
import { db } from "../lib/db";
import type { AppEnv } from "../../types/env";
import {
  OcrUploadRequestSchema,
  OcrUploadResponseSchema,
  OcrErrorResponseSchema,
} from "./schema";

export const ocrRouter = new OpenAPIHono<AppEnv>();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const ocrUploadRoute = createRoute({
  method: "post",
  path: "/upload",
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: OcrUploadRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: OcrUploadResponseSchema } },
      description: "Struk berhasil diproses dan disimpan ke database lokal",
    },
    400: {
      content: { "application/json": { schema: OcrErrorResponseSchema } },
      description: "Input tidak valid / file kosong",
    },
    500: {
      content: { "application/json": { schema: OcrErrorResponseSchema } },
      description: "Server error",
    },
  },
});

const handleOcrUpload = async (c: any) => {
  try {
    const body = await c.req.parseBody();
    const imageFile = body.image as File;

    if (!imageFile) {
      return c.json({ success: false, error: "File gambar kosong, Bre!" }, 400);
    }

    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ======================================================================
    // 🛠️ MOCK MODE: BAGIAN GEMINI DIMATIKAN SEMENTARA KARENA GOOGLE SERVED 503
    // ======================================================================

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: imageFile.type,
            data: buffer.toString("base64"),
          },
        },
        `Ekstrak data dari struk belanja ini menjadi format JSON murni tanpa markdown (tanpa kata \`\`\`json). 
        Format wajib memiliki key berikut:
        {
          "invoiceNumber": "Nomor invoice/nota unik, jika tidak ada generate acak string unik",
          "cashierName": "Nama kasir jika ada",
          "dpp": 100000 (Dasar Pengenaan Pajak / subtotal sebelum pajak dalam angka),
          "ppn": 11000 (Pajak PPN dalam angka),
          "grandTotal": 111000 (Total akhir setelah pajak dalam angka)
        }`,
      ],
    });

    const rawText = response.text || "{}";
    const cleanJson = JSON.parse(rawText.trim());

    // 🎯 DATA TIRUAN (MOCK) BUAT NYEPESIALIN TES PRISMA DOCKER LOKAL ABANG
    // const cleanJson = {
    //   invoiceNumber: "INV-MOCK-TEST-99",
    //   cashierName: "Kasir Supermarket Mock",
    //   dpp: 150000,
    //   ppn: 16500,
    //   grandTotal: 166500,
    // };
    // ======================================================================

    // 2. Ambil 1 data Contact dari DB lokal buat ngisi 'contactId' yang wajib hukumnya
    const existingContact = await db.contact.findFirst();
    if (!existingContact) {
      return c.json(
        {
          success: false,
          error:
            "Gagal memproses! Tabel Contact di database lokal abang masih kosong. Harus diisi minimal 1 data contact dulu, Bre.",
        },
        400,
      );
    }

    // 3. Simpan ke database sesuai dengan struktur model Transaction abang
    const savedData = await db.transaction.create({
      data: {
        invoiceNumber: cleanJson.invoiceNumber
          ? `${cleanJson.invoiceNumber}-${Math.floor(1000 + Math.random() * 9000)}`
          : `INV-${Date.now()}`,
        transactionDate: new Date(),
        type: "IN",
        contactId: existingContact.id,
        cashierName: cleanJson.cashierName || "Kasir Toko",
        dpp: Number(cleanJson.dpp) || 0,
        ppn: Number(cleanJson.ppn) || 0,
        grandTotal: Number(cleanJson.grandTotal) || 0,
      },
    });

    return c.json(
      {
        success: true,
        message:
          "Struk berhasil diekstrak (MOCK MODE) dan masuk database lokal!",
        data: {
          id: savedData.id,
          invoiceNumber: savedData.invoiceNumber,
          grandTotal: savedData.grandTotal,
          createdAt: savedData.createdAt.toISOString(),
        },
      },
      200,
    );
  } catch (error: any) {
    console.error("OCR Route Error:", error);
    return c.json(
      {
        success: false,
        error: error.message || "Gagal memproses data",
      },
      500,
    );
  }
};

ocrRouter.openapi(ocrUploadRoute, handleOcrUpload);
