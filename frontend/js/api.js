// Configuración de la API (se detecta automáticamente desarrollo vs producción)
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api'  // Desarrollo local
    : 'https://cardgame-api-kqm4.onrender.com/api';  // Producción

// ── Keep-alive: ping cada 10 min para evitar el cold start de Render (free tier)
// Solo en producción para no interferir con desarrollo local.
if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    setInterval(() => fetch(API_URL + '/mazos?limit=1').catch(() => {}), 10 * 60 * 1000);
}

// ── Caché en sessionStorage para datos que raramente cambian.
// TTL en ms: mazos/noticias/estadísticas se refrescan cada 5 min.
const _cache = {
    TTL: 5 * 60 * 1000,
    get(key) {
        try {
            const raw = sessionStorage.getItem('apicache_' + key);
            if (!raw) return null;
            const { ts, data } = JSON.parse(raw);
            if (Date.now() - ts > this.TTL) { sessionStorage.removeItem('apicache_' + key); return null; }
            return data;
        } catch { return null; }
    },
    set(key, data) {
        try { sessionStorage.setItem('apicache_' + key, JSON.stringify({ ts: Date.now(), data })); } catch {}
    },
    clear(key) {
        try { sessionStorage.removeItem('apicache_' + key); } catch {}
    }
};

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
        // Detectar si estamos en /pages/ o en la raíz
        const isInPagesFolder = window.location.pathname.includes('/pages/');
        window.location.href = isInPagesFolder ? 'historial.html' : 'pages/historial.html';
    }

    // Partidas
    static async getPartidas(page = null, limit = null, filtros = {}) {
        let endpoint = '/partidas';
        const params = new URLSearchParams();

        if (page && limit) {
            params.append('page', page);
            params.append('limit', limit);
        }

        // Agregar filtros si existen
        if (filtros.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
        if (filtros.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
        if (filtros.jugador) params.append('jugador', filtros.jugador);
        if (filtros.mazo) params.append('mazo', filtros.mazo);

        const queryString = params.toString();
        if (queryString) {
            endpoint += `?${queryString}`;
        }

        return await this.request(endpoint);
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
        const cached = _cache.get('mazos');
        if (cached) return cached;
        const data = await this.request('/mazos');
        _cache.set('mazos', data);
        return data;
    }

    static async getMazo(id) {
        return await this.request(`/mazos/${id}`);
    }

    static async getMazosPorSerie() {
        const cached = _cache.get('mazos_serie');
        if (cached) return cached;
        const data = await this.request('/mazos/series/all');
        _cache.set('mazos_serie', data);
        return data;
    }

    static async createMazo(mazoData) {
        _cache.clear('mazos'); _cache.clear('mazos_serie');
        return await this.request('/mazos', { method: 'POST', body: JSON.stringify(mazoData) });
    }

    static async updateMazo(id, mazoData) {
        _cache.clear('mazos'); _cache.clear('mazos_serie');
        return await this.request(`/mazos/${id}`, { method: 'PUT', body: JSON.stringify(mazoData) });
    }

    static async deleteMazo(id) {
        _cache.clear('mazos'); _cache.clear('mazos_serie');
        return await this.request(`/mazos/${id}`, { method: 'DELETE' });
    }

    // Estadísticas
    static async getEstadisticasJugadores() {
        const cached = _cache.get('stats_jugadores');
        if (cached) return cached;
        const data = await this.request('/estadisticas/jugadores');
        _cache.set('stats_jugadores', data);
        return data;
    }

    static async getEstadisticasJugador(id) {
        return await this.request(`/estadisticas/jugadores/${id}`);
    }

    static async getMazosDeJugador(id) {
        return await this.request(`/estadisticas/jugadores/${id}/mazos`);
    }

    static async getJugadoresDeMazo(id) {
        return await this.request(`/estadisticas/mazos/${id}/jugadores`);
    }

    static async getEstadisticasMazos() {
        const cached = _cache.get('stats_mazos');
        if (cached) return cached;
        const data = await this.request('/estadisticas/mazos');
        _cache.set('stats_mazos', data);
        return data;
    }

    static async getEstadisticasMazo(id) {
        return await this.request(`/estadisticas/mazos/${id}`);
    }

    static async getUsuarios() {
        const cached = _cache.get('usuarios');
        if (cached) return cached;
        const data = await this.request('/estadisticas/usuarios/list');
        _cache.set('usuarios', data);
        return data;
    }

    // Opciones de filtros (jugadores y mazos únicos) - endpoint ligero
    static async getOpcionesFiltrosPartidas() {
        const cached = _cache.get('filtros_partidas');
        if (cached) return cached;
        const data = await this.request('/partidas/opciones-filtros');
        _cache.set('filtros_partidas', data);
        return data;
    }

    // Estadísticas filtradas (calculadas en servidor)
    static async getEstadisticasJugadoresFiltrado(filtros = {}) {
        const params = new URLSearchParams();
        if (filtros.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
        if (filtros.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
        const queryString = params.toString();
        const endpoint = queryString ? `/estadisticas/jugadores/filtrado?${queryString}` : '/estadisticas/jugadores/filtrado';
        return await this.request(endpoint);
    }

    static async getEstadisticasMazosFiltrado(filtros = {}) {
        const params = new URLSearchParams();
        if (filtros.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
        if (filtros.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
        const queryString = params.toString();
        const endpoint = queryString ? `/estadisticas/mazos/filtrado?${queryString}` : '/estadisticas/mazos/filtrado';
        return await this.request(endpoint);
    }

    // Comparativas
    static async compararMazos(mazo1_id, mazo2_id) {
        return await this.request(`/estadisticas/comparar/mazos/${mazo1_id}/${mazo2_id}`);
    }

    static async compararJugadores(jugador1_id, jugador2_id) {
        return await this.request(`/estadisticas/comparar/jugadores/${jugador1_id}/${jugador2_id}`);
    }

    // Registro de partidas por usuarios
    static async registrarPartida(partidaData) {
        return await this.request('/partidas/registrar', {
            method: 'POST',
            body: JSON.stringify(partidaData)
        });
    }

    // Admin: Partidas pendientes
    static async getPartidasPendientes() {
        return await this.request('/partidas/pendientes');
    }

    static async aprobarPartida(id) {
        return await this.request(`/partidas/${id}/aprobar`, {
            method: 'PUT'
        });
    }

    static async rechazarPartida(id) {
        return await this.request(`/partidas/${id}/rechazar`, {
            method: 'PUT'
        });
    }

    // Admin: Migración
    static async ejecutarMigracion() {
        return await this.request('/migration/run-aprobacion-migration', {
            method: 'POST'
        });
    }

    static async ejecutarMigracionNoticias() {
        return await this.request('/migration/run-noticias-migration', {
            method: 'POST'
        });
    }

    static async corregirVistasEstadisticas() {
        return await this.request('/migration/fix-estadisticas-views', {
            method: 'POST'
        });
    }

    // Búsqueda (autocompletado)
    static async buscarUsuarios(query) {
        if (query.length < 4) {
            return { success: true, usuarios: [] };
        }
        return await this.request(`/estadisticas/usuarios/buscar/${encodeURIComponent(query)}`);
    }

    static async buscarMazos(query) {
        if (query.length < 4) {
            return { success: true, mazos: [] };
        }
        return await this.request(`/mazos/buscar/${encodeURIComponent(query)}`);
    }

    // Admin: Gestión de usuarios
    static async createUser(userData) {
        return await this.request('/auth/create-user', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    static async deleteUser(id) {
        return await this.request(`/auth/users/${id}`, {
            method: 'DELETE'
        });
    }

    // Noticias
    static async getNoticias(page = null, limit = null) {
        let endpoint = '/noticias';
        if (page && limit) {
            endpoint += `?page=${page}&limit=${limit}`;
        }
        return await this.request(endpoint);
    }

    static async getNoticiasRecientes(limit = 5) {
        const key = `noticias_recientes_${limit}`;
        const cached = _cache.get(key);
        if (cached) return cached;
        const data = await this.request(`/noticias/recientes?limit=${limit}`);
        _cache.set(key, data);
        return data;
    }

    static async getNoticia(id) {
        return await this.request(`/noticias/${id}`);
    }

    static async createNoticia(noticiaData) {
        return await this.request('/noticias', {
            method: 'POST',
            body: JSON.stringify(noticiaData)
        });
    }

    static async updateNoticia(id, noticiaData) {
        return await this.request(`/noticias/${id}`, {
            method: 'PUT',
            body: JSON.stringify(noticiaData)
        });
    }

    static async deleteNoticia(id) {
        return await this.request(`/noticias/${id}`, {
            method: 'DELETE'
        });
    }

    // Normas
    static async getNormas() {
        return await this.request('/normas');
    }

    static async createNorma(normaData) {
        return await this.request('/normas', {
            method: 'POST',
            body: JSON.stringify(normaData)
        });
    }

    static async updateNorma(id, normaData) {
        return await this.request(`/normas/${id}`, {
            method: 'PUT',
            body: JSON.stringify(normaData)
        });
    }

    static async deleteNorma(id) {
        return await this.request(`/normas/${id}`, {
            method: 'DELETE'
        });
    }

    static async reordenarNormas(normas) {
        return await this.request('/normas/reordenar/batch', {
            method: 'PUT',
            body: JSON.stringify({ normas })
        });
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
    const isInPagesFolder = window.location.pathname.includes('/pages/');

    if (!API.isAuthenticated()) {
        window.location.href = isInPagesFolder ? 'login.html' : 'pages/login.html';
        return false;
    }

    if (requireAdmin && !API.isAdmin()) {
        UI.showAlert('No tienes permisos para acceder a esta página', 'error');
        window.location.href = isInPagesFolder ? '../index.html' : 'index.html';
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
        const isInPagesFolder = window.location.pathname.includes('/pages/');
        const loginUrl = isInPagesFolder ? 'login.html' : 'pages/login.html';
        userNav.innerHTML = `
            <a href="${loginUrl}" class="btn btn-primary">Iniciar Sesión</a>
        `;
    }
}

// Inicializar al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    updateNavbar();
});
