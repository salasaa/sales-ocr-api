import { z } from "@hono/zod-openapi";

export const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  fullName: z.string(),
  role: z.enum(["USER", "ADMIN"]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const PrivateUserSchema = UserSchema.extend({
  email: z.string(),
});

export type User = z.infer<typeof UserSchema>;

export type PrivateUser = z.infer<typeof PrivateUserSchema>;

export const UsersSchema = z.array(UserSchema);

export const UserIdParamSchema = z.object({
  id: z.string(),
});

export const RegisterUserSchema = z.object({
  username: z.string(),
  email: z.string(),
  fullName: z.string(),
  password: z.string(),
});

export const LoginUserSchema = z.object({
  email: z.string(),
  password: z.string(),
});

export const LoginResponseSchema = z.object({
  user: UserSchema,
  token: z.string(),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const TokenSchema = z.string();

export const AuthHeaderSchema = z.object({
  Authorization: z.string().openapi({
    example: "Bearer TOKEN",
  }),
});
