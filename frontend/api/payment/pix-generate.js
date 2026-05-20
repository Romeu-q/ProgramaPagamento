import { supabase } from "../_lib/supabase.js";
import { json, readBody } from "../_lib/http.js";
import { mpRequest } from "../_lib/mercadopago.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { detail: "Metodo nao permitido." });
  const { total_amount, items, payer_email } = readBody(req);
  if (!Array.isArray(items) || items.length === 0) return json(res, 400, { detail: "Carrinho vazio." });

  const reservationItems = [];
  for (const item of items) {
    const productId = Number(item.product_id);
    const quantity = Number(item.quantity || 0);
    if (!productId || quantity <= 0) return json(res, 400, { detail: "Quantidade invalida no carrinho." });

    const { data: product } = await supabase.from("products").select("*").eq("id", productId).maybeSingle();
    if (!product) return json(res, 404, { detail: `Produto ${productId} nao encontrado.` });
    if (Number(product.quantity) < quantity) {
      return json(res, 409, { detail: `Estoque insuficiente para ${product.name}. Disponivel: ${product.quantity}` });
    }

    reservationItems.push({
      product_id: product.id,
      ean: product.ean,
      name: product.name,
      quantity,
      current_quantity: Number(product.quantity),
    });
  }

  const baseUrl = process.env.PUBLIC_API_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  const externalReference = crypto.randomUUID();
  const metadata = {
    cart_items: reservationItems,
    total_amount: Number(total_amount || 0),
  };

  try {
    const payment = await mpRequest("/v1/payments", {
      method: "POST",
      body: {
        transaction_amount: Number(total_amount || 0),
        description: "Compra MercadoSmart",
        payment_method_id: "pix",
        payer: {
          email: payer_email || "comprador@mercadosmart.app",
        },
        notification_url: baseUrl ? `${baseUrl}/api/webhooks/mercadopago` : undefined,
        external_reference: externalReference,
        metadata,
      },
    });

    const qrCode = payment?.point_of_interaction?.transaction_data?.qr_code || "";
    const qrCodeBase64 = payment?.point_of_interaction?.transaction_data?.qr_code_base64 || "";

    return json(res, 200, {
      payment_id: String(payment.id),
      qr_code_base64: qrCodeBase64,
      pix_copia_e_cola: qrCode,
      amount: Number(total_amount || 0),
      deducted_items: [],
      status: payment.status,
      status_detail: payment.status_detail,
      message: "Pagamento PIX gerado. O estoque será baixado após aprovação.",
    });
  } catch (error) {
    return json(res, 502, { detail: `Falha ao criar PIX no Mercado Pago: ${error.message}` });
  }
}
