const ApiService = {
    baseUrl: '/api',
    
    getToken() { return localStorage.getItem('rx_token'); },
    setToken(token) { localStorage.setItem('rx_token', token); },
    getUser() { try { return JSON.parse(localStorage.getItem('rx_user') || 'null'); } catch { return null; } },
    setUser(user) { localStorage.setItem('rx_user', JSON.stringify(user)); },
    
    async request(method, url, data) {
        const headers = { 'Content-Type': 'application/json' };
        const token = this.getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        try {
            const response = await fetch(`${this.baseUrl}${url}`, {
                method, headers,
                body: data ? JSON.stringify(data) : undefined
            });
            
            if (response.status === 401) { this.logout(); return null; }
            if (response.status === 403) { alert('Access denied'); return null; }
            if (!response.ok) {
                const err = await response.json().catch(() => ({ detail: 'Request failed' }));
                throw new Error(err.detail || 'Request failed');
            }
            return await response.json();
        } catch (err) {
            if (err.message !== 'Failed to fetch') console.error('API Error:', err.message);
            throw err;
        }
    },
    
    get(url) { return this.request('GET', url); },
    post(url, data) { return this.request('POST', url, data); },
    put(url, data) { return this.request('PUT', url, data); },
    delete(url) { return this.request('DELETE', url); },
    
    async login(email, password) {
        const data = await this.post('/auth/login', { email, password });
        if (data) { this.setToken(data.token); this.setUser(data.user); }
        return data;
    },
    
    logout() {
        localStorage.removeItem('rx_token');
        localStorage.removeItem('rx_user');
        window.location.href = '/index.html';
    },
    
    isLoggedIn() { return !!this.getToken(); },
    hasRole(role) { const u = this.getUser(); return u && u.role === role; },
    
    requireAuth(role) {
        if (!this.isLoggedIn()) { window.location.href = '/index.html'; return false; }
        if (role && !this.hasRole(role)) { alert('Access denied'); window.location.href = '/index.html'; return false; }
        return true;
    }
};

// Status badge helper
function statusBadge(status) {
    return `<span class="badge badge-${status}">${status.replace(/_/g, ' ')}</span>`;
}

// Show alert
function showAlert(container, type, message) {
    const el = document.getElementById(container);
    if (el) { el.innerHTML = `<div class="alert alert-${type}">${message}</div>`; setTimeout(() => el.innerHTML = '', 4000); }
}

// Format date
function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Setup user nav
function setupNav() {
    const user = ApiService.getUser();
    const navUser = document.getElementById('nav-user');
    if (navUser && user) {
        navUser.innerHTML = `<span>${user.firstName} ${user.lastName}</span><span class="badge-role">${user.role}</span><button class="btn btn-sm btn-outline" onclick="ApiService.logout()" style="color:#94a3b8;border-color:#475569">Logout</button>`;
    }
}
