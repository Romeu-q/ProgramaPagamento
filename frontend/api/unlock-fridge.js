import { json } from "./_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { detail: "Metodo nao permitido." });
  return json(res, 200, {
    status: "success",
    message: "Sinal de destravamento enviado",
    payload: { command: "UNLOCK", device_id: "fridge_01", duration_seconds: 10 },
  });
}
