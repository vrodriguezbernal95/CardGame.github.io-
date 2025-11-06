const { Pool } = require('pg');
require('dotenv').config({ path: './config/.env' });

// Crear pool de conexiones PostgreSQL
const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 5432,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test de conexión
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Error conectando a PostgreSQL:', err.message);
        return;
    }
    console.log('✅ Conectado a la base de datos PostgreSQL: ' + process.env.DB_NAME);
    release();
});

// Adaptar el pool para que sea compatible con el código existente (mysql2 style)
const promisePool = {
    query: async (sql, params) => {
        try {
            const result = await pool.query(sql, params);
            return [result.rows, result.fields];
        } catch (error) {
            throw error;
        }
    }
};

module.exports = promisePool;
