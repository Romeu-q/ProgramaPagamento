import { supabase } from "../_lib/supabase.js";
import { json, readBody } from "../_lib/http.js";
import { generateVerificationCode, sendEmail } from "../_lib/email.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { detail: "Metodo nao permitido." });

  const { cpf, email, password, marketing_opt_in = false } = readBody(req);
  if (!cpf || !email || !password) return json(res, 400, { detail: "CPF, email e senha sao obrigatorios." });

  const cleanCpf = String(cpf).replace(/\D/g, "");
  if (cleanCpf.length !== 11) return json(res, 400, { detail: "CPF invalido." });

  const { data: existingCpf } = await supabase.from("users").select("id").eq("cpf", cleanCpf).maybeSingle();
  if (existingCpf) return json(res, 400, { detail: "CPF ja cadastrado." });

  const { data: existingEmail } = await supabase.from("users").select("id").eq("email", String(email).toLowerCase()).maybeSingle();
  if (existingEmail) return json(res, 400, { detail: "Email ja cadastrado." });

  const code = generateVerificationCode();
  const { error } = await supabase.from("users").insert({
    cpf: cleanCpf,
    email: String(email).toLowerCase(),
    password,
    is_adult: !cleanCpf.startsWith("000"),
    is_email_verified: false,
    email_verification_code: code,
    marketing_opt_in: Boolean(marketing_opt_in),
  });
  if (error) return json(res, 500, { detail: "Falha ao criar usuario." });

  try {
    await sendEmail(String(email).toLowerCase(), "Confirme seu cadastro no MercadoSmart", `Seu codigo de verificacao: ${code}`);
  } catch {
    await supabase.from("users").delete().eq("cpf", cleanCpf);
    return json(res, 503, { detail: "Servidor sem envio de email no momento. Tente novamente em instantes." });
  }

  return json(res, 200, { status: "pending_verification", message: "Cadastro criado. Verifique seu email para ativar a conta." });
}
