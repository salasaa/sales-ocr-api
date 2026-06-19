type User = {
  username: string;
  email: string;
  fullName: string;
  role: "USER" | "ADMIN";
  passwordHash: string;
};

export const dataUsers: User[] = [
  {
    username: "admin",
    role: "ADMIN",
    email: "admin@admin.com",
    fullName: "Admin User",
    passwordHash: "adminadminadmin",
  },
  {
    username: "regularuser",
    role: "USER",
    email: "user@example.com",
    fullName: "Regular User",
    passwordHash: "useruseruser",
  },
];
