import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  applyCors,
  ensureSchema,
  getSql,
  hashPassword,
  normalizeUsername,
  parseJsonBody,
  sanitizeState,
  signToken,
  validatePassword,
} from "../_lib/db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const body = parseJsonBody(req);
  const username = normalizeUsername(body.username);
  if (!username) {
    return res.status(400).json({
      error: "El usuario debe tener entre 3 y 24 caracteres (letras, números, . _ -).",
    });
  }

  const password = validatePassword(body.password);
  if (!password) {
    return res.status(400).json({
      error: "La contraseña debe tener al menos 6 caracteres.",
    });
  }

  try {
    const sql = getSql();
    await ensureSchema(sql);

    const existing = await sql`
      SELECT username FROM pelisstream_accounts WHERE username = ${username} LIMIT 1
    `;
    if (existing.length > 0) {
      return res.status(409).json({ error: "Ese nombre de usuario ya está en uso." });
    }

    const now = Date.now();
    const state = sanitizeState(body.state);
    const passwordHash = hashPassword(password);

    await sql`
      INSERT INTO pelisstream_accounts (username, password_hash, state, updated_at, created_at)
      VALUES (${username}, ${passwordHash}, ${JSON.stringify(state)}::jsonb, ${now}, ${now})
    `;

    return res.status(201).json({
      token: signToken(username),
      username,
      state,
      updatedAt: now,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "DATABASE_URL_MISSING") {
      return res.status(503).json({ error: "Base de datos no configurada en el servidor." });
    }
    console.error("[auth/register]", err);
    return res.status(500).json({ error: "Error interno al crear la cuenta." });
  }
}
