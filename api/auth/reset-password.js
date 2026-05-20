import { supabase } from "../_lib/supabase.js";
import { json, readBody } from "../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { detail: "Metodo nao permitido." });
  const { cpf, new_password } = readBody(req);
  const cleanCpf = String(cpf || "").replace(/\D/g, "");
  if (!cleanCpf || String(new_password || "").length < 4) return json(res, 400, { detail: "Dados invalidos." });

  const { data: user } = await supabase.from("users").select("id").eq("cpf", cleanCpf).maybeSingle();
  if (!user) return json(res, 404, { detail: "CPF nao encontrado." });

  const { error } = await supabase.from("users").update({ password: String(new_password) }).eq("id", user.id);
  if (error) return json(res, 500, { detail: "Falha ao atualizar senha." });

  return json(res, 200, { status: "ok", message: "Senha atualizada com sucesso." });
}
