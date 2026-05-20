import { supabase } from "../_lib/supabase.js";
import { json, readBody } from "../_lib/http.js";
import { mpRequest } from "../_lib/mercadopago.js";

async function deductStockFromMetadata(metadata) {
  const items = Array.isArray(metadata?.cart_items) ? metadata.cart_items : [];
  for (const item of items) {
    const productId = Number(item.product_id);
    const qty = Number(item.quantity || 0);
    if (!productId || qty <= 0) continue;

    const { data: product } = await supabase.from("products").select("id,quantity").eq("id", productId).maybeSingle();
    if (!product) continue;
    if (Number(product.quantity) < qty) continue;

    const nextQty = Number(product.quantity) - qty;
    await supabase.from("products").update({ quantity: nextQty }).eq("id", productId);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { detail: "Metodo nao permitido." });

  const body = readBody(req);
  const paymentId = req.query?.["data.id"] || body?.data?.id || body?.id;
  const eventType = req.query?.type || body?.type;

  if (!paymentId || eventType !== "payment") return json(res, 200, { status: "ignored" });

  try {
    const payment = await mpRequest(`/v1/payments/${paymentId}`);
    if (payment?.status === "approved") {
      await deductStockFromMetadata(payment?.metadata);
    }
    return json(res, 200, { status: "ok", payment_status: payment?.status || "unknown" });
  } catch (error) {
    return json(res, 500, { detail: `Erro no webhook Mercado Pago: ${error.message}` });
  }
}
