# 🚀 Guía de Despliegue en Render

Esta guía te ayudará a desplegar tu Card Game Anime en Render de forma gratuita.

## 📋 Pre-requisitos

1. ✅ Cuenta en [Render.com](https://render.com) (gratis)
2. ✅ Cuenta en [PlanetScale](https://planetscale.com) o [Railway](https://railway.app) para MySQL (gratis)
3. ✅ Tu código ya está en GitHub

---

## 🗄️ Paso 1: Crear Base de Datos MySQL (PlanetScale)

### Opción A: PlanetScale (Recomendado)

1. Ve a https://planetscale.com y crea una cuenta
2. Crea una nueva base de datos:
   - Nombre: `cardgame`
   - Región: Elige la más cercana
3. Haz click en "Connect"
4. Selecciona "Node.js" como framework
5. Guarda las credenciales:
   ```
   HOST: xxxxx.us-east-3.psdb.cloud
   USERNAME: xxxxx
   PASSWORD: xxxxx
   DATABASE: cardgame
   ```
6. En el dashboard de PlanetScale, ve a "Console" y ejecuta los scripts SQL:
   - Copia y pega el contenido de `database/schema.sql`
   - Luego copia y pega el contenido de `database/seed.sql`

### Opción B: Railway MySQL

1. Ve a https://railway.app
2. Crea un proyecto nuevo → Add MySQL
3. Ve a Variables y copia las credenciales
4. Usa MySQL Workbench o la consola para ejecutar:
   - `database/schema.sql`
   - `database/seed.sql`

---

## 🔧 Paso 2: Desplegar Backend en Render

1. **Ir a Render Dashboard**
   - Ve a https://dashboard.render.com
   - Haz click en "New +" → "Web Service"

2. **Conectar GitHub**
   - Conecta tu repositorio: `CardGame.github.io-`
   - Haz click en "Connect"

3. **Configurar el servicio**
   - **Name:** `cardgame-api`
   - **Region:** Oregon (US West) o la más cercana
   - **Branch:** `master`
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`

4. **Variables de Entorno**

   Haz click en "Advanced" → "Add Environment Variable":

   ```
   NODE_ENV=production
   PORT=3000

   DB_HOST=xxxxx.psdb.cloud
   DB_USER=xxxxx
   DB_PASSWORD=xxxxx
   DB_NAME=cardgame
   DB_PORT=3306

   JWT_SECRET=cardgame_secret_super_seguro_2024_cambiar_en_produccion
   JWT_EXPIRES_IN=7d

   FRONTEND_URL=https://cardgame-frontend.onrender.com
   ```

   ⚠️ **Importante:** Reemplaza `DB_HOST`, `DB_USER`, `DB_PASSWORD` con tus credenciales de PlanetScale/Railway

5. **Crear el servicio**
   - Haz click en "Create Web Service"
   - Espera 5-10 minutos mientras se despliega
   - Tu backend estará en: `https://cardgame-api.onrender.com`

---

## 🌐 Paso 3: Desplegar Frontend en Render

1. **Crear nuevo servicio**
   - En Render: "New +" → "Static Site"

2. **Conectar repositorio**
   - Selecciona el mismo repo: `CardGame.github.io-`

3. **Configurar**
   - **Name:** `cardgame-frontend`
   - **Branch:** `master`
   - **Root Directory:** deja en blanco
   - **Build Command:** deja en blanco
   - **Publish Directory:** `frontend`

4. **Crear el sitio**
   - Haz click en "Create Static Site"
   - Tu frontend estará en: `https://cardgame-frontend.onrender.com`

---

## 🔄 Paso 4: Actualizar URLs en el Código

Ahora que tienes las URLs reales de Render, actualiza el frontend:

1. Edita `frontend/js/api.js` línea 4:
   ```javascript
   : 'https://TU-BACKEND.onrender.com/api';  // Cambiar por tu URL real
   ```

2. Haz commit y push:
   ```bash
   git add .
   git commit -m "Actualizar URL del backend para producción"
   git push origin master
   ```

3. Render automáticamente re-desplegará ambos servicios

---

## ✅ Paso 5: Verificar que Todo Funciona

1. **Espera 2-3 minutos** para que se complete el despliegue

2. **Prueba tu backend:**
   - Ve a: `https://TU-BACKEND.onrender.com/api/health`
   - Deberías ver: `{"success":true,"message":"API funcionando correctamente"}`

3. **Abre tu aplicación:**
   - Ve a: `https://TU-FRONTEND.onrender.com`
   - Deberías ver la página principal

4. **Prueba el login:**
   - Email: `v.rodriguezbernal95@gmail.com`
   - Contraseña: `admin123`

---

## ⚠️ Notas Importantes

### Plan Gratuito de Render:
- ✅ Gratis para siempre
- ⏸️ Se "duerme" después de 15 minutos sin actividad
- ⏱️ Primera petición tras dormir tarda ~30 segundos
- 💾 750 horas/mes de uso (suficiente para desarrollo)

### Si el backend no responde:
- Es normal que tarde en la primera petición (se está "despertando")
- Espera 30 segundos y vuelve a intentar

### Actualizaciones:
- Cada vez que hagas `git push`, Render re-desplegará automáticamente
- Tarda ~3-5 minutos

---

## 🐛 Solución de Problemas

### Error: "Cannot connect to API"
- Verifica que el backend esté desplegado: `https://TU-BACKEND.onrender.com/api/health`
- Revisa que las variables de entorno estén correctas en Render
- Espera 30 segundos (puede estar "despertando")

### Error: "Database connection failed"
- Verifica las credenciales de PlanetScale/Railway
- Asegúrate de haber ejecutado los scripts SQL
- Revisa los logs en Render Dashboard

### Frontend no carga datos:
- Abre la consola del navegador (F12)
- Verifica que la URL del API sea correcta
- Asegúrate de haber hecho push del código actualizado

---

## 🎉 ¡Listo!

Tu Card Game Anime ahora está en línea y accesible desde cualquier lugar del mundo.

**URLs Finales:**
- Frontend: `https://cardgame-frontend.onrender.com`
- Backend API: `https://cardgame-api.onrender.com/api`
- GitHub: `https://github.com/vrodriguezbernal95/CardGame.github.io-`

Comparte la URL del frontend con tus amigos para que prueben el juego.
