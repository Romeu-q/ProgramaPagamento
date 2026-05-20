import { supabase } from "../_lib/supabase.js";
import { json, readBody } from "../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { detail: "Metodo nao permitido." });
  const { cpf, password } = readBody(req);
  const cleanCpf = String(cpf || "").replace(/\D/g, "");

  const { data: user, error } = await supabase
    .from("users")
    .select("cpf,is_adult,is_email_verified")
    .eq("cpf", cleanCpf)
    .eq("password", String(password || ""))
    .maybeSingle();

  if (error || !user) return json(res, 401, { detail: "Credenciais invalidas." });
  if (!user.is_email_verified) return json(res, 403, { detail: "Confirme seu email antes de entrar." });

  return json(res, 200, { access_token: `TOKEN_BLE_${user.cpf}`, is_adult: Boolean(user.is_adult) });
}
