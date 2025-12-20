const express = require('express');
const router = express.Router();
const db = require('../config/db-selector');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

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

// ========== GESTIÓN DE MAZOS (SOLO ADMIN) ==========

// Crear nuevo mazo
router.post('/', verifyToken, verifyAdmin, [
    body('nombre').trim().notEmpty().withMessage('El nombre es requerido'),
    body('serie').trim().notEmpty().withMessage('La serie es requerida'),
    body('descripcion').trim().notEmpty().withMessage('La descripción es requerida')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }

    const { nombre, serie, descripcion, imagen } = req.body;

    try {
        const [result] = await db.query(`
            INSERT INTO mazos (nombre, serie, descripcion, imagen)
            VALUES (?, ?, ?, ?)
        `, [nombre, serie, descripcion, imagen || null]);

        res.status(201).json({
            success: true,
            message: 'Mazo creado exitosamente',
            mazoId: result.insertId
        });
    } catch (error) {
        console.error('Error creando mazo:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear mazo'
        });
    }
});

// Actualizar mazo
router.put('/:id', verifyToken, verifyAdmin, [
    body('nombre').optional().trim().notEmpty(),
    body('serie').optional().trim().notEmpty(),
    body('descripcion').optional().trim().notEmpty()
], async (req, res) => {
    const { nombre, serie, descripcion, imagen } = req.body;

    try {
        // Construir query dinámico
        const updates = [];
        const values = [];

        if (nombre !== undefined) {
            updates.push('nombre = ?');
            values.push(nombre);
        }
        if (serie !== undefined) {
            updates.push('serie = ?');
            values.push(serie);
        }
        if (descripcion !== undefined) {
            updates.push('descripcion = ?');
            values.push(descripcion);
        }
        if (imagen !== undefined) {
            updates.push('imagen = ?');
            values.push(imagen);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No hay campos para actualizar'
            });
        }

        values.push(req.params.id);

        const [result] = await db.query(
            `UPDATE mazos SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Mazo no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Mazo actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error actualizando mazo:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar mazo'
        });
    }
});

// Eliminar mazo
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        // Verificar si el mazo tiene partidas asociadas
        const [partidas] = await db.query(
            'SELECT COUNT(*) as total FROM partidas WHERE mazo1_id = ? OR mazo2_id = ?',
            [req.params.id, req.params.id]
        );

        if (partidas[0].total > 0) {
            return res.status(400).json({
                success: false,
                message: `No se puede eliminar. El mazo tiene ${partidas[0].total} partida(s) asociada(s).`
            });
        }

        const [result] = await db.query('DELETE FROM mazos WHERE id = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Mazo no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Mazo eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error eliminando mazo:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar mazo'
        });
    }
});

// Buscar mazos por nombre (para autocompletado)
router.get('/buscar/:query', async (req, res) => {
    try {
        const query = req.params.query;

        // Mínimo 4 caracteres para buscar
        if (query.length < 4) {
            return res.json({
                success: true,
                mazos: []
            });
        }

        const [mazos] = await db.query(`
            SELECT id, nombre, serie
            FROM mazos
            WHERE nombre LIKE ? OR serie LIKE ?
            ORDER BY nombre
            LIMIT 20
        `, [`%${query}%`, `%${query}%`]);

        res.json({
            success: true,
            mazos
        });
    } catch (error) {
        console.error('Error buscando mazos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al buscar mazos'
        });
    }
});

module.exports = router;
