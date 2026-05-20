import { supabase } from "../_lib/supabase.js";
import { json, readBody } from "../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { detail: "Metodo nao permitido." });
  const { total_amount, items } = readBody(req);
  if (!Array.isArray(items) || items.length === 0) return json(res, 400, { detail: "Carrinho vazio." });

  const deductedItems = [];
  for (const item of items) {
    const productId = Number(item.product_id);
    const quantity = Number(item.quantity || 0);
    if (!productId || quantity <= 0) return json(res, 400, { detail: "Quantidade invalida no carrinho." });

    const { data: product } = await supabase.from("products").select("*").eq("id", productId).maybeSingle();
    if (!product) return json(res, 404, { detail: `Produto ${productId} nao encontrado.` });
    if (Number(product.quantity) < quantity) {
      return json(res, 409, { detail: `Estoque insuficiente para ${product.name}. Disponivel: ${product.quantity}` });
    }

    const newQty = Number(product.quantity) - quantity;
    const { error } = await supabase.from("products").update({ quantity: newQty }).eq("id", productId);
    if (error) return json(res, 500, { detail: "Falha ao atualizar estoque." });

    deductedItems.push({
      product_id: product.id,
      ean: product.ean,
      quantity,
      remaining_quantity: newQty,
    });
  }

  return json(res, 200, {
    payment_id: crypto.randomUUID(),
    qr_code_base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    pix_copia_e_cola: `00020101021226...MOCK_PAYLOAD...${Number(total_amount || 0).toFixed(2)}`,
    amount: Number(total_amount || 0),
    deducted_items: deductedItems,
  });
}
