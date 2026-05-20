import { supabase } from "../_lib/supabase.js";
import { json, readBody } from "../_lib/http.js";

function isAuthorized(req) {
  const expected = process.env.ADMIN_API_KEY || "";
  if (!expected) return true;
  return req.headers["x-admin-key"] === expected;
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    if (!isAuthorized(req)) return json(res, 401, { detail: "Nao autorizado." });
    const { data, error } = await supabase.from("products").select("*").order("id", { ascending: true });
    if (error) return json(res, 500, { detail: "Falha ao buscar produtos." });
    return json(res, 200, data);
  }

  if (req.method === "POST") {
    if (!isAuthorized(req)) return json(res, 401, { detail: "Nao autorizado." });
    const body = readBody(req);
    const payload = {
      name: String(body.name || ""),
      ean: String(body.ean || ""),
      selling_price: Number(body.selling_price || 0),
      cost_price: Number(body.cost_price || 0),
      quantity: Number(body.quantity || 0),
      min_stock: Number(body.min_stock || 5),
      image_url: body.image_url ? String(body.image_url) : null,
      supplier_name: body.supplier_name ? String(body.supplier_name) : null,
      is_age_restricted: Boolean(body.is_age_restricted),
    };
    if (!payload.name || !payload.ean) return json(res, 400, { detail: "Nome e EAN obrigatorios." });
    const { data, error } = await supabase.from("products").insert(payload).select("*").single();
    if (error) return json(res, 500, { detail: "Falha ao criar produto." });
    return json(res, 201, data);
  }

  return json(res, 405, { detail: "Metodo nao permitido." });
}
