import { supabase } from "../_lib/supabase.js";
import { json, readBody } from "../_lib/http.js";

function isAuthorized(req) {
  const expected = process.env.ADMIN_API_KEY || "";
  if (!expected) return true;
  return req.headers["x-admin-key"] === expected;
}

function extractTag(text, tag) {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = text.match(regex);
  return match ? match[1].trim() : "";
}

function toNumber(value) {
  return Number(String(value || "0").replace(",", "."));
}

function parseNfeProducts(xml) {
  const details = [...xml.matchAll(/<det[\s\S]*?<\/det>/gi)].map((match) => match[0]);
  return details.map((det, index) => {
    const prod = extractTag(det, "prod") || det;
    const ean = extractTag(prod, "cEAN") || extractTag(prod, "cEANTrib");
    const name = extractTag(prod, "xProd");
    const qty = toNumber(extractTag(prod, "qCom"));
    const unitCost = toNumber(extractTag(prod, "vUnCom"));
    const total = toNumber(extractTag(prod, "vProd"));
    const fallbackEan = `SUPP-${Date.now()}-${index + 1}`;

    return {
      name: name || `Produto ${index + 1}`,
      ean: ean && ean !== "SEM GTIN" ? ean : fallbackEan,
      quantity: Math.max(0, Math.round(qty || 0)),
      cost_price: unitCost || 0,
      selling_price: unitCost > 0 ? Number((unitCost * 1.35).toFixed(2)) : total > 0 ? Number((total * 1.35).toFixed(2)) : 0,
      min_stock: 5,
      is_age_restricted: false,
      image_url: null,
    };
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { detail: "Metodo nao permitido." });
  if (!isAuthorized(req)) return json(res, 401, { detail: "Nao autorizado." });

  const { xml, supplier_name } = readBody(req);
  if (!xml || typeof xml !== "string") return json(res, 400, { detail: "XML obrigatorio." });

  const parsed = parseNfeProducts(xml).filter((item) => item.name && item.ean);
  if (parsed.length === 0) return json(res, 400, { detail: "Nenhum produto válido encontrado no XML." });

  let created = 0;
  let updated = 0;
  const errors = [];

  for (const item of parsed) {
    const { data: existing } = await supabase.from("products").select("*").eq("ean", item.ean).maybeSingle();

    if (existing) {
      const payload = {
        name: item.name || existing.name,
        cost_price: item.cost_price || existing.cost_price,
        selling_price: item.selling_price || existing.selling_price,
        quantity: Number(existing.quantity || 0) + Number(item.quantity || 0),
        supplier_name: supplier_name || existing.supplier_name || null,
      };
      const { error } = await supabase.from("products").update(payload).eq("id", existing.id);
      if (error) errors.push({ ean: item.ean, reason: error.message });
      else updated += 1;
    } else {
      const payload = { ...item, supplier_name: supplier_name || null };
      const { error } = await supabase.from("products").insert(payload);
      if (error) errors.push({ ean: item.ean, reason: error.message });
      else created += 1;
    }
  }

  return json(res, 200, {
    status: "ok",
    parsed: parsed.length,
    created,
    updated,
    errors,
  });
}
