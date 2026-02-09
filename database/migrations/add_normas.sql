-- Migración: Crear tabla de normas con estructura jerárquica

-- MySQL
CREATE TABLE IF NOT EXISTS normas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    contenido TEXT,
    parent_id INT DEFAULT NULL,
    orden INT DEFAULT 0,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES normas(id) ON DELETE CASCADE,
    INDEX idx_parent (parent_id),
    INDEX idx_orden (orden)
) ENGINE=InnoDB;

-- Para PostgreSQL usar:
-- CREATE TABLE IF NOT EXISTS normas (
--     id SERIAL PRIMARY KEY,
--     titulo VARCHAR(255) NOT NULL,
--     contenido TEXT,
--     parent_id INTEGER DEFAULT NULL REFERENCES normas(id) ON DELETE CASCADE,
--     orden INTEGER DEFAULT 0,
--     fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );
-- CREATE INDEX IF NOT EXISTS idx_normas_parent ON normas(parent_id);
-- CREATE INDEX IF NOT EXISTS idx_normas_orden ON normas(orden);
