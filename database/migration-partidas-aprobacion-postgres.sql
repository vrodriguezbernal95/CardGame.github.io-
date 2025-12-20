-- Migración: Sistema de aprobación de partidas (PostgreSQL)
-- Añade campos para gestionar partidas pendientes de aprobación

-- 1. Crear tipo ENUM para estado si no existe
DO $$ BEGIN
    CREATE TYPE estado_partida AS ENUM ('pendiente', 'aprobada', 'rechazada');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Añadir columnas a la tabla partidas
ALTER TABLE partidas
ADD COLUMN IF NOT EXISTS estado estado_partida DEFAULT 'aprobada',
ADD COLUMN IF NOT EXISTS usuario_registro_id INT;

-- 3. Añadir foreign key
DO $$ BEGIN
    ALTER TABLE partidas
    ADD CONSTRAINT fk_usuario_registro
    FOREIGN KEY (usuario_registro_id) REFERENCES usuarios(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. Crear índice
CREATE INDEX IF NOT EXISTS idx_partidas_estado ON partidas(estado);

-- 5. Marcar todas las partidas existentes como aprobadas
UPDATE partidas SET estado = 'aprobada' WHERE estado IS NULL;

-- 6. Recrear vista de estadísticas de jugadores (solo partidas aprobadas)
DROP VIEW IF EXISTS estadisticas_jugadores;
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

-- 7. Recrear vista de estadísticas de mazos (solo partidas aprobadas)
DROP VIEW IF EXISTS estadisticas_mazos;
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

-- 8. Crear tabla para tracking de límite diario (10 partidas/día por usuario)
CREATE TABLE IF NOT EXISTS partidas_registro_diario (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL,
    fecha DATE NOT NULL,
    cantidad INT DEFAULT 1,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE (usuario_id, fecha)
);
