import { supabase } from "../_lib/supabase.js";
import { json } from "../_lib/http.js";

const TEST_STOCK_ITEMS = [
  { name: "Agua Mineral 500ml", ean: "7891000100101", selling_price: 3.5, cost_price: 1.8, quantity: 30, min_stock: 5, is_age_restricted: false },
  { name: "Refrigerante Lata 350ml", ean: "7891000100200", selling_price: 6.0, cost_price: 3.1, quantity: 25, min_stock: 5, is_age_restricted: false },
  { name: "Salgadinho 90g", ean: "7891000100309", selling_price: 7.5, cost_price: 4.0, quantity: 20, min_stock: 4, is_age_restricted: false },
  { name: "Chocolate Barra 90g", ean: "7891000100408", selling_price: 5.5, cost_price: 2.9, quantity: 15, min_stock: 3, is_age_restricted: false },
  { name: "Cerveja Lata 350ml", ean: "7891000100507", selling_price: 8.0, cost_price: 4.2, quantity: 18, min_stock: 5, is_age_restricted: true }
];

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { detail: "Metodo nao permitido." });
  let created = 0;
  for (const item of TEST_STOCK_ITEMS) {
    const { data: existing } = await supabase.from("products").select("id").eq("ean", item.ean).maybeSingle();
    if (existing) continue;
    const { error } = await supabase.from("products").insert(item);
    if (!error) created += 1;
  }
  return json(res, 200, { status: "ok", created, total_catalog: TEST_STOCK_ITEMS.length });
}
