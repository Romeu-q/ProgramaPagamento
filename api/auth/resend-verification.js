import { supabase } from "../_lib/supabase.js";
import { json } from "../_lib/http.js";
import { generateVerificationCode, sendEmail } from "../_lib/email.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { detail: "Metodo nao permitido." });
  const cpf = String(req.query.cpf || "").replace(/\D/g, "");
  if (!cpf) return json(res, 400, { detail: "CPF obrigatorio." });

  const { data: user } = await supabase
    .from("users")
    .select("id,email")
    .eq("cpf", cpf)
    .maybeSingle();

  if (!user) return json(res, 404, { detail: "CPF nao encontrado." });

  const code = generateVerificationCode();
  const { error } = await supabase
    .from("users")
    .update({ email_verification_code: code, is_email_verified: false })
    .eq("id", user.id);
  if (error) return json(res, 500, { detail: "Falha ao atualizar codigo." });

  try {
    await sendEmail(user.email, "Novo codigo de verificacao MercadoSmart", `Seu novo codigo: ${code}`);
  } catch {
    return json(res, 503, { detail: "Codigo atualizado, mas o servidor nao conseguiu enviar o email." });
  }
  return json(res, 200, { status: "ok", message: "Codigo reenviado para o email cadastrado." });
}
