import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  applyCors,
  ensureSchema,
  getSql,
  parseJsonBody,
  sanitizeState,
  verifyToken,
} from "./_lib/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  const username = verifyToken(req.headers.authorization);
  if (!username) {
    return res.status(401).json({ error: "Sesión expirada o no autorizada." });
  }

  try {
    const sql = getSql();
    await ensureSchema(sql);

    if (req.method === "GET") {
      const rows = await sql`
        SELECT state, updated_at
        FROM pelisstream_accounts
        WHERE username = ${username}
        LIMIT 1
      `;
      const account = rows[0];
      if (!account) {
        return res.status(404).json({ error: "Cuenta no encontrada." });
      }
      return res.status(200).json({
        username,
        state: sanitizeState(account.state),
        updatedAt: Number(account.updated_at) || Date.now(),
      });
    }

    if (req.method === "PUT") {
      const body = parseJsonBody(req);
      const state = sanitizeState(body.state);
      const now = Date.now();

      const rows = await sql`
        UPDATE pelisstream_accounts
        SET state = ${JSON.stringify(state)}::jsonb,
            updated_at = ${now}
        WHERE username = ${username}
        RETURNING updated_at
      `;
      if (rows.length === 0) {
        return res.status(404).json({ error: "Cuenta no encontrada." });
      }
      return res.status(200).json({ ok: true, updatedAt: now });
    }

    return res.status(405).json({ error: "Método no permitido" });
  } catch (err) {
    if (err instanceof Error && err.message === "DATABASE_URL_MISSING") {
      return res.status(503).json({ error: "Base de datos no configurada en el servidor." });
    }
    console.error("[sync]", err);
    return res.status(500).json({ error: "Error de sincronización." });
  }
}
