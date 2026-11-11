import { betterAuth } from "better-auth";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Pool } from "pg";
const scrypt = promisify(scryptCallback);
export function createAuth(
  pool: Pool,
  origin: string,
  secret = process.env.BETTER_AUTH_SECRET,
) {
  if (!secret || secret.length < 32)
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters");
  return betterAuth({
    appName: "GlassCRM",
    database: pool,
    baseURL: origin,
    basePath: "/api/auth",
    secret,
    trustedOrigins: [origin],
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
      maxPasswordLength: 1024,
      password: {
        hash: hashPassword,
        verify: async ({ hash, password }) => {
          if (hash.startsWith("legacy:")) {
            const match = /^legacy:([a-f0-9]{32}):([a-f0-9]{128})$/.exec(hash);
            if (!match) return false;
            const actual = (await scrypt(password, match[1]!, 64)) as Buffer;
            return timingSafeEqual(actual, Buffer.from(match[2]!, "hex"));
          }
          return verifyPassword({ hash, password });
        },
      },
    },
    session: {
      expiresIn: 8 * 3600,
      updateAge: 3600,
      cookieCache: { enabled: false },
    },
    advanced: {
      defaultCookieAttributes: { sameSite: "strict" },
      database: { validateSchema: false },
      useSecureCookies: process.env.NODE_ENV === "production",
      ipAddress: { ipAddressHeaders: ["x-glasscrm-client-ip"] },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 60,
      customRules: { "/sign-in/email": { window: 900, max: 10 } },
    },
    user: { changeEmail: { enabled: false }, deleteUser: { enabled: false } },
  });
}
export type Auth = ReturnType<typeof createAuth>;
