-- Migración: Añadir índices de rendimiento
-- Estos índices mejoran las consultas de filtrado y estadísticas

-- Índice en estado (usado en todos los WHERE de partidas aprobadas)
CREATE INDEX IF NOT EXISTS idx_estado ON partidas(estado);

-- Índices en mazos de partidas (usados en JOINs y filtros)
CREATE INDEX IF NOT EXISTS idx_mazo1 ON partidas(mazo1_id);
CREATE INDEX IF NOT EXISTS idx_mazo2 ON partidas(mazo2_id);
