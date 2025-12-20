// Configuración de la API (se detecta automáticamente desarrollo vs producción)
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api'  // Desarrollo local
    : 'https://cardgame-api-kqm4.onrender.com/api';  // Producción

// Clase para manejar las peticiones a la API
class API {
    static getToken() {
        return localStorage.getItem('token');
    }

    static getUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }

    static setAuth(token, user) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
    }

    static clearAuth() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }

    static isAuthenticated() {
        return !!this.getToken();
    }

    static isAdmin() {
        const user = this.getUser();
        return user && user.es_admin;
    }

    // Método genérico para hacer peticiones
    static async request(endpoint, options = {}) {
        const url = `${API_URL}${endpoint}`;
        const token = this.getToken();

        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error en la petición');
            }

            return data;
        } catch (error) {
            console.error('Error en API request:', error);
            throw error;
        }
    }

    // Auth
    static async login(email, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        if (data.success) {
            this.setAuth(data.token, data.user);
        }

        return data;
    }

    static async register(nombre, email, password) {
        return await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ nombre, email, password })
        });
    }

    static logout() {
        this.clearAuth();
        window.location.href = 'index.html';
    }

    // Partidas
    static async getPartidas() {
        return await this.request('/partidas');
    }

    static async getPartida(id) {
        return await this.request(`/partidas/${id}`);
    }

    static async createPartida(partidaData) {
        return await this.request('/partidas', {
            method: 'POST',
            body: JSON.stringify(partidaData)
        });
    }

    static async deletePartida(id) {
        return await this.request(`/partidas/${id}`, {
            method: 'DELETE'
        });
    }

    // Mazos
    static async getMazos() {
        return await this.request('/mazos');
    }

    static async getMazo(id) {
        return await this.request(`/mazos/${id}`);
    }

    static async getMazosPorSerie() {
        return await this.request('/mazos/series/all');
    }

    // Estadísticas
    static async getEstadisticasJugadores() {
        return await this.request('/estadisticas/jugadores');
    }

    static async getEstadisticasJugador(id) {
        return await this.request(`/estadisticas/jugadores/${id}`);
    }

    static async getEstadisticasMazos() {
        return await this.request('/estadisticas/mazos');
    }

    static async getEstadisticasMazo(id) {
        return await this.request(`/estadisticas/mazos/${id}`);
    }

    static async getUsuarios() {
        return await this.request('/estadisticas/usuarios/list');
    }

    // Comparativas
    static async compararMazos(mazo1_id, mazo2_id) {
        return await this.request(`/estadisticas/comparar/mazos/${mazo1_id}/${mazo2_id}`);
    }

    static async compararJugadores(jugador1_id, jugador2_id) {
        return await this.request(`/estadisticas/comparar/jugadores/${jugador1_id}/${jugador2_id}`);
    }
}

// Utilidades UI
class UI {
    static showAlert(message, type = 'info') {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;

        const container = document.querySelector('.container');
        if (container) {
            container.insertBefore(alert, container.firstChild);

            setTimeout(() => {
                alert.remove();
            }, 5000);
        }
    }

    static showLoading(element) {
        element.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p class="mt-2">Cargando...</p>
            </div>
        `;
    }

    static formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    static formatResultado(resultado) {
        const resultados = {
            'victoria_jugador1': 'Victoria J1',
            'victoria_jugador2': 'Victoria J2',
            'empate': 'Empate'
        };
        return resultados[resultado] || resultado;
    }

    static getBadgeClass(resultado) {
        if (resultado.includes('victoria')) return 'badge-success';
        if (resultado === 'empate') return 'badge-warning';
        return 'badge-info';
    }
}

// Protección de rutas
function checkAuth(requireAdmin = false) {
    if (!API.isAuthenticated()) {
        window.location.href = 'login.html';
        return false;
    }

    if (requireAdmin && !API.isAdmin()) {
        UI.showAlert('No tienes permisos para acceder a esta página', 'error');
        window.location.href = 'index.html';
        return false;
    }

    return true;
}

// Actualizar navbar con usuario
function updateNavbar() {
    const userNav = document.getElementById('user-nav');
    if (!userNav) return;

    if (API.isAuthenticated()) {
        const user = API.getUser();
        userNav.innerHTML = `
            <div class="nav-user">
                <span class="user-name">${user.nombre}</span>
                ${user.es_admin ? '<span class="admin-badge">ADMIN</span>' : ''}
                <button onclick="API.logout()" class="btn btn-secondary">Cerrar Sesión</button>
            </div>
        `;
    } else {
        userNav.innerHTML = `
            <a href="login.html" class="btn btn-primary">Iniciar Sesión</a>
        `;
    }
}

// Inicializar al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    updateNavbar();
});
