# 🚀 Desplegar en Render (TODO GRATIS)

Guía simple para desplegar tu Card Game Anime en Render usando PostgreSQL gratis.

---

## ⏱️ Tiempo total: ~10 minutos

---

## 📝 Paso 1: Crear Cuenta en Render (1 minuto)

1. Ve a **https://render.com**
2. Haz click en **"Get Started"**
3. Crea cuenta con GitHub (más rápido)

---

## 🗄️ Paso 2: Crear Base de Datos PostgreSQL (2 minutos)

1. En Render Dashboard, haz click en **"New +"**
2. Selecciona **"PostgreSQL"**
3. Configura:
   - **Name:** `cardgame-db`
   - **Database:** `cardgame`
   - **User:** (se genera automáticamente)
   - **Region:** Oregon (US West) o la más cercana
   - **PostgreSQL Version:** 15
   - **Plan:** **Free** (0$)
4. Haz click en **"Create Database"**
5. Espera 1-2 minutos mientras se crea

### Ejecutar Scripts SQL:

1. En la página de tu base de datos, ve a **"Connect"**
2. Copia el **"External Database URL"** (algo como: `postgres://user:pass@host/db`)
3. **Opción A - Desde Render Dashboard:**
   - Ve a la pestaña **"Shell"** o **"Connect"**
   - Pega y ejecuta todo el contenido de:
     1. `database/schema-postgres.sql`
     2. `database/seed-postgres.sql`

4. **Opción B - Desde tu computadora:**
   ```bash
   # Instala psql si no lo tienes (opcional)
   # O usa TablePlus, DBeaver, pgAdmin

   psql "postgres://user:pass@host/db" < database/schema-postgres.sql
   psql "postgres://user:pass@host/db" < database/seed-postgres.sql
   ```

---

## 🔧 Paso 3: Desplegar Backend (3 minutos)

1. En Render Dashboard, haz click en **"New +"**
2. Selecciona **"Web Service"**
3. Haz click en **"Connect a repository"**
4. Conecta tu GitHub y selecciona: **`CardGame.github.io-`**
5. Configura:
   - **Name:** `cardgame-api`
   - **Region:** Oregon (igual que la BD)
   - **Branch:** `master`
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** **Free** (0$)

### Variables de Entorno:

Haz click en **"Advanced"** → **"Add Environment Variable"**:

```
NODE_ENV=production
PORT=3000
DB_TYPE=postgres

# Copiar de la página de tu PostgreSQL Database:
DATABASE_URL=(copiar "Internal Database URL" de Render)

# O manualmente:
DB_HOST=(copiar de Render)
DB_USER=(copiar de Render)
DB_PASSWORD=(copiar de Render)
DB_NAME=cardgame
DB_PORT=5432

JWT_SECRET=super_secret_key_cambiar_en_produccion_123456
JWT_EXPIRES_IN=7d

FRONTEND_URL=https://cardgame-frontend.onrender.com
```

💡 **Tip:** Render puede auto-rellenar las variables de PostgreSQL si haces click en "Add from Database"

6. Haz click en **"Create Web Service"**
7. Espera 3-5 minutos mientras se despliega

✅ **Tu backend estará en:** `https://cardgame-api.onrender.com`

---

## 🌐 Paso 4: Desplegar Frontend (2 minutos)

1. En Render Dashboard, haz click en **"New +"**
2. Selecciona **"Static Site"**
3. Conecta el mismo repositorio: **`CardGame.github.io-`**
4. Configura:
   - **Name:** `cardgame-frontend`
   - **Branch:** `master`
   - **Root Directory:** (dejar vacío)
   - **Build Command:** (dejar vacío)
   - **Publish Directory:** `frontend`

5. Haz click en **"Create Static Site"**
6. Espera 1-2 minutos

✅ **Tu frontend estará en:** `https://cardgame-frontend.onrender.com`

---

## 🔄 Paso 5: Actualizar URL del Backend (2 minutos)

El frontend necesita saber la URL real de tu backend:

1. Edita `frontend/js/api.js` línea 3:
   ```javascript
   : 'https://cardgame-api.onrender.com/api';  // Tu URL real
   ```

2. Haz commit y push:
   ```bash
   git add frontend/js/api.js
   git commit -m "Actualizar URL del backend en producción"
   git push origin master
   ```

3. Render automáticamente re-desplegará el frontend (1-2 min)

---

## ✅ Paso 6: Probar tu Aplicación

1. **Espera 2-3 minutos** para que todo termine de desplegarse

2. **Prueba el backend:**
   - Ve a: `https://cardgame-api.onrender.com/api/health`
   - Deberías ver: `{"success":true,"message":"API funcionando correctamente"}`

3. **Abre tu aplicación:**
   - Ve a: `https://cardgame-frontend.onrender.com`

4. **Login con tu usuario admin:**
   - Email: `v.rodriguezbernal95@gmail.com`
   - Contraseña: `admin123`

---

## 🎉 ¡Listo!

Tu Card Game Anime está en línea y funcionando 100% gratis con Render + PostgreSQL.

### 📱 Comparte tu proyecto:
- **URL del juego:** `https://cardgame-frontend.onrender.com`
- **GitHub:** `https://github.com/vrodriguezbernal95/CardGame.github.io-`

---

## ⚠️ Notas del Plan Gratuito

### Backend (Web Service):
- ✅ Gratis para siempre
- ⏸️ Se "duerme" después de 15 minutos sin actividad
- ⏱️ Primera petición tarda ~30 segundos en "despertar"
- 💾 750 horas/mes (suficiente para uso personal)

### Base de Datos (PostgreSQL):
- ✅ Gratis para siempre
- 💾 1 GB de almacenamiento
- ⏰ Expira después de 90 días (se te notifica antes)
- 🔄 Puedes renovar gratis cada 90 días

### Frontend (Static Site):
- ✅ Gratis para siempre
- ⚡ Siempre activo (no se duerme)
- 🚀 CDN global incluido

---

## 🐛 Solución de Problemas

### "Cannot connect to API"
1. Verifica: `https://cardgame-api.onrender.com/api/health`
2. Si no responde, espera 30 segundos (está "despertando")
3. Si sigue sin funcionar, revisa los logs en Render Dashboard

### "Database connection failed"
1. Ve a tu PostgreSQL en Render
2. Verifica que esté "Available"
3. Revisa las variables de entorno del backend
4. Asegúrate de haber ejecutado los scripts SQL

### El frontend carga pero no hay datos
1. Abre la consola del navegador (F12)
2. Verifica que la URL del API sea correcta
3. Espera 30 segundos (el backend puede estar "despertando")

---

## 🔄 Actualizaciones

Cada vez que hagas `git push`, Render automáticamente:
- ✅ Re-despliega el backend (~3 min)
- ✅ Re-despliega el frontend (~1 min)

No necesitas hacer nada más.

---

## 💡 Tips

- El backend tarda en despertar la primera vez del día (~30 seg)
- Usa Railway si quieres MySQL en lugar de PostgreSQL
- Puedes ver logs en tiempo real en Render Dashboard
- El plan gratuito es perfecto para proyectos personales

---

¿Tienes problemas? Revisa los logs en: `Render Dashboard → Tu servicio → Logs`
