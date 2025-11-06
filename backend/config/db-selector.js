require('dotenv').config({ path: './config/.env' });

// Seleccionar el driver de BD según la variable de entorno
const dbType = process.env.DB_TYPE || 'mysql';

let db;

if (dbType === 'postgres') {
    console.log('📦 Usando PostgreSQL');
    db = require('./database-postgres');
} else {
    console.log('📦 Usando MySQL');
    db = require('./database');
}

module.exports = db;
