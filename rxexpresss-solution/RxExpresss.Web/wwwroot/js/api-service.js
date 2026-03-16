const Icons={dashboard:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>',pharmacy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>',truck:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',package:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8l-7-4-7 4v8l7 4 7-4z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',route:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>',dollar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',qrcode:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',mapPin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',barChart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>'};
const ApiService={
    baseUrl:typeof API_BASE_URL!=='undefined'?API_BASE_URL:'/api',
    getToken(){return localStorage.getItem('rx_token')},setToken(t){localStorage.setItem('rx_token',t)},
    getUser(){try{return JSON.parse(localStorage.getItem('rx_user')||'null')}catch{return null}},setUser(u){localStorage.setItem('rx_user',JSON.stringify(u))},
    async request(m,u,d){const h={'Content-Type':'application/json'};const t=this.getToken();if(t)h['Authorization']=`Bearer ${t}`;const r=await fetch(`${this.baseUrl}${u}`,{method:m,headers:h,body:d?JSON.stringify(d):undefined});if(r.status===401){this.logout();return null}if(r.status===403)return null;if(!r.ok){const e=await r.json().catch(()=>({detail:'Error'}));throw new Error(e.detail||'Failed')}return r.json()},
    get(u){return this.request('GET',u)},post(u,d){return this.request('POST',u,d)},put(u,d){return this.request('PUT',u,d)},delete(u){return this.request('DELETE',u)},
    async login(e,p){const d=await this.post('/auth/login',{email:e,password:p});if(d){this.setToken(d.token);this.setUser(d.user)}return d},
    logout(){localStorage.removeItem('rx_token');localStorage.removeItem('rx_user');window.location.replace('/');},
    isLoggedIn(){return!!this.getToken()},hasRole(r){const u=this.getUser();return u&&u.role===r},
    requireAuth(r){if(!this.isLoggedIn()){window.location.replace('/');return false}if(r&&!this.hasRole(r)){window.location.replace('/');return false}return true}
};
function statusBadge(s){
    // Driver-friendly status labels
    const labels = {
        'assigned': 'Assigned',
        'picked_up': 'Picked Up',
        'in_transit': 'At Office',
        'dispatched': 'Dispatched',
        'out_for_delivery': 'Out for Delivery',
        'delivering_now': 'At Location',
        'delivered': 'Delivered',
        'failed': 'Failed',
        'cancelled': 'Cancelled',
        'new': 'New'
    };
    const label = labels[s] || (s||'').replace(/_/g,' ');
    return`<span class="badge badge-${s}">${label}</span>`;
}
function formatDate(d){if(!d)return'-';return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}

// Toast Notification System
(function initToastContainer() {
    if (!document.getElementById('toast-container')) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;max-width:400px';
        document.body.appendChild(container);
    }
})();

function showAlert(containerId, type, message) {
    // Use toast instead of inline alert
    toast(message, type);
}

function toast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const icons = {
        success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        danger: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };
    
    const colors = {
        success: { bg: '#dcfce7', border: '#22c55e', text: '#15803d' },
        danger: { bg: '#fee2e2', border: '#ef4444', text: '#b91c1c' },
        warning: { bg: '#fef3c7', border: '#f59e0b', text: '#b45309' },
        info: { bg: '#dbeafe', border: '#3b82f6', text: '#1d4ed8' }
    };
    
    const color = colors[type] || colors.info;
    const icon = icons[type] || icons.info;
    
    const toastEl = document.createElement('div');
    toastEl.className = 'toast-notification';
    toastEl.style.cssText = `
        display:flex;align-items:center;gap:12px;padding:14px 18px;
        background:${color.bg};border:1px solid ${color.border};border-radius:10px;
        box-shadow:0 4px 12px rgba(0,0,0,0.15);color:${color.text};
        animation:slideInRight 0.3s ease;font-size:14px;font-weight:500;
        max-width:100%;word-break:break-word;
    `;
    toastEl.innerHTML = `
        <span style="flex-shrink:0">${icon}</span>
        <span style="flex:1">${message}</span>
        <button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;padding:0;color:inherit;opacity:0.7;flex-shrink:0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
    `;
    
    container.appendChild(toastEl);
    
    // Auto remove after duration
    setTimeout(() => {
        toastEl.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toastEl.remove(), 300);
    }, duration);
}

// Add animation styles
(function addToastStyles() {
    if (!document.getElementById('toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
})();
