function escapeHtml(str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
    // Mock order data
    const ordersData = {
        open: [
            { id: 'ORD-001', symbol: 'RELIANCE', type: 'Limit Buy', qty: 10, price: 2945.50, status: 'Pending', time: '10:34:21' },
            { id: 'ORD-002', symbol: 'TCS', type: 'Stop Loss', qty: 5, price: 3820.00, status: 'Triggered', time: '09:15:00' },
            { id: 'ORD-003', symbol: 'INFY', type: 'Limit Sell', qty: 20, price: 1785.00, status: 'Pending', time: '08:02:45' },
        ],
        executed: [
            { id: 'ORD-101', symbol: 'HDFCBANK', type: 'Market Buy', qty: 15, price: 1720.30, status: 'Filled', time: '15:59:58' },
            { id: 'ORD-102', symbol: 'ICICIBANK', type: 'Limit Buy', qty: 25, price: 1248.75, status: 'Filled', time: '14:22:10' },
            { id: 'ORD-103', symbol: 'SBIN', type: 'Market Sell', qty: 50, price: 815.60, status: 'Filled', time: '11:05:33' },
            { id: 'ORD-104', symbol: 'WIPRO', type: 'Limit Sell', qty: 30, price: 562.40, status: 'Filled', time: '10:00:01' },
        ],
        cancelled: [
            { id: 'ORD-201', symbol: 'BAJFINANCE', type: 'Limit Buy', qty: 3, price: 7125.00, status: 'Cancelled', time: 'Yesterday' },
        ]
    };

    const tableBody = document.getElementById('orders-table-body');
    const tabs = document.querySelectorAll('.order-tab');
    let currentTab = 'open';

    const renderOrders = (tabName) => {
        const orders = ordersData[tabName] || [];
        if (orders.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-12 text-slate-400">
                        <span class="material-symbols-outlined text-4xl block mb-2">inbox</span>
                        No ${tabName} orders
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = orders.map(order => `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td class="px-4 py-3 font-semibold text-slate-900 dark:text-white">${escapeHtml(order.symbol)}</td>
                <td class="px-4 py-3">
                    <span class="inline-flex items-center gap-1 ${order.type.includes('Buy') ? 'text-emerald-500' : 'text-rose-500'}">
                        <span class="material-symbols-outlined text-sm">${order.type.includes('Buy') ? 'arrow_upward' : 'arrow_downward'}</span>
                        ${escapeHtml(order.type)}
                    </span>
                </td>
                <td class="px-4 py-3 text-right font-mono">${escapeHtml(String(order.qty))}</td>
                <td class="px-4 py-3 text-right font-mono">₹${escapeHtml(order.price.toFixed(2))}</td>
                <td class="px-4 py-3">
                    <span class="px-2 py-0.5 text-xs font-semibold rounded ${getStatusClass(order.status)}">${escapeHtml(order.status)}</span>
                </td>
                <td class="px-4 py-3 text-slate-500">${escapeHtml(order.time)}</td>
                <td class="px-4 py-3 text-right">
                    ${tabName === 'open' ? `
                        <button class="text-xs font-semibold text-rose-500 hover:underline" data-action="cancel" data-order-id="${escapeHtml(order.id)}">Cancel</button>
                    ` : `
                        <span class="text-slate-400 text-xs">—</span>
                    `}
                </td>
            </tr>
        `).join('');
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'Filled': return 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400';
            case 'Pending': return 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400';
            case 'Triggered': return 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400';
            case 'Cancelled': return 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => {
                t.classList.remove('active', 'border-primary', 'text-primary');
                t.classList.add('border-transparent', 'text-slate-500');
            });
            tab.classList.add('active', 'border-primary', 'text-primary');
            tab.classList.remove('border-transparent', 'text-slate-500');
            currentTab = tab.dataset.tab;
            renderOrders(currentTab);
        });
    });

    // Event delegation for cancel buttons
    tableBody.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action="cancel"]');
        if (btn) {
            const orderId = btn.dataset.orderId;
            if (confirm(`Cancel order ${orderId}?`)) {
                alert(`Order ${orderId} cancelled.`);
                // In a real app, you'd remove from data and re-render
            }
        }
    });

    // Initial render
    renderOrders(currentTab);
});
