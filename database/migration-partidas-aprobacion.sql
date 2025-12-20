-- Migración: Sistema de aprobación de partidas
-- Añade campos para gestionar partidas pendientes de aprobación

USE CardGame;

-- 1. Añadir columnas a la tabla partidas
ALTER TABLE partidas
ADD COLUMN estado ENUM('pendiente', 'aprobada', 'rechazada') DEFAULT 'aprobada' AFTER resultado,
ADD COLUMN usuario_registro_id INT AFTER ganador_id,
ADD FOREIGN KEY (usuario_registro_id) REFERENCES usuarios(id) ON DELETE SET NULL,
ADD INDEX idx_estado (estado);

-- 2. Marcar todas las partidas existentes como aprobadas
UPDATE partidas SET estado = 'aprobada' WHERE estado IS NULL;

-- 3. Recrear vista de estadísticas de jugadores (solo partidas aprobadas)
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

-- 4. Recrear vista de estadísticas de mazos (solo partidas aprobadas)
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

-- 5. Crear tabla para tracking de límite diario (10 partidas/día por usuario)
CREATE TABLE IF NOT EXISTS partidas_registro_diario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    fecha DATE NOT NULL,
    cantidad INT DEFAULT 1,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE KEY idx_usuario_fecha (usuario_id, fecha)
) ENGINE=InnoDB;
