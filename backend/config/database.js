const mysql = require('mysql2');
require('dotenv').config({ path: './config/.env' });

// Crear pool de conexiones
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    charset: 'utf8mb4',
    connectTimeout: 60000,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Configurar charset en cada conexión
pool.on('connection', (connection) => {
    connection.query('SET NAMES utf8mb4');
    connection.query('SET CHARACTER SET utf8mb4');
    connection.query('SET character_set_connection=utf8mb4');
});

// Promisify para usar async/await
const promisePool = pool.promise();

// Test de conexión
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Error conectando a la base de datos:', err.message);
        return;
    }
    console.log('✅ Conectado a la base de datos MySQL: ' + process.env.DB_NAME);
    connection.release();
});

module.exports = promisePool;
