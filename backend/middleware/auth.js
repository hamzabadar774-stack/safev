const jwt = require("jsonwebtoken");
const config = require("../config");

function requireAuth(req, res, next) {
  const h = req.headers.authorization || "";
  const tok = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!tok) return res.status(401).json({ error: "No authorization token" });
  try {
    req.user = jwt.verify(tok, config.jwtSecret);
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// Non-strict — attaches req.user if a valid token is present but never rejects.
function optionalAuth(req, _res, next) {
  const h = req.headers.authorization || "";
  const tok = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (tok) {
    try { req.user = jwt.verify(tok, config.jwtSecret); } catch {}
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
