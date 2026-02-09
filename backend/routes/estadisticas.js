const express = require('express');
const router = express.Router();
const db = require('../config/db-selector');

// Obtener estadísticas de jugadores
router.get('/jugadores', async (req, res) => {
    try {
        const [estadisticas] = await db.query(`
            SELECT * FROM estadisticas_jugadores
            ORDER BY winrate DESC, victorias DESC
        `);

        res.json({
            success: true,
            estadisticas
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas de jugadores:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas'
        });
    }
});

// Obtener estadísticas de jugadores con filtros (rango de fechas)
// GET /estadisticas/jugadores/filtrado?fechaDesde=YYYY-MM-DD&fechaHasta=YYYY-MM-DD
router.get('/jugadores/filtrado', async (req, res) => {
    try {
        const fechaDesde = req.query.fechaDesde || null;
        const fechaHasta = req.query.fechaHasta || null;

        let whereConditions = [];
        let queryParams = [];

        // Filtro de estado
        whereConditions.push("(p.estado = 'aprobada' OR p.estado IS NULL)");

        if (fechaDesde) {
            whereConditions.push("DATE(p.fecha_partida) >= ?");
            queryParams.push(fechaDesde);
        }
        if (fechaHasta) {
            whereConditions.push("DATE(p.fecha_partida) <= ?");
            queryParams.push(fechaHasta);
        }

        const whereClause = whereConditions.length > 0
            ? 'WHERE ' + whereConditions.join(' AND ')
            : '';

        const [estadisticas] = await db.query(`
            SELECT
                u.id,
                u.nombre,
                COUNT(p.id) as total_partidas,
                SUM(CASE WHEN p.ganador_id = u.id THEN 1 ELSE 0 END) as victorias,
                SUM(CASE WHEN p.ganador_id IS NULL THEN 1 ELSE 0 END) as empates,
                SUM(CASE WHEN (p.jugador1_id = u.id OR p.jugador2_id = u.id) AND p.ganador_id != u.id AND p.ganador_id IS NOT NULL THEN 1 ELSE 0 END) as derrotas,
                ROUND(
                    (SUM(CASE WHEN p.ganador_id = u.id THEN 1 ELSE 0 END) * 100.0) /
                    NULLIF(COUNT(p.id), 0),
                    2
                ) as winrate
            FROM usuarios u
            INNER JOIN partidas p ON (u.id = p.jugador1_id OR u.id = p.jugador2_id)
            ${whereClause}
            GROUP BY u.id, u.nombre
            ORDER BY winrate DESC, victorias DESC
        `, queryParams);

        res.json({
            success: true,
            estadisticas
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas filtradas de jugadores:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas'
        });
    }
});

// Obtener estadísticas de mazos con filtros (rango de fechas)
// GET /estadisticas/mazos/filtrado?fechaDesde=YYYY-MM-DD&fechaHasta=YYYY-MM-DD
router.get('/mazos/filtrado', async (req, res) => {
    try {
        const fechaDesde = req.query.fechaDesde || null;
        const fechaHasta = req.query.fechaHasta || null;

        let whereConditions = [];
        let queryParams = [];

        // Filtro de estado
        whereConditions.push("(p.estado = 'aprobada' OR p.estado IS NULL)");

        if (fechaDesde) {
            whereConditions.push("DATE(p.fecha_partida) >= ?");
            queryParams.push(fechaDesde);
        }
        if (fechaHasta) {
            whereConditions.push("DATE(p.fecha_partida) <= ?");
            queryParams.push(fechaHasta);
        }

        const whereClause = whereConditions.length > 0
            ? 'WHERE ' + whereConditions.join(' AND ')
            : '';

        const [estadisticas] = await db.query(`
            SELECT
                m.id,
                m.nombre,
                m.serie,
                COUNT(p.id) as total_partidas,
                SUM(CASE
                    WHEN (p.mazo1_id = m.id AND p.resultado = 'victoria_jugador1') OR
                         (p.mazo2_id = m.id AND p.resultado = 'victoria_jugador2')
                    THEN 1 ELSE 0
                END) as victorias,
                SUM(CASE WHEN p.resultado = 'empate' THEN 1 ELSE 0 END) as empates,
                SUM(CASE
                    WHEN (p.mazo1_id = m.id AND p.resultado = 'victoria_jugador2') OR
                         (p.mazo2_id = m.id AND p.resultado = 'victoria_jugador1')
                    THEN 1 ELSE 0
                END) as derrotas,
                ROUND(
                    (SUM(CASE
                        WHEN (p.mazo1_id = m.id AND p.resultado = 'victoria_jugador1') OR
                             (p.mazo2_id = m.id AND p.resultado = 'victoria_jugador2')
                        THEN 1 ELSE 0
                    END) * 100.0) /
                    NULLIF(COUNT(p.id), 0),
                    2
                ) as winrate
            FROM mazos m
            INNER JOIN partidas p ON (m.id = p.mazo1_id OR m.id = p.mazo2_id)
            ${whereClause}
            GROUP BY m.id, m.nombre, m.serie
            ORDER BY winrate DESC, victorias DESC
        `, queryParams);

        res.json({
            success: true,
            estadisticas
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas filtradas de mazos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas'
        });
    }
});

// Obtener estadísticas de un jugador específico
router.get('/jugadores/:id', async (req, res) => {
    try {
        const [estadisticas] = await db.query(`
            SELECT * FROM estadisticas_jugadores WHERE id = ?
        `, [req.params.id]);

        if (estadisticas.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Jugador no encontrado'
            });
        }

        // Obtener últimas partidas del jugador
        const [ultimasPartidas] = await db.query(`
            SELECT
                p.id,
                p.fecha_partida,
                p.resultado,
                u1.nombre as jugador1_nombre,
                u2.nombre as jugador2_nombre,
                m1.nombre as mazo1_nombre,
                m2.nombre as mazo2_nombre
            FROM partidas p
            JOIN usuarios u1 ON p.jugador1_id = u1.id
            JOIN usuarios u2 ON p.jugador2_id = u2.id
            JOIN mazos m1 ON p.mazo1_id = m1.id
            JOIN mazos m2 ON p.mazo2_id = m2.id
            WHERE p.jugador1_id = ? OR p.jugador2_id = ?
            ORDER BY p.fecha_partida DESC
            LIMIT 10
        `, [req.params.id, req.params.id]);

        res.json({
            success: true,
            estadisticas: estadisticas[0],
            ultimasPartidas
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas del jugador:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas'
        });
    }
});

// Obtener estadísticas de mazos
router.get('/mazos', async (req, res) => {
    try {
        const [estadisticas] = await db.query(`
            SELECT * FROM estadisticas_mazos
            ORDER BY winrate DESC, victorias DESC
        `);

        res.json({
            success: true,
            estadisticas
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas de mazos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas'
        });
    }
});

// Obtener estadísticas de un mazo específico
router.get('/mazos/:id', async (req, res) => {
    try {
        const [estadisticas] = await db.query(`
            SELECT * FROM estadisticas_mazos WHERE id = ?
        `, [req.params.id]);

        if (estadisticas.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Mazo no encontrado'
            });
        }

        res.json({
            success: true,
            estadisticas: estadisticas[0]
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas del mazo:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas'
        });
    }
});

// Obtener lista de todos los jugadores
router.get('/usuarios/list', async (req, res) => {
    try {
        const [usuarios] = await db.query(`
            SELECT id, nombre, email, es_admin, fecha_creacion FROM usuarios ORDER BY nombre
        `);

        res.json({
            success: true,
            usuarios
        });
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener usuarios'
        });
    }
});

// Comparar dos mazos (enfrentamientos directos)
router.get('/comparar/mazos/:mazo1_id/:mazo2_id', async (req, res) => {
    try {
        const { mazo1_id, mazo2_id } = req.params;

        // Obtener información de los mazos
        const [mazos] = await db.query(`
            SELECT id, nombre, serie FROM mazos WHERE id IN (?, ?)
        `, [mazo1_id, mazo2_id]);

        if (mazos.length !== 2) {
            return res.status(404).json({
                success: false,
                message: 'Uno o ambos mazos no existen'
            });
        }

        // Obtener enfrentamientos entre estos mazos
        const [partidas] = await db.query(`
            SELECT
                p.id,
                p.fecha_partida,
                p.resultado,
                p.notas,
                u1.nombre as jugador1_nombre,
                u2.nombre as jugador2_nombre,
                m1.id as mazo1_id,
                m1.nombre as mazo1_nombre,
                m1.serie as mazo1_serie,
                m2.id as mazo2_id,
                m2.nombre as mazo2_nombre,
                m2.serie as mazo2_serie
            FROM partidas p
            JOIN usuarios u1 ON p.jugador1_id = u1.id
            JOIN usuarios u2 ON p.jugador2_id = u2.id
            JOIN mazos m1 ON p.mazo1_id = m1.id
            JOIN mazos m2 ON p.mazo2_id = m2.id
            WHERE (p.mazo1_id = ? AND p.mazo2_id = ?)
               OR (p.mazo1_id = ? AND p.mazo2_id = ?)
            ORDER BY p.fecha_partida DESC
        `, [mazo1_id, mazo2_id, mazo2_id, mazo1_id]);

        // Calcular estadísticas
        let mazo1_victorias = 0;
        let mazo2_victorias = 0;
        let empates = 0;

        partidas.forEach(p => {
            if (p.resultado === 'empate') {
                empates++;
            } else if (
                (p.mazo1_id == mazo1_id && p.resultado === 'victoria_jugador1') ||
                (p.mazo2_id == mazo1_id && p.resultado === 'victoria_jugador2')
            ) {
                mazo1_victorias++;
            } else {
                mazo2_victorias++;
            }
        });

        res.json({
            success: true,
            mazo1: mazos.find(m => m.id == mazo1_id),
            mazo2: mazos.find(m => m.id == mazo2_id),
            estadisticas: {
                total_partidas: partidas.length,
                mazo1_victorias,
                mazo2_victorias,
                empates,
                mazo1_winrate: partidas.length > 0 ? ((mazo1_victorias / partidas.length) * 100).toFixed(2) : 0,
                mazo2_winrate: partidas.length > 0 ? ((mazo2_victorias / partidas.length) * 100).toFixed(2) : 0
            },
            partidas
        });
    } catch (error) {
        console.error('Error comparando mazos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al comparar mazos'
        });
    }
});

// Comparar dos jugadores (enfrentamientos directos)
router.get('/comparar/jugadores/:jugador1_id/:jugador2_id', async (req, res) => {
    try {
        const { jugador1_id, jugador2_id } = req.params;

        // Obtener información de los jugadores
        const [jugadores] = await db.query(`
            SELECT id, nombre FROM usuarios WHERE id IN (?, ?)
        `, [jugador1_id, jugador2_id]);

        if (jugadores.length !== 2) {
            return res.status(404).json({
                success: false,
                message: 'Uno o ambos jugadores no existen'
            });
        }

        // Obtener enfrentamientos entre estos jugadores
        const [partidas] = await db.query(`
            SELECT
                p.id,
                p.fecha_partida,
                p.resultado,
                p.notas,
                u1.id as jugador1_id,
                u1.nombre as jugador1_nombre,
                u2.id as jugador2_id,
                u2.nombre as jugador2_nombre,
                m1.nombre as mazo1_nombre,
                m1.serie as mazo1_serie,
                m2.nombre as mazo2_nombre,
                m2.serie as mazo2_serie
            FROM partidas p
            JOIN usuarios u1 ON p.jugador1_id = u1.id
            JOIN usuarios u2 ON p.jugador2_id = u2.id
            JOIN mazos m1 ON p.mazo1_id = m1.id
            JOIN mazos m2 ON p.mazo2_id = m2.id
            WHERE (p.jugador1_id = ? AND p.jugador2_id = ?)
               OR (p.jugador1_id = ? AND p.jugador2_id = ?)
            ORDER BY p.fecha_partida DESC
        `, [jugador1_id, jugador2_id, jugador2_id, jugador1_id]);

        // Calcular estadísticas
        let jugador1_victorias = 0;
        let jugador2_victorias = 0;
        let empates = 0;

        // Mazos usados por cada jugador
        const mazosJugador1 = {};
        const mazosJugador2 = {};

        partidas.forEach(p => {
            // Contar victorias
            if (p.resultado === 'empate') {
                empates++;
            } else if (
                (p.jugador1_id == jugador1_id && p.resultado === 'victoria_jugador1') ||
                (p.jugador2_id == jugador1_id && p.resultado === 'victoria_jugador2')
            ) {
                jugador1_victorias++;
            } else {
                jugador2_victorias++;
            }

            // Registrar mazos usados
            if (p.jugador1_id == jugador1_id) {
                const key = `${p.mazo1_nombre} (${p.mazo1_serie})`;
                mazosJugador1[key] = (mazosJugador1[key] || 0) + 1;
            } else {
                const key = `${p.mazo2_nombre} (${p.mazo2_serie})`;
                mazosJugador1[key] = (mazosJugador1[key] || 0) + 1;
            }

            if (p.jugador2_id == jugador2_id) {
                const key = `${p.mazo2_nombre} (${p.mazo2_serie})`;
                mazosJugador2[key] = (mazosJugador2[key] || 0) + 1;
            } else {
                const key = `${p.mazo1_nombre} (${p.mazo1_serie})`;
                mazosJugador2[key] = (mazosJugador2[key] || 0) + 1;
            }
        });

        res.json({
            success: true,
            jugador1: jugadores.find(j => j.id == jugador1_id),
            jugador2: jugadores.find(j => j.id == jugador2_id),
            estadisticas: {
                total_partidas: partidas.length,
                jugador1_victorias,
                jugador2_victorias,
                empates,
                jugador1_winrate: partidas.length > 0 ? ((jugador1_victorias / partidas.length) * 100).toFixed(2) : 0,
                jugador2_winrate: partidas.length > 0 ? ((jugador2_victorias / partidas.length) * 100).toFixed(2) : 0
            },
            mazosUsados: {
                jugador1: mazosJugador1,
                jugador2: mazosJugador2
            },
            partidas
        });
    } catch (error) {
        console.error('Error comparando jugadores:', error);
        res.status(500).json({
            success: false,
            message: 'Error al comparar jugadores'
        });
    }
});

// Buscar usuarios por nombre (para autocompletado)
router.get('/usuarios/buscar/:query', async (req, res) => {
    try {
        const query = req.params.query;

        // Mínimo 4 caracteres para buscar
        if (query.length < 4) {
            return res.json({
                success: true,
                usuarios: []
            });
        }

        const [usuarios] = await db.query(`
            SELECT id, nombre, email
            FROM usuarios
            WHERE nombre LIKE ? OR email LIKE ?
            ORDER BY nombre
            LIMIT 20
        `, [`%${query}%`, `%${query}%`]);

        res.json({
            success: true,
            usuarios
        });
    } catch (error) {
        console.error('Error buscando usuarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error al buscar usuarios'
        });
    }
});

module.exports = router;
