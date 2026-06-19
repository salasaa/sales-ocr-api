import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

import { dataUsers } from "./data/users";
import { dataTransactions, dataTransactionItems } from "./data/transactions";
import { dataContacts } from "./data/contacts";
import { Role } from "../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const db = new PrismaClient({ adapter });

async function seedUsers() {
  console.log("Seeding Users...");

  for (const user of dataUsers) {
    await db.user.upsert({
      where: { email: user.email },
      update: {
        username: user.username,
        fullName: user.fullName,
        role: user.role as Role,
      },
      create: {
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role as Role,
        password: {
          create: {
            hash: user.passwordHash,
          },
        },
      },
    });

    console.log(`👤 Seeded User: ${user.username} (${user.role})`);
  }
}

async function seedContacts() {
  for (const contact of dataContacts) {
    await db.contact.upsert({
      where: { id: contact.id },
      create: {
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        type: contact.type,
      },
      update: {
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        type: contact.type,
      },
    });
  }
  console.info("✅ Seeded Contacts");
}

async function seedTransactions() {
  console.log("Seeding Transactions & Items...");

  for (const dataTransaction of dataTransactions) {
    // 1. Ambil nama kontak (Toko/Supplier) dan pisahkan dari payload dasar transaksi
    const { contactName, ...transactionBase } = dataTransaction;

    try {
      // 2. Cari data Contact di database berdasarkan nama uniknya (analog seperti mencari Category/Location)
      const contact = await db.contact.findUnique({
        where: { name: contactName },
      });

      if (!contact) {
        console.warn(
          `⚠️ Contact dengan nama '${contactName}' tidak ditemukan. Skip transaksi ini.`,
        );
        continue;
      }

      // 3. Susun payload query yang aman dan strongly-typed
      const upsertQuery = {
        invoiceNumber: String(transactionBase.invoiceNumber),
        transactionDate: new Date(transactionBase.transactionDate),
        type: transactionBase.type,
        dpp: Number(transactionBase.dpp),
        ppn: Number(transactionBase.ppn),
        grandTotal: Number(transactionBase.grandTotal),
        imageUrl: transactionBase.imageUrl,
        contactId: contact.id, // 👈 Pasang ID ULID asli hasil temuan dari database!
      };

      // 4. Eksekusi Upsert menggunakan invoiceNumber unik
      const transaction = await db.transaction.upsert({
        where: { invoiceNumber: String(transactionBase.invoiceNumber) },
        update: upsertQuery,
        create: upsertQuery,
      });

      console.log(
        `🧾 Seeded Transaction Invoice: ${transaction.invoiceNumber} (${contact.name})`,
      );

      // 5. Masukkan Detail Item Produksi (Itemized) yang terikat dengan ID transaksi di atas
      // Pastikan dataTransactionItems difilter atau dicocokkan sesuai invoice-nya jika datanya banyak
      for (const item of dataTransactionItems) {
        await db.transactionItem.create({
          data: {
            itemName: item.itemName,
            color: item.color,
            size: item.size,
            quantity: Number(item.quantity),
            pricePerUnit: Number(item.pricePerUnit),
            totalPrice: Number(item.totalPrice),
            transactionId: transaction.id, // 👈 Amankan ID relasi ke induknya
          },
        });
      }
    } catch (e) {
      console.error(
        `❌ Fatal database error saat seeding invoice: ${dataTransaction.invoiceNumber}`,
        e,
      );
      throw e;
    }
  }
}

async function main() {
  await seedUsers();
  await seedContacts();
  await seedTransactions();
}

main()
  .then(async () => {
    await db.$disconnect();
    console.log("🌱 Seeding selesai! Database Sales OCR siap!.");
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
