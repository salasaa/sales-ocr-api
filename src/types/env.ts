import type { User } from "../generated/prisma/client";

export type AppEnv = {
  Variables: {
    user: User;
  };
};
