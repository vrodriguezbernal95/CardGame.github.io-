-- Crear base de datos
CREATE DATABASE IF NOT EXISTS CardGame CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE CardGame;

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    es_admin BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB;

-- Tabla de mazos
CREATE TABLE IF NOT EXISTS mazos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    serie VARCHAR(100) NOT NULL, -- One Piece, Naruto, Pokemon, etc.
    descripcion TEXT,
    imagen VARCHAR(255),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Tabla de cartas
CREATE TABLE IF NOT EXISTS cartas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    mazo_id INT NOT NULL,
    tipo VARCHAR(50), -- Personaje, Habilidad, Objeto, etc.
    poder INT,
    descripcion TEXT,
    imagen VARCHAR(255),
    FOREIGN KEY (mazo_id) REFERENCES mazos(id) ON DELETE CASCADE,
    INDEX idx_mazo (mazo_id)
) ENGINE=InnoDB;

-- Tabla de partidas
CREATE TABLE IF NOT EXISTS partidas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    jugador1_id INT NOT NULL,
    jugador2_id INT NOT NULL,
    mazo1_id INT NOT NULL,
    mazo2_id INT NOT NULL,
    ganador_id INT, -- NULL si es empate
    resultado ENUM('victoria_jugador1', 'victoria_jugador2', 'empate') NOT NULL,
    fecha_partida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notas TEXT,
    FOREIGN KEY (jugador1_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (jugador2_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (mazo1_id) REFERENCES mazos(id) ON DELETE CASCADE,
    FOREIGN KEY (mazo2_id) REFERENCES mazos(id) ON DELETE CASCADE,
    FOREIGN KEY (ganador_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_fecha (fecha_partida),
    INDEX idx_jugador1 (jugador1_id),
    INDEX idx_jugador2 (jugador2_id)
) ENGINE=InnoDB;

-- Vista para estadísticas de jugadores
CREATE OR REPLACE VIEW estadisticas_jugadores AS
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
LEFT JOIN partidas p ON (u.id = p.jugador1_id OR u.id = p.jugador2_id)
GROUP BY u.id, u.nombre;

-- Vista para estadísticas de mazos
CREATE OR REPLACE VIEW estadisticas_mazos AS
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
LEFT JOIN partidas p ON (m.id = p.mazo1_id OR m.id = p.mazo2_id)
GROUP BY m.id, m.nombre, m.serie;
