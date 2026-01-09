const express = require('express');
const router = express.Router();
const db = require('../config/db-selector');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// ========== RUTAS ESPECÍFICAS (DEBEN IR ANTES DE /:id) ==========

// Obtener partidas pendientes (solo admin)
router.get('/pendientes', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [partidas] = await db.query(`
            SELECT
                p.id,
                p.fecha_partida,
                p.resultado,
                p.notas,
                u1.nombre as jugador1_nombre,
                u2.nombre as jugador2_nombre,
                m1.nombre as mazo1_nombre,
                m1.serie as mazo1_serie,
                m2.nombre as mazo2_nombre,
                m2.serie as mazo2_serie,
                ug.nombre as ganador_nombre,
                ur.nombre as registrado_por
            FROM partidas p
            JOIN usuarios u1 ON p.jugador1_id = u1.id
            JOIN usuarios u2 ON p.jugador2_id = u2.id
            JOIN mazos m1 ON p.mazo1_id = m1.id
            JOIN mazos m2 ON p.mazo2_id = m2.id
            LEFT JOIN usuarios ug ON p.ganador_id = ug.id
            LEFT JOIN usuarios ur ON p.usuario_registro_id = ur.id
            WHERE p.estado = 'pendiente'
            ORDER BY p.fecha_partida DESC
        `);

        res.json({
            success: true,
            partidas,
            total: partidas.length
        });
    } catch (error) {
        console.error('Error obteniendo partidas pendientes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener partidas pendientes'
        });
    }
});

// Registrar partida por usuario normal (pendiente de aprobación)
router.post('/registrar', verifyToken, [
    body('oponente_id').isInt().withMessage('ID de oponente inválido'),
    body('mi_mazo_id').isInt().withMessage('ID de mi mazo inválido'),
    body('mazo_oponente_id').isInt().withMessage('ID de mazo oponente inválido'),
    body('ganador').isIn(['yo', 'oponente', 'empate']).withMessage('Ganador inválido')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }

    const usuario_id = req.user.id; // Del token
    const { oponente_id, mi_mazo_id, mazo_oponente_id, ganador, notas } = req.body;

    try {
        // 1. Verificar límite diario (10 partidas/día)
        const hoy = new Date().toISOString().split('T')[0];
        const [registro] = await db.query(`
            SELECT cantidad FROM partidas_registro_diario
            WHERE usuario_id = ? AND fecha = ?
        `, [usuario_id, hoy]);

        if (registro.length > 0 && registro[0].cantidad >= 10) {
            return res.status(429).json({
                success: false,
                message: 'Has alcanzado el límite de 10 partidas por día'
            });
        }

        // 2. Determinar jugador1, jugador2 y resultado
        const jugador1_id = usuario_id;
        const jugador2_id = oponente_id;
        const mazo1_id = mi_mazo_id;
        const mazo2_id = mazo_oponente_id;

        let resultado, ganador_id;
        if (ganador === 'yo') {
            resultado = 'victoria_jugador1';
            ganador_id = jugador1_id;
        } else if (ganador === 'oponente') {
            resultado = 'victoria_jugador2';
            ganador_id = jugador2_id;
        } else {
            resultado = 'empate';
            ganador_id = null;
        }

        // 3. Crear partida con estado PENDIENTE
        const [result] = await db.query(`
            INSERT INTO partidas (
                jugador1_id, jugador2_id, mazo1_id, mazo2_id,
                ganador_id, resultado, estado, usuario_registro_id, notas
            )
            VALUES (?, ?, ?, ?, ?, ?, 'pendiente', ?, ?)
        `, [jugador1_id, jugador2_id, mazo1_id, mazo2_id, ganador_id, resultado, usuario_id, notas || null]);

        // 4. Actualizar/Crear registro diario
        if (registro.length > 0) {
            await db.query(`
                UPDATE partidas_registro_diario
                SET cantidad = cantidad + 1
                WHERE usuario_id = ? AND fecha = ?
            `, [usuario_id, hoy]);
        } else {
            await db.query(`
                INSERT INTO partidas_registro_diario (usuario_id, fecha, cantidad)
                VALUES (?, ?, 1)
            `, [usuario_id, hoy]);
        }

        res.status(201).json({
            success: true,
            message: 'Partida registrada. Pendiente de aprobación por el admin.',
            partidaId: result.insertId,
            partidasHoy: (registro.length > 0 ? registro[0].cantidad : 0) + 1
        });

    } catch (error) {
        console.error('Error registrando partida:', error);
        res.status(500).json({
            success: false,
            message: 'Error al registrar partida',
            error: error.message
        });
    }
});

// ========== RUTAS GENERALES ==========

// Obtener todas las partidas APROBADAS (con nombres de jugadores y mazos)
// Soporta paginación: ?page=1&limit=50
router.get('/', async (req, res) => {
    try {
        const dbType = process.env.DB_TYPE || 'mysql';

        // Parámetros de paginación
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        // Verificar si la columna estado existe (para compatibilidad)
        let whereClause = '';
        try {
            if (dbType === 'postgres') {
                const [cols] = await db.query(`
                    SELECT column_name FROM information_schema.columns
                    WHERE table_name='partidas' AND column_name='estado'
                `);
                if (cols.length > 0) whereClause = "WHERE p.estado = 'aprobada'";
            } else {
                const [cols] = await db.query(`
                    SHOW COLUMNS FROM partidas LIKE 'estado'
                `);
                if (cols.length > 0) whereClause = "WHERE p.estado = 'aprobada'";
            }
        } catch (e) {
            // Si hay error, asumimos que no existe la columna
            whereClause = '';
        }

        // Obtener total de partidas
        const [countResult] = await db.query(`
            SELECT COUNT(*) as total
            FROM partidas p
            ${whereClause}
        `);
        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);

        // Obtener partidas con paginación
        const [partidas] = await db.query(`
            SELECT
                p.id,
                p.fecha_partida,
                p.resultado,
                p.notas,
                u1.nombre as jugador1_nombre,
                u2.nombre as jugador2_nombre,
                m1.nombre as mazo1_nombre,
                m1.serie as mazo1_serie,
                m2.nombre as mazo2_nombre,
                m2.serie as mazo2_serie,
                ug.nombre as ganador_nombre
            FROM partidas p
            JOIN usuarios u1 ON p.jugador1_id = u1.id
            JOIN usuarios u2 ON p.jugador2_id = u2.id
            JOIN mazos m1 ON p.mazo1_id = m1.id
            JOIN mazos m2 ON p.mazo2_id = m2.id
            LEFT JOIN usuarios ug ON p.ganador_id = ug.id
            ${whereClause}
            ORDER BY p.fecha_partida DESC
            LIMIT ? OFFSET ?
        `, [limit, offset]);

        res.json({
            success: true,
            partidas,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        console.error('Error obteniendo partidas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener partidas'
        });
    }
});

// Obtener partida por ID
router.get('/:id', async (req, res) => {
    try {
        const [partidas] = await db.query(`
            SELECT
                p.*,
                u1.nombre as jugador1_nombre,
                u2.nombre as jugador2_nombre,
                m1.nombre as mazo1_nombre,
                m2.nombre as mazo2_nombre,
                ug.nombre as ganador_nombre
            FROM partidas p
            JOIN usuarios u1 ON p.jugador1_id = u1.id
            JOIN usuarios u2 ON p.jugador2_id = u2.id
            JOIN mazos m1 ON p.mazo1_id = m1.id
            JOIN mazos m2 ON p.mazo2_id = m2.id
            LEFT JOIN usuarios ug ON p.ganador_id = ug.id
            WHERE p.id = ?
        `, [req.params.id]);

        if (partidas.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Partida no encontrada'
            });
        }

        res.json({
            success: true,
            partida: partidas[0]
        });
    } catch (error) {
        console.error('Error obteniendo partida:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener partida'
        });
    }
});

// Crear nueva partida (solo admin)
router.post('/', verifyToken, verifyAdmin, [
    body('jugador1_id').isInt().withMessage('ID de jugador 1 inválido'),
    body('jugador2_id').isInt().withMessage('ID de jugador 2 inválido'),
    body('mazo1_id').isInt().withMessage('ID de mazo 1 inválido'),
    body('mazo2_id').isInt().withMessage('ID de mazo 2 inválido'),
    body('resultado').isIn(['victoria_jugador1', 'victoria_jugador2', 'empate']).withMessage('Resultado inválido'),
    body('fecha_partida').optional().isISO8601().withMessage('Fecha inválida')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }

    const { jugador1_id, jugador2_id, mazo1_id, mazo2_id, resultado, fecha_partida, notas } = req.body;

    // Calcular ganador_id según resultado
    let ganador_id = null;
    if (resultado === 'victoria_jugador1') {
        ganador_id = jugador1_id;
    } else if (resultado === 'victoria_jugador2') {
        ganador_id = jugador2_id;
    }

    try {
        const [result] = await db.query(`
            INSERT INTO partidas (jugador1_id, jugador2_id, mazo1_id, mazo2_id, ganador_id, resultado, fecha_partida, notas)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [jugador1_id, jugador2_id, mazo1_id, mazo2_id, ganador_id, resultado, fecha_partida || null, notas || null]);

        res.status(201).json({
            success: true,
            message: 'Partida registrada exitosamente',
            partidaId: result.insertId
        });
    } catch (error) {
        console.error('Error creando partida:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear partida'
        });
    }
});

// Eliminar partida (solo admin)
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM partidas WHERE id = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Partida no encontrada'
            });
        }

        res.json({
            success: true,
            message: 'Partida eliminada exitosamente'
        });
    } catch (error) {
        console.error('Error eliminando partida:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar partida'
        });
    }
});

// Aprobar partida (solo admin)
router.put('/:id/aprobar', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [result] = await db.query(`
            UPDATE partidas SET estado = 'aprobada'
            WHERE id = ? AND estado = 'pendiente'
        `, [req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Partida no encontrada o ya procesada'
            });
        }

        res.json({
            success: true,
            message: 'Partida aprobada exitosamente'
        });
    } catch (error) {
        console.error('Error aprobando partida:', error);
        res.status(500).json({
            success: false,
            message: 'Error al aprobar partida'
        });
    }
});

// Rechazar partida (solo admin)
router.put('/:id/rechazar', verifyToken, verifyAdmin, async (req, res) => {
    try {
        // Opción 1: Marcar como rechazada (mantener registro)
        const [result] = await db.query(`
            UPDATE partidas SET estado = 'rechazada'
            WHERE id = ? AND estado = 'pendiente'
        `, [req.params.id]);

        // Opción 2: Eliminar directamente (descomentar si prefieres esto)
        // const [result] = await db.query('DELETE FROM partidas WHERE id = ? AND estado = "pendiente"', [req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Partida no encontrada o ya procesada'
            });
        }

        res.json({
            success: true,
            message: 'Partida rechazada'
        });
    } catch (error) {
        console.error('Error rechazando partida:', error);
        res.status(500).json({
            success: false,
            message: 'Error al rechazar partida'
        });
    }
});

module.exports = router;
