import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
export function passwordHash(password: string) {
  if (password.length < 12 || password.length > 1024)
    throw new Error("Password must contain 12–1024 characters");
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function passwordMatches(password: string, hash: string) {
  const [salt, saved] = hash.split(":") as [string, string];
  return timingSafeEqual(
    scryptSync(password, salt, 64),
    Buffer.from(saved, "hex"),
  );
}
