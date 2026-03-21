import { Router } from "express";
import { join } from "path";
import sqlite3 from "sqlite3";
import { requireAuth } from "./auth.router";
import { requireAdmin } from "./auth.router";

const router = Router();

// Conexión a SQLite (igual que en index.ts)
const db = new sqlite3.Database(join(process.cwd(), "db", "anime_news.db"));

// Crear tabla de noticias pendientes si no existe
db.run(`CREATE TABLE IF NOT EXISTS pending_news (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  date TEXT NOT NULL,
  image TEXT,
  author_id INTEGER NOT NULL,
  estado TEXT NOT NULL CHECK(estado IN ('pendiente', 'aprobada', 'rechazada')),
  FOREIGN KEY(author_id) REFERENCES users(id)
)`);

// Crear tabla de comentarios si no existe
db.run(`CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  news_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  date TEXT NOT NULL,
  FOREIGN KEY(news_id) REFERENCES news(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id)
)`);


// Ruta principal: lista de noticias
router.get("/", (req, res) => {
  db.all(
    `SELECT news.*, users.username as author, users.avatar as author_avatar
     FROM news LEFT JOIN users ON news.author_id = users.id
     ORDER BY news.date DESC`,
    (err, news) => {
      if (err) return res.status(500).send("Error en la base de datos");
      const destacada = news.length > 0 ? news[0] : null;
      const ultimas = news.length > 1 ? news.slice(1) : [];
      res.render("anime/index", { destacada, ultimas });
    }
  );
});

// Perfil público de usuario
router.get("/user/:username", (req, res) => {
  const { username } = req.params;
  db.get(
    "SELECT id, username, avatar, is_admin FROM users WHERE username = ?",
    [username],
    (err, author: any) => {
      if (err) return res.status(500).send("Error en la base de datos");
      if (!author) return res.status(404).render("anime/404", { message: "Usuario no encontrado" });
      db.all(
        `SELECT * FROM news WHERE author_id = ? ORDER BY date DESC`,
        [author.id],
        (err2, articles) => {
          if (err2) return res.status(500).send("Error en la base de datos");
          res.render("user/profile", { author, articles });
        }
      );
    }
  );
});

// Formulario para nueva noticia (usuarios normales)
router.get("/submit", requireAuth, (req, res) => {
  res.render("anime/new", { isPending: true });
});

// Guardar noticia pendiente (usuarios normales)
router.post("/submit", requireAuth, (req, res) => {
  const { title, content, image } = req.body;
  const date = new Date().toISOString();
  const author_id = req.session.userId;
  const estado = "pendiente";
  db.run(
    "INSERT INTO pending_news (title, content, date, image, author_id, estado) VALUES (?, ?, ?, ?, ?, ?)",
    [title, content, date, image || null, author_id, estado],
    (err) => {
      if (err) return res.status(500).send("Error al guardar la noticia pendiente");
      res.send("Noticia enviada y pendiente de aprobación por un administrador.");
    }
  );
});

// Vista de noticias pendientes (solo admin)
router.get("/admin/pending-news", requireAdmin, (req, res) => {
  db.all(
    `SELECT pending_news.*, users.username as author FROM pending_news JOIN users ON pending_news.author_id = users.id WHERE estado = 'pendiente' ORDER BY date DESC`,
    (err, news) => {
      if (err) return res.status(500).send("Error en la base de datos");
      res.render("admin/pending_news", { news });
    }
  );
});

// Aprobar noticia (solo admin)
router.post("/admin/pending-news/:id/approve", requireAdmin, (req, res) => {
  const id = req.params.id;
  // Obtener la noticia pendiente junto con el autor
  db.get("SELECT pending_news.*, users.username as author, users.avatar as author_avatar FROM pending_news JOIN users ON pending_news.author_id = users.id WHERE pending_news.id = ?", [id], (err, noticia) => {
    if (err || !noticia) return res.status(404).send("Noticia no encontrada");
    const n = noticia as { title: string; content: string; date: string; image?: string; author_id: number };
    // Insertar en news con author_id
    db.run(
      "INSERT INTO news (title, content, date, image, author_id) VALUES (?, ?, ?, ?, ?)",
      [n.title, n.content, n.date, n.image, n.author_id],
      (err) => {
        if (err) return res.status(500).send("Error al aprobar la noticia");
        // Marcar como aprobada
        db.run(
          "UPDATE pending_news SET estado = 'aprobada' WHERE id = ?",
          [id],
          (err) => {
            if (err) return res.status(500).send("Error al actualizar estado");
            res.redirect("/admin/pending-news");
          }
        );
      }
    );
  });
});

// Rechazar noticia (solo admin)
router.post("/admin/pending-news/:id/reject", requireAdmin, (req, res) => {
  const id = req.params.id;
  db.run(
    "UPDATE pending_news SET estado = 'rechazada' WHERE id = ?",
    [id],
    (err) => {
      if (err) return res.status(500).send("Error al rechazar la noticia");
      res.redirect("/admin/pending-news");
    }
  );
});

// Formulario para nueva noticia (solo admin)
router.get("/new", requireAdmin, (req, res) => {
  res.render("anime/new", { isPending: false });
});

// Guardar nueva noticia (solo admin)
router.post("/new", requireAdmin, (req, res) => {
  const { title, content, image } = req.body;
  const date = new Date().toISOString();
  const author_id = req.session.userId;
  db.run(
    "INSERT INTO news (title, content, date, image, author_id) VALUES (?, ?, ?, ?, ?)",
    [title, content, date, image || null, author_id],
    (err) => {
      if (err) return res.status(500).send("Error al guardar la noticia");
      res.redirect("/");
    }
  );
});

// Búsqueda de noticias
router.get("/search", (req, res) => {
  const q = (req.query.q as string || "").trim();
  if (!q) return res.redirect("/");

  const pattern = `%${q}%`;
  db.all(
    `SELECT news.*, users.username as author
     FROM news LEFT JOIN users ON news.author_id = users.id
     WHERE news.title LIKE ? OR news.content LIKE ?
     ORDER BY date DESC`,
    [pattern, pattern],
    (err, results) => {
      if (err) return res.status(500).send("Error en la base de datos");
      res.render("anime/search", { query: q, results });
    }
  );
});

// Mostrar detalle de una noticia con autor, avatar y comentarios
router.get("/news/:id", (req, res) => {
  const { id } = req.params;
  db.get(
    `SELECT news.*, users.username as author, users.avatar as author_avatar
     FROM news LEFT JOIN users ON news.author_id = users.id
     WHERE news.id = ?`,
    [id],
    (err, noticia) => {
      if (err) return res.status(500).send("Error en la base de datos");
      if (!noticia) return res.status(404).send("Noticia no encontrada");
      db.all(
        `SELECT comments.*, users.username as commenter, users.avatar as commenter_avatar
         FROM comments
         JOIN users ON comments.user_id = users.id
         WHERE comments.news_id = ?
         ORDER BY comments.date ASC`,
        [id],
        (err2, comments) => {
          if (err2) return res.status(500).send("Error en la base de datos");
          res.render("anime/detail", { anime: noticia, comments: comments || [] });
        }
      );
    }
  );
});

// Publicar comentario (requiere autenticación)
router.post("/news/:id/comment", requireAuth, (req, res) => {
  const { id } = req.params;
  const content = (req.body.content || "").trim();
  if (!content) return res.redirect(`/news/${id}`);
  const date = new Date().toISOString();
  db.run(
    "INSERT INTO comments (news_id, user_id, content, date) VALUES (?, ?, ?, ?)",
    [id, req.session.userId, content, date],
    (err) => {
      if (err) return res.status(500).send("Error al guardar el comentario");
      res.redirect(`/news/${id}#comentarios`);
    }
  );
});

// Borrar comentario (solo admin)
router.post("/news/:id/comment/:cid/delete", requireAdmin, (req, res) => {
  const { id, cid } = req.params;
  db.run("DELETE FROM comments WHERE id = ?", [cid], (err) => {
    if (err) return res.status(500).send("Error al borrar el comentario");
    res.redirect(`/news/${id}#comentarios`);
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