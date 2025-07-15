import express from "express";
import { join } from "path";
import sqlite3 from "sqlite3";
import { existsSync, mkdirSync } from "fs";
import newsRouter from "./news.router";
import session from "express-session";
import authRouter from "./auth.router";

const app = express();
const PORT = 3000;

// Servir archivos estáticos desde 'public'
app.use(express.static(join(process.cwd(), 'public')));

// Configuración de EJS
app.set("view engine", "ejs");
app.set("views", join(process.cwd(), "views"));

// Middleware para parsear formularios
app.use(express.urlencoded({ extended: true }));

// Configuración de sesión
app.use(session({
  secret: 'cambia_esto_por_un_secreto_muy_largo_y_unico',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true }
}));

// Middleware para exponer el usuario actual a las vistas EJS
app.use((req, res, next) => {
  if (req.session.userId) {
    const db = new sqlite3.Database(join(process.cwd(), "db", "anime_news.db"));
    db.get("SELECT username, is_admin, avatar FROM users WHERE id = ?", [req.session.userId], (err, row: any) => {
      res.locals.user = {
        id: req.session.userId,
        isAdmin: row && row.is_admin ? !!row.is_admin : false,
        username: row && row.username ? row.username : null,
        avatar: row && row.avatar ? row.avatar : "avatar1.webp"
      };
      next();
    });
  } else {
    res.locals.user = null;
    next();
  }
});

// Rutas de autenticación
app.use(authRouter);

// Usar el router de noticias
app.use("/", newsRouter);

// Asegurar que la carpeta db exista
const dbDir = join(process.cwd(), "db");
if (!existsSync(dbDir)) {
  mkdirSync(dbDir);
}

// Conexión a SQLite
const db = new sqlite3.Database(join(dbDir, "anime_news.db"), (err) => {
  if (err) throw err;
  db.run(`CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    date TEXT NOT NULL,
    image TEXT
  )`, () => {
    // Asegura que la columna author_id exista
    db.all("PRAGMA table_info(news)", (err, columns) => {
      if (columns && Array.isArray(columns) && !columns.some((col: any) => col.name === 'author_id')) {
        db.run("ALTER TABLE news ADD COLUMN author_id INTEGER");
      }
    });
  });
  // Crear tabla de usuarios si no existe
  // username es único y requerido
  // password_hash es requerido
  // id es autoincremental
  // Puedes agregar más campos si lo deseas
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0
  )`, () => {
    // Asegura que la columna avatar exista
    db.all("PRAGMA table_info(users)", (err, columns) => {
      if (columns && Array.isArray(columns) && !columns.some((col: any) => col.name === 'avatar')) {
        db.run("ALTER TABLE users ADD COLUMN avatar TEXT");
      }
    });
  });
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
}); 