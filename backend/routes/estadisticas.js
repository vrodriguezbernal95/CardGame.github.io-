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
            SELECT id, nombre, email FROM usuarios ORDER BY nombre
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

module.exports = router;
