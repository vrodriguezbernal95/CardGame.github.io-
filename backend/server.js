const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: './config/.env' });

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
const authRoutes = require('./routes/auth');
const partidasRoutes = require('./routes/partidas');
const mazosRoutes = require('./routes/mazos');
const estadisticasRoutes = require('./routes/estadisticas');

app.use('/api/auth', authRoutes);
app.use('/api/partidas', partidasRoutes);
app.use('/api/mazos', mazosRoutes);
app.use('/api/estadisticas', estadisticasRoutes);

// Ruta de prueba
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'API funcionando correctamente',
        timestamp: new Date().toISOString()
    });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
    });
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
    });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════╗
║   🎴 CARD GAME API - SERVIDOR ACTIVO 🎴   ║
╠═══════════════════════════════════════════╣
║  Puerto: ${PORT}                            ║
║  Entorno: ${process.env.NODE_ENV}                  ║
║  Base de Datos: ${process.env.DB_NAME}                   ║
╚═══════════════════════════════════════════╝
    `);
});

module.exports = app;
