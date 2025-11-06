// Configuración de URLs para desarrollo y producción
const CONFIG = {
    // Detectar si estamos en localhost o en producción
    API_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000/api'  // Desarrollo local
        : 'https://cardgame-api.onrender.com/api'  // Producción (cambiar después del despliegue)
};
