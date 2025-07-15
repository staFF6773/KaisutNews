import express from "express";
import { join } from "path";
import sqlite3 from "sqlite3";
import { existsSync, mkdirSync } from "fs";
import newsRouter from "./news.router";

const app = express();
const PORT = 3000;

// Servir archivos estáticos desde 'public'
app.use(express.static(join(process.cwd(), 'public')));

// Configuración de EJS
app.set("view engine", "ejs");
app.set("views", join(process.cwd(), "views"));

// Middleware para parsear formularios
app.use(express.urlencoded({ extended: true }));

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
  )`);
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
}); 
