import { supabase } from "../_lib/supabase.js";
import { json, readBody } from "../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { detail: "Metodo nao permitido." });
  const { cpf, verification_code } = readBody(req);
  const cleanCpf = String(cpf || "").replace(/\D/g, "");

  const { data: user } = await supabase
    .from("users")
    .select("id,is_email_verified,email_verification_code")
    .eq("cpf", cleanCpf)
    .maybeSingle();

  if (!user) return json(res, 404, { detail: "CPF nao encontrado." });
  if (user.is_email_verified) return json(res, 200, { status: "ok", message: "Email ja confirmado." });
  if (String(user.email_verification_code || "") !== String(verification_code || "")) {
    return json(res, 400, { detail: "Codigo de verificacao invalido." });
  }

  const { error } = await supabase
    .from("users")
    .update({ is_email_verified: true, email_verification_code: null })
    .eq("id", user.id);
  if (error) return json(res, 500, { detail: "Falha ao confirmar email." });

  return json(res, 200, { status: "ok", message: "Email confirmado com sucesso." });
}
