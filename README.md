# Juego de Cartas - Plataforma Web

Plataforma web para gestionar partidas, estadísticas y mazos de un juego de cartas físico basado en series de anime (One Piece, Naruto, Pokemon, etc.)

## Estructura del Proyecto

```
juego-de-cartas/
├── backend/              # Servidor Node.js + Express
│   ├── config/          # Configuración de BD y variables
│   ├── routes/          # Rutas de la API
│   ├── controllers/     # Lógica de negocio
│   ├── models/          # Modelos de BD
│   └── middleware/      # Autenticación y validaciones
├── frontend/            # Interfaz web
│   ├── css/            # Estilos
│   ├── js/             # Scripts JavaScript
│   ├── pages/          # Páginas HTML
│   └── assets/         # Imágenes y recursos
└── database/           # Scripts SQL
```

## Tecnologías

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js + Express
- **Base de Datos**: MySQL/MariaDB
- **Autenticación**: JWT (JSON Web Tokens)

## Funcionalidades

1. **Home**: Historia del juego y registro de usuarios
2. **Historial de Partidas**: Registro de partidas jugadas con resultados
3. **Estadísticas**:
   - Winrate de mazos
   - Winrate de jugadores
4. **Spoiler de Mazos**: Visualización de mazos y sus cartas
5. **Contador de Vidas**: Herramienta interactiva para partidas (50 vidas por jugador)
6. **Panel Admin**: Subida de resultados de partidas (solo administradores)

## Instalación

### Backend
```bash
cd backend
npm install
npm start
```

### Base de Datos
```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

## Configuración

Crear archivo `backend/config/.env`:
```
DB_HOST=localhost
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña
DB_NAME=juego_cartas
JWT_SECRET=tu_secreto_jwt
PORT=3000
```
