# Base de Datos

En este directorio se almacena la base de datos `anime_news.db` y cualquier información relevante sobre su estructura o uso.

## Tablas principales

### Tabla `news`
- id (INTEGER PRIMARY KEY AUTOINCREMENT)
- title (TEXT NOT NULL)
- content (TEXT NOT NULL)
- date (TEXT NOT NULL)
- image (TEXT, opcional)

### Tabla `users`
- id (INTEGER PRIMARY KEY AUTOINCREMENT)
- username (TEXT UNIQUE NOT NULL)
- password_hash (TEXT NOT NULL)
- is_admin (INTEGER NOT NULL, 0 = usuario normal, 1 = administrador)
- avatar (TEXT, opcional)

La tabla `users` almacena los usuarios registrados para el sistema de cuentas. El campo `username` es único y se utiliza para iniciar sesión. Las contraseñas se almacenan de forma segura usando hashing (bcrypt).

### Tabla `pending_news`
- id (INTEGER PRIMARY KEY AUTOINCREMENT)
- title (TEXT NOT NULL)
- content (TEXT NOT NULL)
- date (TEXT NOT NULL)
- image (TEXT, opcional)
- author_id (INTEGER NOT NULL, referencia a users.id)
- estado (TEXT NOT NULL, valores: 'pendiente', 'aprobada', 'rechazada')

Esta tabla almacena las noticias enviadas por usuarios que están pendientes de aprobación por un administrador. Cuando una noticia es aprobada, se mueve a la tabla `news`.

