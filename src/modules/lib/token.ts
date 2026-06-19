import { sign, verify } from "hono/jwt";

const tokenSecretKey = String(process.env.TOKEN_SECRET_KEY);

interface JWTPayload {
  sub?: string;
}

export async function signToken(userId: string) {
  const payload = {
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + 60 * 15,
  };
  const token = await sign(payload, tokenSecretKey);
  return token;
}

export async function verifyToken(token: string): Promise<JWTPayload> {
  const payload = await verify(token, tokenSecretKey, "HS256");
  return payload as JWTPayload;
}
