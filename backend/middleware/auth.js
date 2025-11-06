const jwt = require('jsonwebtoken');
require('dotenv').config({ path: './config/.env' });

// Middleware para verificar JWT
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(403).json({
            success: false,
            message: 'No se proporcionó token de autenticación'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, email, es_admin }
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Token inválido o expirado'
        });
    }
};

// Middleware para verificar si es administrador
const verifyAdmin = (req, res, next) => {
    if (!req.user.es_admin) {
        return res.status(403).json({
            success: false,
            message: 'Acceso denegado. Solo administradores.'
        });
    }
    next();
};

module.exports = { verifyToken, verifyAdmin };
