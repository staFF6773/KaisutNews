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
    isAdmin?: boolean;
    avatar?: string; // Added avatar to session interface
  }
}

// Definir tipo para usuario de la base de datos
interface User {
  id: number;
  username: string;
  password_hash: string;
  is_admin: number;
  avatar?: string; // Added avatar to user interface
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

// Middleware para proteger rutas solo para administradores
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !req.session.userId) {
    return res.status(403).send("Acceso solo para administradores");
  }
  const db = new sqlite3.Database(join(process.cwd(), "db", "anime_news.db"));
  db.get("SELECT is_admin FROM users WHERE id = ?", [req.session.userId], (err, row: any) => {
    if (row && row.is_admin) {
      next();
    } else {
      res.status(403).send("Acceso solo para administradores");
    }
  });
}

// Registro
router.get("/register", redirectIfAuthenticated, (req, res) => {
  res.render("auth/register", { error: null });
});

router.post("/register", redirectIfAuthenticated, (req, res) => {
  const { username, password, avatar } = req.body;
  if (!username || !password) {
    return res.render("auth/register", { error: "Completa todos los campos." });
  }
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) return res.render("auth/register", { error: "Error interno." });
    db.run(
      "INSERT INTO users (username, password_hash, avatar) VALUES (?, ?, ?)",
      [username, hash, avatar || "avatar1.webp"],
      function (err) {
        if (err) {
          if (err.message.includes("UNIQUE")) {
            return res.render("auth/register", { error: "El nombre de usuario ya está registrado." });
          }
          return res.render("auth/register", { error: "Error interno." });
        }
        req.session.userId = this.lastID;
        req.session.avatar = avatar || "avatar1.webp";
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
  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    const u = user as any;
    if (err || !u) {
      return res.render("auth/login", { error: "Credenciales inválidas." });
    }
    bcrypt.compare(password, u.password_hash, (err, result) => {
      if (result) {
        req.session.userId = u.id;
        req.session.isAdmin = !!u.is_admin;
        req.session.avatar = u.avatar || "avatar1.webp";
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

// Listar usuarios (solo admin)
router.get("/admin/users", requireAdmin, (req, res) => {
  db.all("SELECT id, username, is_admin FROM users ORDER BY id", (err, users) => {
    if (err) return res.status(500).send("Error en la base de datos");
    res.render("admin/users", { users });
  });
});

// Borrar usuario (solo admin, no puede borrarse a sí mismo)
router.post("/admin/users/:id/delete", requireAdmin, (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (userId === req.session.userId) {
    return res.status(400).send("No puedes borrarte a ti mismo.");
  }
  // Verifica si el usuario a borrar es admin
  const db = new sqlite3.Database(join(process.cwd(), "db", "anime_news.db"));
  db.get("SELECT is_admin FROM users WHERE id = ?", [userId], (err, row: any) => {
    if (row && row.is_admin) {
      return res.status(400).send("No puedes borrar a otro administrador.");
    }
    db.run("DELETE FROM users WHERE id = ?", [userId], (err) => {
      if (err) return res.status(500).send("Error al borrar usuario");
      res.redirect("/admin/users");
    });
  });
});

export default router; 