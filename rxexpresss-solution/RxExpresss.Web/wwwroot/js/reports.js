// Shared reports helpers (used by Admin and Pharmacy Reports pages)
const ReportsUI = {
    // Default: last 30 days
    defaultRange() {
        const to = new Date();
        const from = new Date(); from.setDate(from.getDate() - 29);
        return { from: this.fmt(from), to: this.fmt(to) };
    },

    fmt(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    },

    // Quick range presets
    applyPreset(preset) {
        const now = new Date();
        let from, to = new Date(now);
        switch (preset) {
            case 'today': from = new Date(now); break;
            case '7d': from = new Date(now); from.setDate(from.getDate() - 6); break;
            case '30d': from = new Date(now); from.setDate(from.getDate() - 29); break;
            case 'this_month':
                from = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'last_month': {
                from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                to = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            }
            case 'this_year':
                from = new Date(now.getFullYear(), 0, 1);
                break;
            case 'ytd':
                from = new Date(now.getFullYear(), 0, 1);
                break;
            default: from = new Date(now); from.setDate(from.getDate() - 29);
        }
        document.getElementById('r-from').value = this.fmt(from);
        document.getElementById('r-to').value = this.fmt(to);
    },

    buildQuery(params) {
        const q = new URLSearchParams();
        Object.keys(params).forEach(k => {
            const v = params[k];
            if (v !== null && v !== undefined && v !== '') q.set(k, v);
        });
        return q.toString();
    },

    tile(label, value, color) {
        return `<div class="stat-card" style="border-left:4px solid ${color}">
            <div class="stat-label">${label}</div>
            <div class="stat-value">${value}</div>
        </div>`;
    },

    statusColor(s) {
        const colors = {
            delivered: '#22c55e', failed: '#ef4444', cancelled: '#6b7280',
            new: '#3b82f6', assigned: '#8b5cf6', picked_up: '#f59e0b',
            in_transit: '#06b6d4', dispatched: '#0891b2',
            out_for_delivery: '#10b981', delivering_now: '#059669'
        };
        return colors[s] || '#64748b';
    },

    money(n) {
        return '$' + (Number(n) || 0).toFixed(2);
    },

    renderMonthly(months, mountId) {
        if (!months.length) {
            document.getElementById(mountId).innerHTML = '<p class="text-gray text-center">No data in this range.</p>';
            return;
        }
        const max = Math.max(...months.map(m => m.total), 1);
        const rows = months.map(m => {
            const pct = Math.round((m.total / max) * 100);
            return `<tr>
                <td><strong>${m.label}</strong></td>
                <td>${m.total}</td>
                <td><span style="color:#22c55e">${m.delivered}</span></td>
                <td><span style="color:#ef4444">${m.failed}</span></td>
                <td><span style="color:#6b7280">${m.cancelled}</span></td>
                <td>${this.money(m.revenue)}</td>
                <td>${this.money(m.copayCollected)}</td>
                <td style="min-width:140px">
                    <div style="background:#eef2f7;border-radius:4px;height:10px;width:100%;overflow:hidden">
                        <div style="background:linear-gradient(90deg,#3b82f6,#06b6d4);height:100%;width:${pct}%"></div>
                    </div>
                </td>
            </tr>`;
        }).join('');
        document.getElementById(mountId).innerHTML = `
            <table>
                <thead><tr>
                    <th>Month</th><th>Total</th><th>Delivered</th><th>Failed</th><th>Cancelled</th>
                    <th>Revenue</th><th>Copay</th><th>Volume</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>`;
    },

    renderSummaryTiles(summary, mountId) {
        const t = summary.totals, r = summary.revenue, p = summary.performance;
        document.getElementById(mountId).innerHTML = `
            <div class="row" style="gap:12px;flex-wrap:wrap">
                ${this.tile('Total Orders', t.total, '#3b82f6')}
                ${this.tile('Delivered', `${t.delivered} <span style="font-size:14px;color:#64748b">(${t.deliveredRate}%)</span>`, '#22c55e')}
                ${this.tile('Failed', `${t.failed} <span style="font-size:14px;color:#64748b">(${t.failedRate}%)</span>`, '#ef4444')}
                ${this.tile('Pending', t.pending, '#f59e0b')}
                ${this.tile('Revenue (Fees)', this.money(r.deliveryFees), '#0891b2')}
                ${this.tile('Copay Collected', this.money(r.copayCollected), '#8b5cf6')}
                ${this.tile('Copay Pending', this.money(r.copayPending), '#ef4444')}
                ${this.tile('Avg Delivery', `${p.avgDeliveryMinutes} <span style="font-size:14px;color:#64748b">min</span>`, '#06b6d4')}
            </div>`;
    },

    renderStatusBreakdown(summary, mountId) {
        const entries = Object.entries(summary.statusBreakdown || {});
        if (!entries.length) {
            document.getElementById(mountId).innerHTML = '<p class="text-gray">No orders.</p>';
            return;
        }
        const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
        document.getElementById(mountId).innerHTML = entries
            .sort((a, b) => b[1] - a[1])
            .map(([k, v]) => {
                const pct = Math.round((v / total) * 100);
                const color = this.statusColor(k);
                return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
                    <div style="width:130px;font-size:13px;text-transform:capitalize">${k.replace(/_/g, ' ')}</div>
                    <div style="flex:1;background:#eef2f7;border-radius:4px;height:14px;overflow:hidden">
                        <div style="background:${color};height:100%;width:${pct}%"></div>
                    </div>
                    <div style="width:80px;text-align:right;font-size:13px"><strong>${v}</strong> (${pct}%)</div>
                </div>`;
            }).join('');
    }
};
