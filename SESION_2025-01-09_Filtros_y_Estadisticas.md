# Sesión de Desarrollo: 09 Enero 2025
## Filtros Server-Side y Corrección de Estadísticas

---

## 📋 Resumen Ejecutivo

En esta sesión se resolvieron dos problemas críticos:

1. **Filtros limitados**: Los filtros en historial y admin solo funcionaban sobre las 50 partidas de la página actual
2. **Estadísticas incorrectas**: Las estadísticas se calculaban solo sobre 50 partidas en lugar de todas las partidas aprobadas (1381 total)

**Solución implementada**: Filtros server-side con SQL y corrección de vistas de base de datos.

---

## 🔧 Problema 1: Filtros solo aplicaban a 50 partidas

### Situación Inicial
```javascript
// ANTES: Filtros en el cliente (historial.html)
function aplicarFiltros() {
    let partidasFiltradas = todasLasPartidas.filter(partida => {
        // Solo filtraba las 50 partidas cargadas en memoria
        if (fechaDesde && fechaPartida < fechaDesde) return false;
        // ...
    });
}
```

**Problema**:
- El usuario tenía 1381 partidas totales en la base de datos
- Solo se cargaban 50 en memoria (página actual)
- Los filtros solo buscaban en esas 50 partidas

### Solución Implementada

#### Backend: `backend/routes/partidas.js` (líneas 144-268)

Agregamos soporte para filtros en el endpoint GET `/api/partidas`:

```javascript
// DESPUÉS: Filtros en el servidor
router.get('/', async (req, res) => {
    // Parámetros de filtro desde query string
    const fechaDesde = req.query.fechaDesde || null;
    const fechaHasta = req.query.fechaHasta || null;
    const jugadorNombre = req.query.jugador || null;
    const mazoNombre = req.query.mazo || null;

    // Construir WHERE clause dinámico
    let whereConditions = ["p.estado = 'aprobada'"];
    let queryParams = [];

    if (fechaDesde) {
        whereConditions.push('DATE(p.fecha_partida) >= ?');
        queryParams.push(fechaDesde);
    }
    if (fechaHasta) {
        whereConditions.push('DATE(p.fecha_partida) <= ?');
        queryParams.push(fechaHasta);
    }
    if (jugadorNombre) {
        whereConditions.push('(u1.nombre = ? OR u2.nombre = ?)');
        queryParams.push(jugadorNombre, jugadorNombre);
    }
    if (mazoNombre) {
        whereConditions.push('(m1.nombre = ? OR m2.nombre = ?)');
        queryParams.push(mazoNombre, mazoNombre);
    }

    const whereClause = 'WHERE ' + whereConditions.join(' AND ');

    // Query SQL con filtros ANTES de LIMIT/OFFSET
    const [partidas] = await db.query(`
        SELECT p.id, p.fecha_partida, p.resultado, ...
        FROM partidas p
        JOIN usuarios u1 ON p.jugador1_id = u1.id
        JOIN usuarios u2 ON p.jugador2_id = u2.id
        JOIN mazos m1 ON p.mazo1_id = m1.id
        JOIN mazos m2 ON p.mazo2_id = m2.id
        ${whereClause}
        ORDER BY p.fecha_partida DESC
        LIMIT ? OFFSET ?
    `, [...queryParams, limit, offset]);
});
```

**Endpoints disponibles**:
- `/api/partidas` - Todas las partidas (página 1, 50 por página)
- `/api/partidas?page=2&limit=50` - Página 2
- `/api/partidas?jugador=Victor` - Todas las partidas de Victor (paginadas)
- `/api/partidas?fechaDesde=2024-01-01&fechaHasta=2024-12-31` - Rango de fechas
- `/api/partidas?jugador=Victor&mazo=Naruto` - Combinación de filtros

#### Frontend: `frontend/js/api.js` (líneas 97-118)

Modificamos el método para enviar filtros:

```javascript
// DESPUÉS: Acepta objeto de filtros
static async getPartidas(page = null, limit = null, filtros = {}) {
    let endpoint = '/partidas';
    const params = new URLSearchParams();

    if (page && limit) {
        params.append('page', page);
        params.append('limit', limit);
    }

    // Agregar filtros si existen
    if (filtros.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
    if (filtros.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
    if (filtros.jugador) params.append('jugador', filtros.jugador);
    if (filtros.mazo) params.append('mazo', filtros.mazo);

    const queryString = params.toString();
    if (queryString) endpoint += `?${queryString}`;

    return await this.request(endpoint);
}
```

#### Frontend: `frontend/pages/historial.html`

Cambios principales:

1. **Variable global para filtros activos** (línea 159):
```javascript
let filtrosActivos = {};
```

2. **Modificar cargarDatos() para aceptar filtros** (líneas 161-200):
```javascript
async function cargarDatos(pagina = 1, filtros = {}) {
    paginaActual = pagina;
    filtrosActivos = filtros;

    const result = await API.getPartidas(pagina, PARTIDAS_POR_PAGINA, filtros);
    // ... renderizar
}
```

3. **Función para cambiar página manteniendo filtros** (líneas 391-394):
```javascript
function cambiarPagina(pagina) {
    cargarDatos(pagina, filtrosActivos);
}
```

4. **Aplicar filtros envía al backend** (líneas 396-410):
```javascript
function aplicarFiltros() {
    const fechaDesde = document.getElementById('filtro-fecha-desde').value;
    const fechaHasta = document.getElementById('filtro-fecha-hasta').value;
    const jugador = document.getElementById('filtro-jugador').value;
    const mazo = document.getElementById('filtro-mazo').value;

    const filtros = {};
    if (fechaDesde) filtros.fechaDesde = fechaDesde;
    if (fechaHasta) filtros.fechaHasta = fechaHasta;
    if (jugador) filtros.jugador = jugador;
    if (mazo) filtros.mazo = mazo;

    cargarDatos(1, filtros); // ← Envía filtros al backend
}
```

5. **Cargar opciones de filtros** (líneas 202-241):
```javascript
async function cargarOpcionesFiltros() {
    // Obtener TODAS las partidas para extraer jugadores/mazos únicos
    const result = await API.getPartidas(1, 10000);

    result.partidas.forEach(partida => {
        jugadores.add(partida.jugador1_nombre);
        jugadores.add(partida.jugador2_nombre);
        mazos.add(partida.mazo1_nombre);
        mazos.add(partida.mazo2_nombre);
    });

    // Llenar <select> con opciones
}
```

6. **Actualizar onclick de paginación** (líneas 331, 347, 356, 367, 372):
```javascript
// ANTES: onclick="cargarDatos(1)"
// DESPUÉS: onclick="cambiarPagina(1)"
```

#### Frontend: `frontend/pages/admin.html`

Mismos cambios que historial.html:

1. Variable `filtrosActivosAdmin` (línea 1008)
2. `cargarPartidasLista(pagina, filtros)` acepta filtros (líneas 1011-1042)
3. `cambiarPaginaAdmin(pagina)` mantiene filtros (líneas 1221-1224)
4. `aplicarFiltrosAdmin()` envía al backend (líneas 1227-1241)
5. `poblarSelectsFiltros()` carga todas las opciones (líneas 1044-1089)

**IMPORTANTE**: Descarga Excel ahora descarga TODAS las partidas filtradas (líneas 1268-1342):

```javascript
async function descargarExcel() {
    // Obtener TODAS las partidas con filtros activos
    const result = await API.getPartidas(1, 100000, filtrosActivosAdmin);

    const datosExcel = result.partidas.map(p => { /* mapear */ });

    // Crear Excel con TODAS las partidas filtradas
    XLSX.writeFile(wb, nombreArchivo);
}
```

---

## 🔧 Problema 2: Estadísticas calculadas sobre 50 partidas

### Situación Inicial

Las vistas SQL `estadisticas_jugadores` y `estadisticas_mazos` no tenían filtro por `estado = 'aprobada'`, por lo que:
- Podían incluir partidas pendientes o rechazadas
- No estaba claro si calculaban sobre todas las partidas

### Solución Implementada

#### Base de datos: `database/migrations/fix_estadisticas_views.sql`

Creamos migración SQL para recrear las vistas con filtro correcto:

```sql
-- Recrear vista de estadísticas de jugadores
DROP VIEW IF EXISTS estadisticas_jugadores;
CREATE VIEW estadisticas_jugadores AS
SELECT
    u.id,
    u.nombre,
    COUNT(p.id) as total_partidas,
    SUM(CASE WHEN p.ganador_id = u.id THEN 1 ELSE 0 END) as victorias,
    SUM(CASE WHEN p.ganador_id IS NULL THEN 1 ELSE 0 END) as empates,
    SUM(CASE WHEN (p.jugador1_id = u.id OR p.jugador2_id = u.id)
             AND p.ganador_id != u.id
             AND p.ganador_id IS NOT NULL THEN 1 ELSE 0 END) as derrotas,
    ROUND(
        (SUM(CASE WHEN p.ganador_id = u.id THEN 1 ELSE 0 END) * 100.0) /
        NULLIF(COUNT(p.id), 0),
        2
    ) as winrate
FROM usuarios u
LEFT JOIN partidas p ON (u.id = p.jugador1_id OR u.id = p.jugador2_id)
    AND (p.estado = 'aprobada' OR p.estado IS NULL)  -- ← FILTRO CRÍTICO
GROUP BY u.id, u.nombre;

-- Mismo para estadisticas_mazos
DROP VIEW IF EXISTS estadisticas_mazos;
CREATE VIEW estadisticas_mazos AS
SELECT
    m.id,
    m.nombre,
    m.serie,
    COUNT(p.id) as total_partidas,
    -- ... cálculo de victorias, empates, derrotas
FROM mazos m
LEFT JOIN partidas p ON (m.id = p.mazo1_id OR m.id = p.mazo2_id)
    AND (p.estado = 'aprobada' OR p.estado IS NULL)  -- ← FILTRO CRÍTICO
GROUP BY m.id, m.nombre, m.serie;
```

#### Backend: `backend/routes/migration.js` (líneas 344-426)

Endpoint para ejecutar la migración desde admin:

```javascript
router.post('/fix-estadisticas-views', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const dbType = process.env.DB_TYPE || 'mysql';

        if (dbType === 'postgres') {
            // Ejecutar con PostgreSQL
            await db.query(`DROP VIEW IF EXISTS estadisticas_jugadores CASCADE`);
            await db.query(`CREATE VIEW estadisticas_jugadores AS ...`);
            // ...
        } else {
            // Ejecutar con MySQL
            await db.query(`DROP VIEW IF EXISTS estadisticas_jugadores`);
            await db.query(`CREATE VIEW estadisticas_jugadores AS ...`);
            // ...
        }

        res.json({
            success: true,
            message: 'Vistas de estadísticas corregidas exitosamente'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al corregir vistas de estadísticas',
            error: error.message
        });
    }
});
```

#### Frontend: `frontend/js/api.js` (líneas 223-227)

Método para llamar al endpoint:

```javascript
static async corregirVistasEstadisticas() {
    return await this.request('/migration/fix-estadisticas-views', {
        method: 'POST'
    });
}
```

#### Frontend: `frontend/pages/admin.html`

1. **Alerta en HTML** (líneas 183-191):
```html
<div id="estadisticas-fix-alert" style="margin-bottom: 1rem;">
    <div class="alert alert-warning">
        <strong>📊 Corregir Estadísticas</strong>
        <p>Si las estadísticas solo muestran datos de 50 partidas, ejecuta esta corrección para calcular sobre TODAS las partidas aprobadas.</p>
        <button onclick="corregirEstadisticas()" class="migrar-btn">
            🔧 Corregir Estadísticas Ahora
        </button>
    </div>
</div>
```

2. **Función JavaScript** (líneas 650-670):
```javascript
async function corregirEstadisticas() {
    if (!confirm('¿Corregir las vistas de estadísticas? Esto recalculará las estadísticas sobre TODAS las partidas aprobadas.')) return;

    const btn = event.target;
    btn.disabled = true;
    btn.textContent = 'Corrigiendo estadísticas...';

    try {
        const result = await API.corregirVistasEstadisticas();
        if (result.success) {
            UI.showAlert('✅ Estadísticas corregidas exitosamente. Ahora calculan sobre todas las partidas aprobadas!', 'success');
            document.getElementById('estadisticas-fix-alert').style.display = 'none';
            setTimeout(() => location.reload(), 1500);
        }
    } catch (error) {
        UI.showAlert('Error al corregir estadísticas: ' + error.message, 'error');
        btn.disabled = false;
        btn.textContent = '🔧 Corregir Estadísticas Ahora';
    }
}
```

---

## 📊 Flujo de Datos - Filtros

### Flujo Completo de un Filtro

```
Usuario selecciona filtro en UI
    ↓
aplicarFiltros() construye objeto filtros
    ↓
cargarDatos(1, { jugador: "Victor", fechaDesde: "2024-01-01" })
    ↓
API.getPartidas(1, 50, filtros)
    ↓
GET /api/partidas?page=1&limit=50&jugador=Victor&fechaDesde=2024-01-01
    ↓
Backend construye WHERE clause:
  WHERE p.estado = 'aprobada'
    AND (u1.nombre = 'Victor' OR u2.nombre = 'Victor')
    AND DATE(p.fecha_partida) >= '2024-01-01'
    ↓
COUNT(*) sobre TODAS las partidas filtradas → total: 200 partidas
    ↓
SELECT con LIMIT 50 OFFSET 0 → primeras 50 de las 200
    ↓
Response JSON:
{
  success: true,
  partidas: [ /* 50 partidas */ ],
  pagination: {
    page: 1,
    limit: 50,
    total: 200,
    totalPages: 4,
    hasNextPage: true
  },
  filtros: {
    jugador: "Victor",
    fechaDesde: "2024-01-01"
  }
}
    ↓
Frontend renderiza 50 partidas + paginación (1, 2, 3, 4)
    ↓
Usuario hace clic en página 2
    ↓
cambiarPagina(2) → cargarDatos(2, filtrosActivos)
    ↓
GET /api/partidas?page=2&limit=50&jugador=Victor&fechaDesde=2024-01-01
    ↓
SELECT con LIMIT 50 OFFSET 50 → partidas 51-100 de las 200
```

---

## 🗂️ Estructura de Archivos Modificados

```
backend/
├── routes/
│   ├── partidas.js          ← Filtros server-side
│   └── migration.js         ← Endpoint corrección estadísticas

frontend/
├── js/
│   └── api.js               ← Método getPartidas() con filtros
├── pages/
│   ├── historial.html       ← Filtros envían al backend
│   └── admin.html           ← Filtros + descarga Excel completa

database/
└── migrations/
    └── fix_estadisticas_views.sql  ← SQL para recrear vistas
```

---

## 🎯 Casos de Uso

### Caso 1: Filtrar por jugador
```
1. Usuario abre historial.html
2. Selecciona jugador "Victor" en el dropdown
3. Hace clic en "Aplicar Filtros"
4. Sistema busca en las 1381 partidas, encuentra 200 de Victor
5. Muestra primeras 50, paginación indica 4 páginas totales (200/50)
6. Usuario navega entre páginas 1-4, siempre viendo partidas de Victor
```

### Caso 2: Descargar Excel con filtros
```
1. Admin abre admin.html → tab "Añadir Partida"
2. Aplica filtros: jugador="Victor", fechaDesde="2024-01-01"
3. Sistema muestra 50 partidas de las 150 encontradas
4. Admin hace clic en "Descargar Excel"
5. Sistema hace nueva petición: API.getPartidas(1, 100000, filtros)
6. Backend retorna las 150 partidas completas
7. Excel se genera con las 150 partidas, no solo las 50 visibles
```

### Caso 3: Corregir estadísticas
```
1. Admin abre admin.html
2. Ve alerta amarilla "Corregir Estadísticas"
3. Hace clic en botón "Corregir Estadísticas Ahora"
4. Sistema ejecuta: POST /api/migration/fix-estadisticas-views
5. Backend ejecuta SQL para recrear vistas con filtro estado='aprobada'
6. Estadísticas ahora calculan sobre las 1381 partidas aprobadas
7. Alerta desaparece, página se recarga
```

---

## ⚠️ Consideraciones Importantes

### Rendimiento

1. **Carga inicial de opciones de filtros**:
   - Se hace una petición de `API.getPartidas(1, 10000)` para obtener todos los jugadores/mazos únicos
   - Con 1381 partidas esto es manejable
   - Si crece a +10,000 partidas, considerar endpoint dedicado `/api/partidas/filtros-opciones`

2. **Descarga Excel**:
   - Hace petición de hasta 100,000 registros
   - Con 1381 partidas actual no hay problema
   - Monitorear si crece significativamente

### Compatibilidad

- Filtros funcionan con MySQL y PostgreSQL
- `DATE(p.fecha_partida)` es compatible con ambos
- Migración de estadísticas detecta tipo de DB con `process.env.DB_TYPE`

### Estado actual de la base de datos

- **Total partidas**: 1381
- **Estado**: Mayormente 'aprobada' (o NULL en partidas antiguas)
- **Vistas**: Después de ejecutar corrección, calculan solo sobre aprobadas

---

## 📝 Commits Realizados

### Commit 1: `0733879`
```
Agregar corrección para cálculo de estadísticas sobre todas las partidas

- Agregar migración SQL para recrear vistas con filtro de estado='aprobada'
- Agregar endpoint /api/migration/fix-estadisticas-views
- Agregar botón en admin para ejecutar la corrección
- Agregar función JavaScript corregirEstadisticas()
```

### Commit 2: `a1c46fb`
```
Implementar filtros server-side sobre todas las partidas

Backend (routes/partidas.js):
- Agregar parámetros de filtro: fechaDesde, fechaHasta, jugador, mazo
- Construir cláusulas WHERE dinámicas según filtros activos
- Aplicar filtros antes de la paginación

Frontend (js/api.js):
- Modificar getPartidas() para aceptar objeto de filtros
- Construir query string con URLSearchParams

Frontend (historial.html y admin.html):
- Enviar filtros al backend en aplicarFiltros()
- Mantener filtros activos al cambiar de página
- Cargar todas las opciones de filtros al inicio
- descargarExcel() descarga TODAS las partidas filtradas
```

---

## 🚀 Próximos Pasos Sugeridos

### Mejoras Futuras

1. **Endpoint de opciones de filtros optimizado**:
```javascript
// backend/routes/partidas.js
router.get('/filtros-opciones', async (req, res) => {
    const [jugadores] = await db.query(`
        SELECT DISTINCT nombre FROM usuarios
        WHERE id IN (SELECT jugador1_id FROM partidas UNION SELECT jugador2_id FROM partidas)
        ORDER BY nombre
    `);

    const [mazos] = await db.query(`
        SELECT DISTINCT nombre FROM mazos
        WHERE id IN (SELECT mazo1_id FROM partidas UNION SELECT mazo2_id FROM partidas)
        ORDER BY nombre
    `);

    res.json({ success: true, jugadores, mazos });
});
```

2. **Filtro por resultado** (victoria_jugador1, victoria_jugador2, empate)

3. **Filtro por serie de mazo**

4. **Guardar filtros en localStorage** para persistencia entre sesiones

5. **Indicador visual de filtros activos** en la UI

6. **Botón "Limpiar filtros" más visible** cuando hay filtros activos

7. **Loading spinner durante descarga Excel** de muchas partidas

---

## 🧪 Cómo Probar

### Probar Filtros

1. Ir a: https://vrodriguezbernal95.github.io/CardGame.github.io-/pages/historial.html
2. Ver que muestra "Mostrando 1-50 de 1381 partidas"
3. Seleccionar un jugador del dropdown
4. Hacer clic en "Aplicar Filtros"
5. Verificar que muestra "Mostrando 1-50 de X partidas" (donde X < 1381)
6. Navegar a página 2, verificar que sigue mostrando partidas del mismo jugador
7. Hacer clic en "Limpiar Filtros", verificar que vuelve a mostrar 1381

### Probar Corrección de Estadísticas

1. Ir a: https://vrodriguezbernal95.github.io/CardGame.github.io-/pages/admin.html
2. Ver alerta amarilla "Corregir Estadísticas"
3. Hacer clic en "Corregir Estadísticas Ahora"
4. Confirmar acción
5. Esperar mensaje "✅ Estadísticas corregidas exitosamente"
6. Ir a: https://vrodriguezbernal95.github.io/CardGame.github.io-/pages/estadisticas.html
7. Verificar que estadísticas son coherentes con 1381 partidas

### Probar Descarga Excel

1. Ir a admin → tab "Añadir Partida"
2. Aplicar un filtro (ej: jugador específico)
3. Hacer clic en "Descargar Excel"
4. Abrir archivo Excel
5. Verificar que tiene TODAS las partidas del jugador, no solo 50

---

## 📞 Contexto del Usuario

- **Usuario**: Victor (admin)
- **Email**: vrodriguezbernal95@gmail.com
- **GitHub**: https://github.com/vrodriguezbernal95/CardGame.github.io-
- **Producción**:
  - Frontend: https://vrodriguezbernal95.github.io/CardGame.github.io-/
  - Backend: https://cardgame-api-kqm4.onrender.com/api

- **Base de datos**: MySQL en producción (Render)
- **Idioma**: Español
- **Timezone**: España (UTC+1)

---

## 🔑 Conceptos Clave para Futuras Sesiones

1. **Filtros server-side vs client-side**:
   - Server-side: Filtrar en SQL antes de paginar
   - Client-side: Filtrar arrays en JavaScript (limitado a datos cargados)

2. **Paginación con filtros**:
   - COUNT(*) con filtros para obtener total
   - LIMIT/OFFSET sobre datos filtrados
   - Mantener filtros activos en variable global

3. **Vistas SQL para estadísticas**:
   - Las vistas se calculan dinámicamente en cada SELECT
   - Deben filtrar por `estado = 'aprobada'` para datos correctos
   - Se recrean con DROP VIEW + CREATE VIEW

4. **Migración desde admin panel**:
   - Endpoint POST protegido con verifyToken + verifyAdmin
   - Botón en HTML con confirmación
   - Ocultar botón después de ejecutar (display: none)

---

**Fecha de esta sesión**: 09 Enero 2025
**Estado del proyecto**: Producción (GitHub Pages + Render)
**Versión**: Commit `a1c46fb`
