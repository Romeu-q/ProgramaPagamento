import { supabase } from "../_lib/supabase.js";
import { json, readBody } from "../_lib/http.js";

function isAuthorized(req) {
  const expected = process.env.ADMIN_API_KEY || "";
  if (!expected) return true;
  return req.headers["x-admin-key"] === expected;
}

export default async function handler(req, res) {
  if (!isAuthorized(req)) return json(res, 401, { detail: "Nao autorizado." });
  const id = Number(req.query.id);
  if (!id) return json(res, 400, { detail: "ID invalido." });

  if (req.method === "PATCH") {
    const body = readBody(req);
    const payload = {};
    for (const key of ["name", "ean", "selling_price", "cost_price", "quantity", "min_stock", "is_age_restricted"]) {
      if (body[key] !== undefined) payload[key] = body[key];
    }
    const { data, error } = await supabase.from("products").update(payload).eq("id", id).select("*").single();
    if (error) return json(res, 500, { detail: "Falha ao atualizar produto." });
    return json(res, 200, data);
  }

  return json(res, 405, { detail: "Metodo nao permitido." });
}
