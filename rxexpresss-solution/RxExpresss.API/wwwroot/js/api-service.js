// SVG Icons (inline so no dependency needed)
const Icons = {
    dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    pharmacy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9h1"/><path d="M9 13h1"/><path d="M9 17h1"/></svg>',
    truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
    package: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
    route: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>',
    dollar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    qrcode: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/><path d="M21 14h-3v3"/><path d="M21 21h-3"/><path d="M14 21v-3"/></svg>',
    mapPin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    barChart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
};

const ApiService = {
    baseUrl: '/api',
    getToken() { return localStorage.getItem('rx_token'); },
    setToken(t) { localStorage.setItem('rx_token', t); },
    getUser() { try { return JSON.parse(localStorage.getItem('rx_user') || 'null'); } catch { return null; } },
    setUser(u) { localStorage.setItem('rx_user', JSON.stringify(u)); },

    async request(method, url, data) {
        const h = { 'Content-Type': 'application/json' };
        const t = this.getToken();
        if (t) h['Authorization'] = `Bearer ${t}`;
        try {
            const r = await fetch(`${this.baseUrl}${url}`, { method, headers: h, body: data ? JSON.stringify(data) : undefined });
            if (r.status === 401) { this.logout(); return null; }
            if (r.status === 403) { alert('Access denied'); return null; }
            if (!r.ok) { const e = await r.json().catch(() => ({ detail: 'Error' })); throw new Error(e.detail || 'Request failed'); }
            return await r.json();
        } catch (e) { throw e; }
    },
    get(u) { return this.request('GET', u); },
    post(u, d) { return this.request('POST', u, d); },
    put(u, d) { return this.request('PUT', u, d); },
    delete(u) { return this.request('DELETE', u); },

    async login(email, password) {
        const d = await this.post('/auth/login', { email, password });
        if (d) { this.setToken(d.token); this.setUser(d.user); }
        return d;
    },
    logout() { localStorage.removeItem('rx_token'); localStorage.removeItem('rx_user'); window.location.href = '/index.html'; },
    isLoggedIn() { return !!this.getToken(); },
    hasRole(r) { const u = this.getUser(); return u && u.role === r; },
    requireAuth(r) {
        if (!this.isLoggedIn()) { window.location.href = '/index.html'; return false; }
        if (r && !this.hasRole(r)) { window.location.href = '/index.html'; return false; }
        return true;
    }
};

function statusBadge(s) { return `<span class="badge badge-${s}">${(s||'').replace(/_/g, ' ')}</span>`; }
function showAlert(c, t, m) { const e = document.getElementById(c); if (e) { e.innerHTML = `<div class="alert alert-${t}">${m}</div>`; setTimeout(() => e.innerHTML = '', 4000); } }
function formatDate(d) { if (!d) return '-'; return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }

function setupSidebar(items, activeId) {
    const user = ApiService.getUser();
    const sb = document.getElementById('sidebar-nav');
    if (sb) sb.innerHTML = items.map(i =>
        i.section ? `<div class="nav-section">${i.section}</div>` :
        `<a href="${i.href}" class="${i.id === activeId ? 'active' : ''}">${i.icon || ''}${i.label}</a>`
    ).join('');
    const sf = document.getElementById('sidebar-footer');
    if (sf && user) sf.innerHTML = `<div class="user-name">${user.firstName} ${user.lastName}</div><div class="user-role">${user.role}</div><button class="logout-btn" onclick="ApiService.logout()">Sign Out</button>`;
}
