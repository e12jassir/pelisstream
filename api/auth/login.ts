import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  applyCors,
  ensureSchema,
  getSql,
  normalizeUsername,
  parseJsonBody,
  sanitizeState,
  signToken,
  validatePassword,
  verifyPassword,
} from "../_lib/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const body = parseJsonBody(req);
  const username = normalizeUsername(body.username);
  const password = validatePassword(body.password);
  if (!username || !password) {
    return res.status(400).json({ error: "Usuario o contraseña inválidos." });
  }

  try {
    const sql = getSql();
    await ensureSchema(sql);

    const rows = await sql`
      SELECT username, password_hash, state, updated_at
      FROM pelisstream_accounts
      WHERE username = ${username}
      LIMIT 1
    `;
    const account = rows[0];
    if (!account || !verifyPassword(password, String(account.password_hash))) {
      return res.status(401).json({ error: "Usuario o contraseña incorrectos." });
    }

    return res.status(200).json({
      token: signToken(username),
      username,
      state: sanitizeState(account.state),
      updatedAt: Number(account.updated_at) || Date.now(),
    });
  } catch (err) {
    if (err instanceof Error && err.message === "DATABASE_URL_MISSING") {
      return res.status(503).json({ error: "Base de datos no configurada en el servidor." });
    }
    console.error("[auth/login]", err);
    return res.status(500).json({ error: "Error interno al iniciar sesión." });
  }
}
