// Generic table query endpoint that mirrors the small subset of the
// PostgREST/Supabase query builder used by the frontend shim.
//
// Body shape (all fields optional except method):
// {
//   method: "select" | "insert" | "update" | "delete",
//   select: "*" | "col,col",
//   filters: [{op:"eq"|"neq"|"gt"|"lt"|"gte"|"lte", column, value}],
//   order: {column, ascending},
//   limit: number,
//   single: "one" | "maybe" | null,
//   payload: object | null,
//   count: boolean,
//   head: boolean
// }
const { v4: uuid } = require("uuid");
const db = require("../database/init");
const { getIO } = require("../sockets");

// Whitelist tables so the endpoint cannot be used to poke at internal ones.
const ALLOWED = new Set([
  "profiles",
  "cctv_devices",
  "network_packets",
  "threats",
  "incidents",
  "alert_logs",
  "traffic_stats",
  "ml_model_status",
]);

const OPS = { eq: "=", neq: "!=", gt: ">", lt: "<", gte: ">=", lte: "<=" };

function buildWhere(filters = []) {
  if (!filters.length) return { sql: "", params: [] };
  const parts = [];
  const params = [];
  for (const f of filters) {
    const op = OPS[f.op];
    if (!op) continue;
    parts.push(`"${f.column}" ${op} ?`);
    params.push(f.value);
  }
  return { sql: parts.length ? " WHERE " + parts.join(" AND ") : "", params };
}

exports.query = (req, res) => {
  const table = req.params.table;
  if (!ALLOWED.has(table)) return res.status(400).json({ error: `Unknown table: ${table}` });
  const {
    method = "select",
    select = "*",
    filters = [],
    order = null,
    limit = null,
    single = null,
    payload = null,
    count = false,
    head = false,
  } = req.body || {};

  try {
    if (method === "select") {
      const where = buildWhere(filters);
      let out = { data: null, count: undefined };
      if (count) {
        const c = db
          .prepare(`SELECT COUNT(*) AS c FROM "${table}"${where.sql}`)
          .get(...where.params);
        out.count = c.c;
        if (head) return res.json(out);
      }
      const cols = select === "*" ? "*" : select.split(",").map((c) => `"${c.trim()}"`).join(",");
      let sql = `SELECT ${cols} FROM "${table}"${where.sql}`;
      if (order) sql += ` ORDER BY "${order.column}" ${order.ascending ? "ASC" : "DESC"}`;
      if (limit) sql += ` LIMIT ${parseInt(limit, 10)}`;
      const rows = db.prepare(sql).all(...where.params);
      if (single === "one") {
        if (rows.length !== 1) return res.status(406).json({ error: "Not exactly one row" });
        out.data = rows[0];
      } else if (single === "maybe") {
        out.data = rows[0] || null;
      } else {
        out.data = rows;
      }
      return res.json(out);
    }

    if (method === "insert") {
      const rows = Array.isArray(payload) ? payload : [payload];
      const inserted = [];
      for (const r of rows) {
        // Dedup: for cctv_devices, upsert on ip_address so re-registering the
        // same camera never creates a duplicate row.
        if (table === "cctv_devices" && r?.ip_address) {
          const existing = db
            .prepare(`SELECT * FROM "cctv_devices" WHERE ip_address = ? LIMIT 1`)
            .get(r.ip_address);
          if (existing) {
            const merged = { ...existing, ...r, id: existing.id };
            const keys = Object.keys(merged).filter((k) => k !== "id");
            const set = keys.map((k) => `"${k}" = ?`).join(",");
            db.prepare(`UPDATE "cctv_devices" SET ${set} WHERE id = ?`).run(
              ...keys.map((k) => (typeof merged[k] === "boolean" ? (merged[k] ? 1 : 0) : merged[k])),
              existing.id
            );
            inserted.push(merged);
            getIO()?.emit(`db:cctv_devices`, { eventType: "UPDATE", new: merged, table });
            continue;
          }
        }
        const row = { id: r.id || uuid(), ...r };
        const keys = Object.keys(row);
        const placeholders = keys.map(() => "?").join(",");
        const sql = `INSERT INTO "${table}" (${keys.map((k) => `"${k}"`).join(",")}) VALUES (${placeholders})`;
        db.prepare(sql).run(...keys.map((k) => (typeof row[k] === "boolean" ? (row[k] ? 1 : 0) : row[k])));
        inserted.push(row);
        getIO()?.emit(`db:${table}`, { eventType: "INSERT", new: row, table });
      }
      return res.json({ data: inserted });
    }


    if (method === "update") {
      const where = buildWhere(filters);
      const keys = Object.keys(payload || {});
      if (!keys.length) return res.status(400).json({ error: "Empty update payload" });
      const set = keys.map((k) => `"${k}" = ?`).join(",");
      const params = keys.map((k) => (typeof payload[k] === "boolean" ? (payload[k] ? 1 : 0) : payload[k]));
      db.prepare(`UPDATE "${table}" SET ${set}${where.sql}`).run(...params, ...where.params);
      const updated = db
        .prepare(`SELECT * FROM "${table}"${where.sql}`)
        .all(...where.params);
      updated.forEach((row) =>
        getIO()?.emit(`db:${table}`, { eventType: "UPDATE", new: row, table })
      );
      return res.json({ data: updated });
    }

    if (method === "delete") {
      const where = buildWhere(filters);
      const before = db
        .prepare(`SELECT * FROM "${table}"${where.sql}`)
        .all(...where.params);
      db.prepare(`DELETE FROM "${table}"${where.sql}`).run(...where.params);
      before.forEach((row) =>
        getIO()?.emit(`db:${table}`, { eventType: "DELETE", old: row, table })
      );
      return res.json({ data: before });
    }

    return res.status(400).json({ error: `Unsupported method: ${method}` });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
