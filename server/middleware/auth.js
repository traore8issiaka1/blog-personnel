import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [prefix, token] = header.split(" ");
  if (prefix !== "Bearer" || !token) {
    return res.status(401).json({ error: "Token manquant." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
    req.userId = payload.userId;
    return next();
  } catch {
    return res.status(401).json({ error: "Token invalide." });
  }
}
