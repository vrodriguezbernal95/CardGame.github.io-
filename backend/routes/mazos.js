const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Obtener todos los mazos
router.get('/', async (req, res) => {
    try {
        const [mazos] = await db.query(`
            SELECT id, nombre, serie, descripcion, imagen, fecha_creacion
            FROM mazos
            ORDER BY serie, nombre
        `);

        res.json({
            success: true,
            mazos
        });
    } catch (error) {
        console.error('Error obteniendo mazos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener mazos'
        });
    }
});

// Obtener mazo por ID con sus cartas
router.get('/:id', async (req, res) => {
    try {
        const [mazos] = await db.query(
            'SELECT * FROM mazos WHERE id = ?',
            [req.params.id]
        );

        if (mazos.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Mazo no encontrado'
            });
        }

        // Obtener cartas del mazo
        const [cartas] = await db.query(
            'SELECT * FROM cartas WHERE mazo_id = ? ORDER BY poder DESC, nombre',
            [req.params.id]
        );

        res.json({
            success: true,
            mazo: {
                ...mazos[0],
                cartas
            }
        });
    } catch (error) {
        console.error('Error obteniendo mazo:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener mazo'
        });
    }
});

// Obtener mazos agrupados por serie
router.get('/series/all', async (req, res) => {
    try {
        const [series] = await db.query(`
            SELECT DISTINCT serie FROM mazos ORDER BY serie
        `);

        const mazosPorSerie = {};

        for (const { serie } of series) {
            const [mazos] = await db.query(
                'SELECT id, nombre, serie, descripcion, imagen FROM mazos WHERE serie = ?',
                [serie]
            );
            mazosPorSerie[serie] = mazos;
        }

        res.json({
            success: true,
            mazosPorSerie
        });
    } catch (error) {
        console.error('Error obteniendo mazos por serie:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener mazos'
        });
    }
});

module.exports = router;
