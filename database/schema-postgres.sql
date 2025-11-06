-- Base de datos PostgreSQL para Render

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    es_admin BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email ON usuarios(email);

-- Tabla de mazos
CREATE TABLE IF NOT EXISTS mazos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    serie VARCHAR(100) NOT NULL,
    descripcion TEXT,
    imagen VARCHAR(255),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de cartas
CREATE TABLE IF NOT EXISTS cartas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    mazo_id INTEGER NOT NULL REFERENCES mazos(id) ON DELETE CASCADE,
    tipo VARCHAR(50),
    poder INTEGER,
    descripcion TEXT,
    imagen VARCHAR(255)
);

CREATE INDEX idx_mazo ON cartas(mazo_id);

-- Tabla de partidas
CREATE TABLE IF NOT EXISTS partidas (
    id SERIAL PRIMARY KEY,
    jugador1_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    jugador2_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    mazo1_id INTEGER NOT NULL REFERENCES mazos(id) ON DELETE CASCADE,
    mazo2_id INTEGER NOT NULL REFERENCES mazos(id) ON DELETE CASCADE,
    ganador_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    resultado VARCHAR(20) NOT NULL CHECK (resultado IN ('victoria_jugador1', 'victoria_jugador2', 'empate')),
    fecha_partida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notas TEXT
);

CREATE INDEX idx_fecha ON partidas(fecha_partida);
CREATE INDEX idx_jugador1 ON partidas(jugador1_id);
CREATE INDEX idx_jugador2 ON partidas(jugador2_id);

-- Vista para estadísticas de jugadores
CREATE OR REPLACE VIEW estadisticas_jugadores AS
SELECT
    u.id,
    u.nombre,
    COUNT(p.id)::INTEGER as total_partidas,
    SUM(CASE WHEN p.ganador_id = u.id THEN 1 ELSE 0 END)::INTEGER as victorias,
    SUM(CASE WHEN p.ganador_id IS NULL THEN 1 ELSE 0 END)::INTEGER as empates,
    SUM(CASE WHEN (p.jugador1_id = u.id OR p.jugador2_id = u.id) AND p.ganador_id != u.id AND p.ganador_id IS NOT NULL THEN 1 ELSE 0 END)::INTEGER as derrotas,
    ROUND(
        (SUM(CASE WHEN p.ganador_id = u.id THEN 1 ELSE 0 END)::NUMERIC * 100.0) /
        NULLIF(COUNT(p.id), 0),
        2
    ) as winrate
FROM usuarios u
LEFT JOIN partidas p ON (u.id = p.jugador1_id OR u.id = p.jugador2_id)
GROUP BY u.id, u.nombre;

-- Vista para estadísticas de mazos
CREATE OR REPLACE VIEW estadisticas_mazos AS
SELECT
    m.id,
    m.nombre,
    m.serie,
    COUNT(p.id)::INTEGER as total_partidas,
    SUM(CASE
        WHEN (p.mazo1_id = m.id AND p.resultado = 'victoria_jugador1') OR
             (p.mazo2_id = m.id AND p.resultado = 'victoria_jugador2')
        THEN 1 ELSE 0
    END)::INTEGER as victorias,
    SUM(CASE WHEN p.resultado = 'empate' AND (p.mazo1_id = m.id OR p.mazo2_id = m.id) THEN 1 ELSE 0 END)::INTEGER as empates,
    SUM(CASE
        WHEN (p.mazo1_id = m.id AND p.resultado = 'victoria_jugador2') OR
             (p.mazo2_id = m.id AND p.resultado = 'victoria_jugador1')
        THEN 1 ELSE 0
    END)::INTEGER as derrotas,
    ROUND(
        (SUM(CASE
            WHEN (p.mazo1_id = m.id AND p.resultado = 'victoria_jugador1') OR
                 (p.mazo2_id = m.id AND p.resultado = 'victoria_jugador2')
            THEN 1 ELSE 0
        END)::NUMERIC * 100.0) /
        NULLIF(COUNT(p.id), 0),
        2
    ) as winrate
FROM mazos m
LEFT JOIN partidas p ON (m.id = p.mazo1_id OR m.id = p.mazo2_id)
GROUP BY m.id, m.nombre, m.serie;
