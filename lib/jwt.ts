import { createHash } from "crypto";
import jwt, { SignOptions } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export function signToken(
  payload: Record<string, unknown>,
  config: SignOptions,
) {
  return jwt.sign(payload, JWT_SECRET, { ...config });
}

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET);
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
