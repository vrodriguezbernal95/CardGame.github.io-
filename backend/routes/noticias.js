const express = require('express');
const router = express.Router();
const db = require('../config/db-selector');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// ========== RUTAS PÚBLICAS ==========

// Obtener todas las noticias (con paginación)
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        // Obtener total de noticias
        const [countResult] = await db.query('SELECT COUNT(*) as total FROM noticias');
        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);

        // Obtener noticias con paginación
        const [noticias] = await db.query(`
            SELECT
                n.id,
                n.titulo,
                n.contenido,
                n.imagen_url,
                n.fecha_creacion,
                n.fecha_actualizacion,
                u.nombre as autor_nombre
            FROM noticias n
            JOIN usuarios u ON n.autor_id = u.id
            ORDER BY n.fecha_creacion DESC
            LIMIT ? OFFSET ?
        `, [limit, offset]);

        res.json({
            success: true,
            noticias,
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
        console.error('Error obteniendo noticias:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener noticias'
        });
    }
});

// Obtener noticias recientes (sin paginación, para página principal)
router.get('/recientes', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;

        const [noticias] = await db.query(`
            SELECT
                n.id,
                n.titulo,
                n.contenido,
                n.imagen_url,
                n.fecha_creacion,
                n.fecha_actualizacion,
                u.nombre as autor_nombre
            FROM noticias n
            JOIN usuarios u ON n.autor_id = u.id
            ORDER BY n.fecha_creacion DESC
            LIMIT ?
        `, [limit]);

        res.json({
            success: true,
            noticias
        });
    } catch (error) {
        console.error('Error obteniendo noticias recientes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener noticias recientes'
        });
    }
});

// Obtener noticia por ID
router.get('/:id', async (req, res) => {
    try {
        const [noticias] = await db.query(`
            SELECT
                n.id,
                n.titulo,
                n.contenido,
                n.imagen_url,
                n.fecha_creacion,
                n.fecha_actualizacion,
                u.nombre as autor_nombre,
                u.id as autor_id
            FROM noticias n
            JOIN usuarios u ON n.autor_id = u.id
            WHERE n.id = ?
        `, [req.params.id]);

        if (noticias.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Noticia no encontrada'
            });
        }

        res.json({
            success: true,
            noticia: noticias[0]
        });
    } catch (error) {
        console.error('Error obteniendo noticia:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener noticia'
        });
    }
});

// ========== RUTAS DE ADMIN ==========

// Crear noticia (solo admin)
router.post('/', verifyToken, verifyAdmin, [
    body('titulo').trim().notEmpty().withMessage('El título es requerido').isLength({ max: 255 }).withMessage('El título es muy largo'),
    body('contenido').trim().notEmpty().withMessage('El contenido es requerido'),
    body('imagen_url').optional().trim().isLength({ max: 500 }).withMessage('La URL de la imagen es muy larga')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }

    const { titulo, contenido, imagen_url } = req.body;
    const autor_id = req.user.id;

    try {
        const [result] = await db.query(`
            INSERT INTO noticias (titulo, contenido, imagen_url, autor_id)
            VALUES (?, ?, ?, ?)
        `, [titulo, contenido, imagen_url || null, autor_id]);

        res.status(201).json({
            success: true,
            message: 'Noticia creada exitosamente',
            noticiaId: result.insertId
        });
    } catch (error) {
        console.error('Error creando noticia:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear noticia'
        });
    }
});

// Actualizar noticia (solo admin)
router.put('/:id', verifyToken, verifyAdmin, [
    body('titulo').trim().notEmpty().withMessage('El título es requerido').isLength({ max: 255 }).withMessage('El título es muy largo'),
    body('contenido').trim().notEmpty().withMessage('El contenido es requerido'),
    body('imagen_url').optional().trim().isLength({ max: 500 }).withMessage('La URL de la imagen es muy larga')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }

    const { titulo, contenido, imagen_url } = req.body;

    try {
        const [result] = await db.query(`
            UPDATE noticias
            SET titulo = ?, contenido = ?, imagen_url = ?
            WHERE id = ?
        `, [titulo, contenido, imagen_url || null, req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Noticia no encontrada'
            });
        }

        res.json({
            success: true,
            message: 'Noticia actualizada exitosamente'
        });
    } catch (error) {
        console.error('Error actualizando noticia:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar noticia'
        });
    }
});

// Eliminar noticia (solo admin)
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM noticias WHERE id = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Noticia no encontrada'
            });
        }

        res.json({
            success: true,
            message: 'Noticia eliminada exitosamente'
        });
    } catch (error) {
        console.error('Error eliminando noticia:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar noticia'
        });
    }
});

module.exports = router;
