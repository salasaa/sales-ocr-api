import { z } from "zod";

export const createContactSchema = z.object({
  name: z.string().min(1, "Nama kontak wajib diisi"),
  phone: z.string().optional().nullable(),
  type: z.enum(["CUSTOMER", "SUPPLIER"]),
});

export const updateContactSchema = createContactSchema.partial();
