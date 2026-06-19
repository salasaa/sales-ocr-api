import { z } from "zod";

export const createTransactionSchema = z.object({
  invoiceNumber: z.string().min(1, "Nomor invoice wajib ada"),
  transactionDate: z.string().pipe(z.coerce.date()), // Auto convert string ISO ke Date object
  type: z.enum(["IN", "OUT"]),
  contactId: z.string().min(1, "Contact ID wajib diisi"),
  dpp: z.number().min(0),
  ppn: z.number().min(0),
  grandTotal: z.number().min(0),
  imageUrl: z.string().url().optional().nullable(),
  items: z
    .array(
      z.object({
        itemName: z.string().min(1),
        color: z.string().optional().nullable(),
        size: z.string().optional().nullable(),
        quantity: z.number().int().positive(),
        pricePerUnit: z.number().min(0),
        totalPrice: z.number().min(0),
      }),
    )
    .min(1, "Minimal harus ada 1 item di dalam nota"),
});
