import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import session from "express-session";
import sqlite3 from "sqlite3";
import { join } from "path";

const db = new sqlite3.Database(join(process.cwd(), "db", "anime_news.db"));
const router = Router();

// Extender la sesión para incluir userId
declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}

// Definir tipo para usuario de la base de datos
interface User {
  id: number;
  username: string;
  password_hash: string;
}

// Middleware para proteger rutas
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.redirect("/login");
  }
}

// Middleware para evitar acceso a login/register si ya está autenticado
function redirectIfAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.userId) {
    return res.redirect("/");
  }
  next();
}

// Registro
router.get("/register", redirectIfAuthenticated, (req, res) => {
  res.render("auth/register", { error: null });
});

router.post("/register", redirectIfAuthenticated, (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.render("auth/register", { error: "Completa todos los campos." });
  }
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) return res.render("auth/register", { error: "Error interno." });
    db.run(
      "INSERT INTO users (username, password_hash) VALUES (?, ?)",
      [username, hash],
      function (err) {
        if (err) {
          if (err.message.includes("UNIQUE")) {
            return res.render("auth/register", { error: "El nombre de usuario ya está registrado." });
          }
          return res.render("auth/register", { error: "Error interno." });
        }
        req.session.userId = this.lastID;
        res.redirect("/");
      }
    );
  });
});

// Login
router.get("/login", redirectIfAuthenticated, (req, res) => {
  res.render("auth/login", { error: null });
});

router.post("/login", redirectIfAuthenticated, (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.render("auth/login", { error: "Completa todos los campos." });
  }
  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user: User) => {
    if (err || !user) {
      return res.render("auth/login", { error: "Credenciales inválidas." });
    }
    bcrypt.compare(password, user.password_hash, (err, result) => {
      if (result) {
        req.session.userId = user.id;
        res.redirect("/");
      } else {
        res.render("auth/login", { error: "Credenciales inválidas." });
      }
    });
  });
});

// Logout
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

export default router; 
