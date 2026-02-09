const express = require('express');
const router = express.Router();
const db = require('../config/db-selector');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// ========== RUTAS PÚBLICAS ==========

// Obtener todas las normas (devuelve lista plana, el frontend construye el árbol)
router.get('/', async (req, res) => {
    try {
        const [normas] = await db.query(`
            SELECT id, titulo, contenido, parent_id, orden
            FROM normas
            ORDER BY orden ASC, id ASC
        `);

        res.json({
            success: true,
            normas
        });
    } catch (error) {
        console.error('Error obteniendo normas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener normas'
        });
    }
});

// ========== RUTAS ADMIN ==========

// Crear norma
router.post('/', verifyToken, verifyAdmin, [
    body('titulo').notEmpty().withMessage('El título es obligatorio').isLength({ max: 255 }),
    body('contenido').optional(),
    body('parent_id').optional({ nullable: true }).isInt(),
    body('orden').optional().isInt()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
        const { titulo, contenido, parent_id, orden } = req.body;
        const dbType = process.env.DB_TYPE || 'mysql';

        let result;
        if (dbType === 'postgres') {
            const [rows] = await db.query(
                `INSERT INTO normas (titulo, contenido, parent_id, orden) VALUES ($1, $2, $3, $4) RETURNING id`,
                [titulo, contenido || null, parent_id || null, orden || 0]
            );
            result = { insertId: rows[0].id };
        } else {
            const [dbResult] = await db.query(
                `INSERT INTO normas (titulo, contenido, parent_id, orden) VALUES (?, ?, ?, ?)`,
                [titulo, contenido || null, parent_id || null, orden || 0]
            );
            result = dbResult;
        }

        res.status(201).json({
            success: true,
            message: 'Norma creada correctamente',
            normaId: result.insertId
        });
    } catch (error) {
        console.error('Error creando norma:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear norma'
        });
    }
});

// Actualizar norma
router.put('/:id', verifyToken, verifyAdmin, [
    body('titulo').notEmpty().withMessage('El título es obligatorio').isLength({ max: 255 }),
    body('contenido').optional({ nullable: true }),
    body('parent_id').optional({ nullable: true }),
    body('orden').optional().isInt()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
        const { titulo, contenido, parent_id, orden } = req.body;

        const [existing] = await db.query('SELECT id FROM normas WHERE id = ?', [req.params.id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Norma no encontrada' });
        }

        await db.query(
            `UPDATE normas SET titulo = ?, contenido = ?, parent_id = ?, orden = ? WHERE id = ?`,
            [titulo, contenido || null, parent_id || null, orden || 0, req.params.id]
        );

        res.json({
            success: true,
            message: 'Norma actualizada correctamente'
        });
    } catch (error) {
        console.error('Error actualizando norma:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar norma'
        });
    }
});

// Reordenar normas (actualizar orden y parent_id en bloque)
router.put('/reordenar/batch', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { normas } = req.body;
        if (!Array.isArray(normas)) {
            return res.status(400).json({ success: false, message: 'Se requiere un array de normas' });
        }

        for (const norma of normas) {
            await db.query(
                `UPDATE normas SET orden = ?, parent_id = ? WHERE id = ?`,
                [norma.orden, norma.parent_id || null, norma.id]
            );
        }

        res.json({
            success: true,
            message: 'Normas reordenadas correctamente'
        });
    } catch (error) {
        console.error('Error reordenando normas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al reordenar normas'
        });
    }
});

// Eliminar norma (CASCADE elimina hijos)
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [existing] = await db.query('SELECT id FROM normas WHERE id = ?', [req.params.id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Norma no encontrada' });
        }

        await db.query('DELETE FROM normas WHERE id = ?', [req.params.id]);

        res.json({
            success: true,
            message: 'Norma eliminada correctamente'
        });
    } catch (error) {
        console.error('Error eliminando norma:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar norma'
        });
    }
});

module.exports = router;
