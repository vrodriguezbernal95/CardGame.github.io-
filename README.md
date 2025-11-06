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

### 1. Clonar el repositorio
```bash
git clone https://github.com/vrodriguezbernal95/CardGame.github.io-.git
cd CardGame.github.io-
```

### 2. Base de Datos
La base de datos ya está configurada con el nombre `CardGame`. Los scripts ya se ejecutaron:
```bash
# Si necesitas reinicializar la BD en el futuro:
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

### 3. Backend
```bash
cd backend
npm install
npm start
```

El servidor se iniciará en `http://localhost:3000`

### 4. Frontend
Abre el archivo `frontend/index.html` en tu navegador o usa un servidor local:
```bash
# Opción 1: Live Server (VS Code extension)
# Click derecho en index.html -> Open with Live Server

# Opción 2: http-server (requiere instalación)
npm install -g http-server
cd frontend
http-server -p 5500
```

El frontend estará disponible en `http://localhost:5500`

## Configuración

El archivo `backend/config/.env` ya está configurado:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=acenoa0205
DB_NAME=CardGame
DB_PORT=3306
PORT=3000
NODE_ENV=development
JWT_SECRET=cardgame_secret_key_2024_anime_super_secure
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5500
```

## Usuario Administrador

**Email:** v.rodriguezbernal95@gmail.com
**Contraseña:** admin123

## Datos de Ejemplo

La base de datos incluye:
- 4 usuarios (1 admin + 3 usuarios normales)
- 6 mazos: One Piece, Naruto, Pokemon, Dragon Ball, Hunter x Hunter, Attack on Titan
- 30+ cartas distribuidas en los mazos
- 10 partidas de ejemplo con resultados

## Uso Rápido

1. **Iniciar el backend:**
   ```bash
   cd backend
   npm start
   ```

2. **Abrir el frontend:**
   - Abre `frontend/index.html` en tu navegador
   - O usa Live Server / http-server

3. **Login como admin:**
   - Ve a Login
   - Email: `v.rodriguezbernal95@gmail.com`
   - Contraseña: `admin123`

4. **Explorar:**
   - Ver historial de partidas
   - Revisar estadísticas
   - Ver mazos y cartas
   - Usar el contador de vidas
   - Registrar nuevas partidas (solo admin)
