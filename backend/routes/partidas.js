const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Obtener todas las partidas (con nombres de jugadores y mazos)
router.get('/', async (req, res) => {
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
                ug.nombre as ganador_nombre
            FROM partidas p
            JOIN usuarios u1 ON p.jugador1_id = u1.id
            JOIN usuarios u2 ON p.jugador2_id = u2.id
            JOIN mazos m1 ON p.mazo1_id = m1.id
            JOIN mazos m2 ON p.mazo2_id = m2.id
            LEFT JOIN usuarios ug ON p.ganador_id = ug.id
            ORDER BY p.fecha_partida DESC
        `);

        res.json({
            success: true,
            partidas
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
    body('resultado').isIn(['victoria_jugador1', 'victoria_jugador2', 'empate']).withMessage('Resultado inválido')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }

    const { jugador1_id, jugador2_id, mazo1_id, mazo2_id, resultado, notas } = req.body;

    // Calcular ganador_id según resultado
    let ganador_id = null;
    if (resultado === 'victoria_jugador1') {
        ganador_id = jugador1_id;
    } else if (resultado === 'victoria_jugador2') {
        ganador_id = jugador2_id;
    }

    try {
        const [result] = await db.query(`
            INSERT INTO partidas (jugador1_id, jugador2_id, mazo1_id, mazo2_id, ganador_id, resultado, notas)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [jugador1_id, jugador2_id, mazo1_id, mazo2_id, ganador_id, resultado, notas || null]);

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

module.exports = router;
