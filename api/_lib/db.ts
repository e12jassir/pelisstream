import { neon } from "@neondatabase/serverless";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export interface CloudStatePayload {
  version: 3;
  profiles: unknown[];
  data: Record<string, unknown>;
}

const EMPTY_STATE: CloudStatePayload = {
  version: 3,
  profiles: [],
  data: {},
};

let schemaReady = false;

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL_MISSING");
  }
  return neon(url);
}

export async function ensureSchema(sql: ReturnType<typeof getSql>) {
  if (schemaReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS pelisstream_accounts (
      username TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      state JSONB NOT NULL DEFAULT '{"version":3,"profiles":[],"data":{}}'::jsonb,
      updated_at BIGINT NOT NULL,
      created_at BIGINT NOT NULL
    );
  `;
  schemaReady = true;
}

export function applyCors(req: VercelRequest, res: VercelResponse): boolean {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}

export function normalizeUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const clean = raw.trim().toLowerCase();
  return /^[a-z0-9._-]{3,24}$/.test(clean) ? clean : null;
}

export function validatePassword(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  return raw.length >= 6 && raw.length <= 128 ? raw : null;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function getSecret(): Buffer {
  const raw = process.env.AUTH_SECRET || process.env.DATABASE_URL || "pelisstream-dev-secret";
  return createHash("sha256").update(raw).digest();
}

export function signToken(username: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      u: username,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    }),
  ).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;

  const expectedSig = createHmac("sha256", getSecret()).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      u?: string;
      exp?: number;
    };
    if (!parsed.u || !parsed.exp || parsed.exp < Date.now()) return null;
    return parsed.u;
  } catch {
    return null;
  }
}

export function sanitizeState(raw: unknown): CloudStatePayload {
  if (!raw || typeof raw !== "object") return EMPTY_STATE;
  const obj = raw as Record<string, unknown>;
  const profiles = Array.isArray(obj.profiles) ? obj.profiles : [];
  const data =
    obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)
      ? (obj.data as Record<string, unknown>)
      : {};
  return { version: 3, profiles, data };
}

export function parseJsonBody<T extends Record<string, unknown>>(req: VercelRequest): T {
  if (!req.body) return {} as T;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body) as T;
    } catch {
      return {} as T;
    }
  }
  return req.body as T;
}
