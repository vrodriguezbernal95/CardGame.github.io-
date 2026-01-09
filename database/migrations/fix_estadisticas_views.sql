-- Migración: Corregir vistas de estadísticas para filtrar solo partidas aprobadas
USE CardGame;

-- Recrear vista de estadísticas de jugadores
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
LEFT JOIN partidas p ON (u.id = p.jugador1_id OR u.id = p.jugador2_id) AND (p.estado = 'aprobada' OR p.estado IS NULL)
GROUP BY u.id, u.nombre;

-- Recrear vista de estadísticas de mazos
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
LEFT JOIN partidas p ON (m.id = p.mazo1_id OR m.id = p.mazo2_id) AND (p.estado = 'aprobada' OR p.estado IS NULL)
GROUP BY m.id, m.nombre, m.serie;
