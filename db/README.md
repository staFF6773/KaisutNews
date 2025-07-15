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

La tabla `users` almacena los usuarios registrados para el sistema de cuentas. El campo `username` es único y se utiliza para iniciar sesión. Las contraseñas se almacenan de forma segura usando hashing (bcrypt).

