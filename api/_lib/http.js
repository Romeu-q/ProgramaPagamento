export function json(res, status, data) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(data));
}

export function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (!req.body) return {};
  try {
    return JSON.parse(req.body);
  } catch {
    return {};
  }
}
