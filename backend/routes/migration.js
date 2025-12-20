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
            // Migración PostgreSQL - Ejecutar paso a paso con mejor manejo de errores

            // 1. Crear ENUM si no existe
            try {
                await db.query(`
                    DO $$ BEGIN
                        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_partida') THEN
                            CREATE TYPE estado_partida AS ENUM ('pendiente', 'aprobada', 'rechazada');
                        END IF;
                    END $$;
                `);
                console.log('✓ ENUM estado_partida creado/verificado');
            } catch (err) {
                console.log('ENUM ya existe o error:', err.message);
            }

            // 2. Agregar columna estado
            try {
                await db.query(`
                    DO $$ BEGIN
                        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='partidas' AND column_name='estado') THEN
                            ALTER TABLE partidas ADD COLUMN estado estado_partida DEFAULT 'aprobada';
                        END IF;
                    END $$;
                `);
                console.log('✓ Columna estado agregada/verificada');
            } catch (err) {
                console.log('Columna estado ya existe o error:', err.message);
            }

            // 3. Agregar columna usuario_registro_id
            try {
                await db.query(`
                    DO $$ BEGIN
                        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='partidas' AND column_name='usuario_registro_id') THEN
                            ALTER TABLE partidas ADD COLUMN usuario_registro_id INT;
                        END IF;
                    END $$;
                `);
                console.log('✓ Columna usuario_registro_id agregada/verificada');
            } catch (err) {
                console.log('Columna usuario_registro_id ya existe o error:', err.message);
            }

            // 4. Agregar foreign key
            try {
                await db.query(`
                    DO $$ BEGIN
                        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='fk_usuario_registro') THEN
                            ALTER TABLE partidas
                            ADD CONSTRAINT fk_usuario_registro
                            FOREIGN KEY (usuario_registro_id) REFERENCES usuarios(id) ON DELETE SET NULL;
                        END IF;
                    END $$;
                `);
                console.log('✓ Foreign key agregada/verificada');
            } catch (err) {
                console.log('Foreign key ya existe o error:', err.message);
            }

            // 5. Crear índice
            try {
                await db.query(`CREATE INDEX IF NOT EXISTS idx_partidas_estado ON partidas(estado);`);
                console.log('✓ Índice creado/verificado');
            } catch (err) {
                console.log('Índice ya existe o error:', err.message);
            }

            // 6. Actualizar partidas existentes
            try {
                await db.query(`UPDATE partidas SET estado = 'aprobada' WHERE estado IS NULL;`);
                console.log('✓ Partidas existentes actualizadas');
            } catch (err) {
                console.log('Error actualizando partidas:', err.message);
            }

            // 7. Recrear vistas
            try {
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
                console.log('✓ Vistas recreadas');
            } catch (err) {
                console.log('Error recreando vistas:', err.message);
            }

            // 8. Crear tabla de tracking diario
            try {
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
                console.log('✓ Tabla partidas_registro_diario creada/verificada');
            } catch (err) {
                console.log('Tabla ya existe o error:', err.message);
            }

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
