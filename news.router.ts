import { Router } from "express";
import { join } from "path";
import sqlite3 from "sqlite3";
import { requireAuth } from "./auth.router";
import { requireAdmin } from "./auth.router";

const router = Router();

// Conexión a SQLite (igual que en index.ts)
const db = new sqlite3.Database(join(process.cwd(), "db", "anime_news.db"));

// Ruta principal: lista de noticias
router.get("/", (req, res) => {
  db.all("SELECT * FROM news ORDER BY date DESC", (err, news) => {
    if (err) return res.status(500).send("Error en la base de datos");
    res.render("anime/index", { animes: news });
  });
});

// Formulario para nueva noticia (solo admin)
router.get("/new", requireAdmin, (req, res) => {
  res.render("anime/new");
});

// Guardar nueva noticia (solo admin)
router.post("/new", requireAdmin, (req, res) => {
  const { title, content, image } = req.body;
  const date = new Date().toISOString();
  db.run(
    "INSERT INTO news (title, content, date, image) VALUES (?, ?, ?, ?)",
    [title, content, date, image || null],
    (err) => {
      if (err) return res.status(500).send("Error al guardar la noticia");
      res.redirect("/");
    }
  );
});

// Mostrar detalle de una noticia
router.get("/news/:id", (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM news WHERE id = ?", [id], (err, noticia) => {
    if (err) return res.status(500).send("Error en la base de datos");
    if (!noticia) return res.status(404).send("Noticia no encontrada");
    res.render("anime/detail", { anime: noticia });
  });
});

// Borrar noticia (solo admin)
router.post("/news/:id/delete", requireAdmin, (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM news WHERE id = ?", [id], (err) => {
    if (err) return res.status(500).send("Error al borrar la noticia");
    res.redirect("/");
  });
});

export default router; 
