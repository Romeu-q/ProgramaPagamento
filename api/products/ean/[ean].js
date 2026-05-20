import { supabase } from "../../_lib/supabase.js";
import { json } from "../../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { detail: "Metodo nao permitido." });
  const { ean } = req.query;
  const { data: product } = await supabase.from("products").select("*").eq("ean", String(ean)).maybeSingle();
  if (!product) return json(res, 404, { detail: "Produto nao encontrado" });
  return json(res, 200, product);
}
