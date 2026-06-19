type Contact = {
  id: any;
  name: string;
  phone: string;
  type: "CUSTOMER" | "SUPPLIER";
};

export const dataContacts: Contact[] = [
  {
    id: "1",
    name: "Kang Besut",
    phone: "0822-1234-5678",
    type: "CUSTOMER",
  },
  {
    id: "2",
    name: "Toko Bahan Baku",
    phone: "0822-9876-5432",
    type: "SUPPLIER",
  },
];
