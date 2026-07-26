const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuid } = require("uuid");
const db = require("../database/init");
const config = require("../config");

function sign(user) {
  return jwt.sign({ id: user.id, email: user.email }, config.jwtSecret, {
    expiresIn: "7d",
  });
}

function toClient(user) {
  return {
    id: user.id,
    email: user.email,
    user_metadata: { full_name: user.full_name || "" },
  };
}

exports.register = (req, res) => {
  const { email, password, full_name } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) return res.status(409).json({ error: "Email already registered" });
  const id = uuid();
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(
    "INSERT INTO users (id, email, password_hash, full_name) VALUES (?, ?, ?, ?)"
  ).run(id, email, hash, full_name || null);
  db.prepare(
    "INSERT INTO profiles (id, email, full_name) VALUES (?, ?, ?)"
  ).run(id, email, full_name || null);
  const user = { id, email, full_name };
  return res.json({ user: toClient(user), token: sign(user) });
};

exports.login = (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!row || !bcrypt.compareSync(password, row.password_hash))
    return res.status(401).json({ error: "Invalid email or password" });
  return res.json({ user: toClient(row), token: sign(row) });
};

exports.me = (req, res) => {
  const row = db.prepare("SELECT id, email, full_name FROM users WHERE id = ?").get(req.user.id);
  if (!row) return res.status(404).json({ error: "User not found" });
  return res.json({ user: toClient(row) });
};

exports.update = (req, res) => {
  const { password, data } = req.body || {};
  if (password) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, req.user.id);
  }
  if (data && data.full_name) {
    db.prepare("UPDATE users SET full_name = ? WHERE id = ?").run(data.full_name, req.user.id);
    db.prepare("UPDATE profiles SET full_name = ? WHERE id = ?").run(data.full_name, req.user.id);
  }
  const row = db.prepare("SELECT id, email, full_name FROM users WHERE id = ?").get(req.user.id);
  return res.json({ user: toClient(row) });
};
