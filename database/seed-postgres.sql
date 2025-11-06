-- Insertar usuario administrador (Víctor)
-- Password: admin123 (hasheado con bcrypt)
INSERT INTO usuarios (nombre, email, password, es_admin) VALUES
('Víctor Rodríguez Bernal', 'v.rodriguezbernal95@gmail.com', '$2b$10$3yXr42Az.A8JM8hs7V0H2.XACJFeJLOLo0W3E6Xo6BM8n/tHAWiyS', TRUE);

-- Insertar usuarios de ejemplo
INSERT INTO usuarios (nombre, email, password, es_admin) VALUES
('Carlos García', 'carlos@example.com', '$2b$10$XqJw6P7xGxZJ8xG8Nh6xEeKgVvZxYxP1qRfxZxZxZxZxZxZxZxZxZ', FALSE),
('María López', 'maria@example.com', '$2b$10$XqJw6P7xGxZJ8xG8Nh6xEeKgVvZxYxP1qRfxZxZxZxZxZxZxZxZxZ', FALSE),
('Juan Martínez', 'juan@example.com', '$2b$10$XqJw6P7xGxZJ8xG8Nh6xEeKgVvZxYxP1qRfxZxZxZxZxZxZxZxZxZ', FALSE);

-- Insertar mazos de ejemplo
INSERT INTO mazos (nombre, serie, descripcion, imagen) VALUES
('Piratas del Sombrero de Paja', 'One Piece', 'Mazo centrado en la tripulación de Luffy con ataques combinados y espíritu de aventura.', 'one-piece.jpg'),
('Akatsuki', 'Naruto', 'Organización criminal con poderosos ninjas y jutsus devastadores.', 'akatsuki.jpg'),
('Equipo Rocket', 'Pokemon', 'Mazo de villanos icónicos con estrategias traicioneras y Pokemon poderosos.', 'team-rocket.jpg'),
('Guerreros Z', 'Dragon Ball', 'Los defensores de la Tierra con transformaciones y técnicas legendarias.', 'dbz.jpg'),
('Cazadores', 'Hunter x Hunter', 'Maestros del Nen con habilidades únicas y estrategias complejas.', 'hxh.jpg'),
('Titanes', 'Attack on Titan', 'Poder de los titanes con transformaciones devastadoras.', 'aot.jpg');

-- Insertar cartas para One Piece
INSERT INTO cartas (nombre, mazo_id, tipo, poder, descripcion) VALUES
('Monkey D. Luffy', 1, 'Personaje', 95, 'Capitán de los Piratas del Sombrero de Paja. Gear Fifth.'),
('Roronoa Zoro', 1, 'Personaje', 90, 'Espadachín de tres espadas. Estilo Asura.'),
('Nami', 1, 'Personaje', 75, 'Navegante experta en meteorología. Clima-Tact.'),
('Gomu Gomu no Red Hawk', 1, 'Habilidad', 85, 'Ataque de fuego devastador de Luffy.'),
('Going Merry', 1, 'Objeto', 70, 'El primer barco de la tripulación, lleno de recuerdos.');

-- Insertar cartas para Naruto
INSERT INTO cartas (nombre, mazo_id, tipo, poder, descripcion) VALUES
('Pain', 2, 'Personaje', 95, 'Líder de Akatsuki. Rinnegan.'),
('Itachi Uchiha', 2, 'Personaje', 98, 'Genio del clan Uchiha. Sharingan y Mangekyou.'),
('Kisame', 2, 'Personaje', 88, 'El monstruo sin cola. Samehada.'),
('Amaterasu', 2, 'Habilidad', 92, 'Llamas negras eternas del Mangekyou Sharingan.'),
('Shinra Tensei', 2, 'Habilidad', 90, 'Repulsión devastadora del Rinnegan.');

-- Insertar cartas para Pokemon
INSERT INTO cartas (nombre, mazo_id, tipo, poder, descripcion) VALUES
('Meowth', 3, 'Personaje', 60, 'El Meowth parlante del Equipo Rocket.'),
('Jessie', 3, 'Personaje', 70, 'Miembro del Equipo Rocket con Arbok.'),
('James', 3, 'Personaje', 70, 'Miembro del Equipo Rocket con Weezing.'),
('Wobbuffet', 3, 'Personaje', 75, 'Pokemon defensivo del equipo.'),
('Red de Captura', 3, 'Objeto', 65, 'Atrapa Pokemon enemigos temporalmente.');

-- Insertar cartas para Dragon Ball
INSERT INTO cartas (nombre, mazo_id, tipo, poder, descripcion) VALUES
('Goku SSJ Blue', 4, 'Personaje', 100, 'Transformación divina de Goku.'),
('Vegeta Ultra Ego', 4, 'Personaje', 98, 'Nueva forma de Vegeta que crece con el daño.'),
('Gohan Beast', 4, 'Personaje', 99, 'Despertar del poder oculto de Gohan.'),
('Kamehameha', 4, 'Habilidad', 95, 'Técnica legendaria de la Escuela Tortuga.'),
('Esferas del Dragón', 4, 'Objeto', 85, 'Conceden un deseo cuando se reúnen las 7.');

-- Insertar cartas para Hunter x Hunter
INSERT INTO cartas (nombre, mazo_id, tipo, poder, descripcion) VALUES
('Gon Freecss', 5, 'Personaje', 92, 'Cazador con talento natural para el Nen.'),
('Killua Zoldyck', 5, 'Personaje', 93, 'Asesino profesional con electricidad.'),
('Hisoka', 5, 'Personaje', 94, 'Mago letal obsesionado con oponentes fuertes.'),
('Jajanken', 5, 'Habilidad', 88, 'Técnica Nen de Gon: piedra, papel, tijera.'),
('Bungee Gum', 5, 'Habilidad', 85, 'Nen de Hisoka con propiedades elásticas.');

-- Insertar cartas para Attack on Titan
INSERT INTO cartas (nombre, mazo_id, tipo, poder, descripcion) VALUES
('Eren Yeager', 6, 'Personaje', 96, 'Titán de Ataque con el poder del Fundador.'),
('Mikasa Ackerman', 6, 'Personaje', 91, 'La soldado más fuerte de la humanidad.'),
('Levi Ackerman', 6, 'Personaje', 94, 'Capitán con habilidades de combate sobrenaturales.'),
('Equipo de Maniobra 3D', 6, 'Objeto', 82, 'Permite movimiento tridimensional contra titanes.'),
('Trueno de Marley', 6, 'Habilidad', 89, 'Transformación explosiva del Titán Acorazado.');

-- Insertar partidas de ejemplo
INSERT INTO partidas (jugador1_id, jugador2_id, mazo1_id, mazo2_id, ganador_id, resultado, notas) VALUES
-- Víctor vs Carlos
(1, 2, 1, 2, 1, 'victoria_jugador1', 'Partida épica entre One Piece y Akatsuki. Luffy Gear 5 fue decisivo.'),
(1, 2, 4, 3, 2, 'victoria_jugador2', 'Team Rocket sorprendió con estrategia defensiva.'),
-- Víctor vs María
(1, 3, 1, 5, 1, 'victoria_jugador1', 'Los Piratas dominaron con combos de equipo.'),
(1, 3, 2, 6, 3, 'victoria_jugador2', 'Levi y Mikasa fueron imparables.'),
-- Carlos vs María
(2, 3, 4, 5, NULL, 'empate', 'Batalla igualada que acabó en empate por tiempo.'),
(2, 3, 6, 2, 2, 'victoria_jugador1', 'Pain demostró el poder del Rinnegan.'),
-- Carlos vs Juan
(2, 4, 3, 4, 4, 'victoria_jugador2', 'Los Guerreros Z con Goku dominaron.'),
-- Víctor vs Juan
(1, 4, 5, 6, 1, 'victoria_jugador1', 'Nen de Hunter x Hunter superó a los Titanes.'),
(1, 4, 1, 4, 4, 'victoria_jugador2', 'Dragon Ball mostró su supremacía.'),
-- María vs Juan
(3, 4, 2, 3, 3, 'victoria_jugador1', 'Akatsuki aplastó al Team Rocket.');
