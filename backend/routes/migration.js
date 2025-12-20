const express = require('express');
const router = express.Router();
const db = require('../config/db-selector');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// ENDPOINT TEMPORAL - Ejecutar migración de sistema de aprobación
// SOLO ADMIN puede ejecutar esto
router.post('/run-aprobacion-migration', verifyToken, verifyAdmin, async (req, res) => {
    try {
        console.log('🔧 Iniciando migración: Sistema de aprobación de partidas...');

        const dbType = process.env.DB_TYPE || 'mysql';

        if (dbType === 'postgres') {
            // Migración PostgreSQL
            await db.query(`
                DO $$ BEGIN
                    CREATE TYPE estado_partida AS ENUM ('pendiente', 'aprobada', 'rechazada');
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$;
            `);

            await db.query(`
                ALTER TABLE partidas
                ADD COLUMN IF NOT EXISTS estado estado_partida DEFAULT 'aprobada',
                ADD COLUMN IF NOT EXISTS usuario_registro_id INT;
            `);

            await db.query(`
                DO $$ BEGIN
                    ALTER TABLE partidas
                    ADD CONSTRAINT fk_usuario_registro
                    FOREIGN KEY (usuario_registro_id) REFERENCES usuarios(id) ON DELETE SET NULL;
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$;
            `);

            await db.query(`CREATE INDEX IF NOT EXISTS idx_partidas_estado ON partidas(estado);`);

            await db.query(`UPDATE partidas SET estado = 'aprobada' WHERE estado IS NULL;`);

            // Recrear vistas
            await db.query(`DROP VIEW IF EXISTS estadisticas_jugadores;`);
            await db.query(`
                CREATE VIEW estadisticas_jugadores AS
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
                LEFT JOIN partidas p ON (u.id = p.jugador1_id OR u.id = p.jugador2_id) AND p.estado = 'aprobada'
                GROUP BY u.id, u.nombre;
            `);

            await db.query(`DROP VIEW IF EXISTS estadisticas_mazos;`);
            await db.query(`
                CREATE VIEW estadisticas_mazos AS
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
                    SUM(CASE WHEN p.resultado = 'empate' AND (p.mazo1_id = m.id OR p.mazo2_id = m.id) THEN 1 ELSE 0 END) as empates,
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
                LEFT JOIN partidas p ON (m.id = p.mazo1_id OR m.id = p.mazo2_id) AND p.estado = 'aprobada'
                GROUP BY m.id, m.nombre, m.serie;
            `);

            // Tabla de tracking diario
            await db.query(`
                CREATE TABLE IF NOT EXISTS partidas_registro_diario (
                    id SERIAL PRIMARY KEY,
                    usuario_id INT NOT NULL,
                    fecha DATE NOT NULL,
                    cantidad INT DEFAULT 1,
                    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
                    UNIQUE (usuario_id, fecha)
                );
            `);

        } else {
            // Migración MySQL
            await db.query(`
                ALTER TABLE partidas
                ADD COLUMN estado ENUM('pendiente', 'aprobada', 'rechazada') DEFAULT 'aprobada' AFTER resultado,
                ADD COLUMN usuario_registro_id INT AFTER ganador_id,
                ADD FOREIGN KEY (usuario_registro_id) REFERENCES usuarios(id) ON DELETE SET NULL,
                ADD INDEX idx_estado (estado);
            `);

            await db.query(`UPDATE partidas SET estado = 'aprobada' WHERE estado IS NULL;`);

            // Recrear vistas (MySQL no permite CREATE OR REPLACE VIEW)
            await db.query(`DROP VIEW IF EXISTS estadisticas_jugadores;`);
            await db.query(`
                CREATE VIEW estadisticas_jugadores AS
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
                LEFT JOIN partidas p ON (u.id = p.jugador1_id OR u.id = p.jugador2_id) AND p.estado = 'aprobada'
                GROUP BY u.id, u.nombre;
            `);

            await db.query(`DROP VIEW IF EXISTS estadisticas_mazos;`);
            await db.query(`
                CREATE VIEW estadisticas_mazos AS
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
                    SUM(CASE WHEN p.resultado = 'empate' AND (p.mazo1_id = m.id OR p.mazo2_id = m.id) THEN 1 ELSE 0 END) as empates,
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
                LEFT JOIN partidas p ON (m.id = p.mazo1_id OR m.id = p.mazo2_id) AND p.estado = 'aprobada'
                GROUP BY m.id, m.nombre, m.serie;
            `);

            // Tabla de tracking diario
            await db.query(`
                CREATE TABLE IF NOT EXISTS partidas_registro_diario (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    usuario_id INT NOT NULL,
                    fecha DATE NOT NULL,
                    cantidad INT DEFAULT 1,
                    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
                    UNIQUE KEY idx_usuario_fecha (usuario_id, fecha)
                ) ENGINE=InnoDB;
            `);
        }

        console.log('✅ Migración completada exitosamente');

        res.json({
            success: true,
            message: 'Migración ejecutada correctamente. Sistema de aprobación de partidas activado.',
            dbType
        });

    } catch (error) {
        console.error('❌ Error en migración:', error);
        res.status(500).json({
            success: false,
            message: 'Error al ejecutar migración',
            error: error.message
        });
    }
});

module.exports = router;
