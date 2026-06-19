type Transaction = {
  date: any;
  amount: any;
  contactId: any;
  invoiceNumber: string | number;
  transactionDate: Date;
  type: "IN" | "OUT";
  contactName: string; // Nama kontak (customer/supplier)
  dpp: number; // Dasar Pengenaan Pajak
  ppn: number; // Nilai PPN
  grandTotal: number; // Total akhir yang dibayar
  imageUrl?: string; // Link foto nota yang diupload ke storage
};

type TransactionItem = {
  transactionId: any;
  id: any;
  itemName: string; // Nama item (Contoh: "Kaos Polos Cotton Combed 30s", "Tinta DTF")
  color?: string; // Warna (Contoh: "Hitam", "Putih")
  size?: string; // Ukuran (Contoh: "S", "M", "L", "XL")
  quantity: number; // Jumlah item (Qty)
  pricePerUnit: number; // Harga satuan item
  totalPrice: number; // Total harga per baris (Qty * Harga Satuan)
};

export const dataTransactions: Transaction[] = [
  {
    date: new Date("2023-01-15"),
    amount: 111000,
    contactId: 1,
    invoiceNumber: 10210,
    transactionDate: new Date("2023-01-15"),
    type: "IN",
    contactName: "Kang Besut",
    dpp: 100000,
    ppn: 11000,
    grandTotal: 111000,
    imageUrl: "https://example.com/invoice-001.jpg",
  },
  {
    date: new Date("2023-01-16"),
    amount: 55500,
    contactId: 2,
    invoiceNumber: 10211,
    transactionDate: new Date("2023-01-16"),
    type: "OUT",
    contactName: "Toko Bahan Baku",
    dpp: 50000,
    ppn: 5500,
    grandTotal: 55500,
    imageUrl: "https://example.com/invoice-002.jpg",
  },
];

export const dataTransactionItems: TransactionItem[] = [
  {
    itemName: "Kaos Polos Cotton Combed 30s",
    color: "Hitam",
    size: "M",
    quantity: 10,
    pricePerUnit: 10000,
    totalPrice: 100000,
    transactionId: undefined,
    id: undefined,
  },
  {
    itemName: "Tinta DTF",
    color: "Merah",
    size: "L",
    quantity: 5,
    pricePerUnit: 20000,
    totalPrice: 100000,
    transactionId: undefined,
    id: undefined,
  },
];
