function escapeHtml(str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
    // Mock position data
    const positionsData = [
        { symbol: 'RELIANCE', qty: 10, avgEntry: 2880.00, markPrice: 2945.50 },
        { symbol: 'TCS', qty: 5, avgEntry: 3750.00, markPrice: 3820.00 },
        { symbol: 'HDFCBANK', qty: 15, avgEntry: 1680.00, markPrice: 1720.30 },
        { symbol: 'INFY', qty: 20, avgEntry: 1760.00, markPrice: 1785.00 },
    ];

    const tableBody = document.getElementById('positions-table-body');

    const renderPositions = () => {
        if (positionsData.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-12 text-slate-400">
                        <span class="material-symbols-outlined text-4xl block mb-2">trending_flat</span>
                        No open positions
                    </td>
                </tr>
            `;
            return;
        }

        let totalInvested = 0;
        let totalCurrent = 0;

        tableBody.innerHTML = positionsData.map(pos => {
            const invested = pos.qty * pos.avgEntry;
            const current = pos.qty * pos.markPrice;
            const pnlDollar = current - invested;
            const pnlPercent = ((pnlDollar / invested) * 100);
            const isProfit = pnlDollar >= 0;

            totalInvested += invested;
            totalCurrent += current;

            return `
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td class="px-4 py-3">
                        <span class="font-semibold text-slate-900 dark:text-white">${escapeHtml(pos.symbol)}</span>
                    </td>
                    <td class="px-4 py-3 text-right font-mono">${escapeHtml(String(pos.qty))}</td>
                    <td class="px-4 py-3 text-right font-mono text-slate-500">₹${escapeHtml(pos.avgEntry.toFixed(2))}</td>
                    <td class="px-4 py-3 text-right font-mono font-semibold text-slate-900 dark:text-white">₹${escapeHtml(pos.markPrice.toFixed(2))}</td>
                    <td class="px-4 py-3 text-right font-mono font-semibold ${isProfit ? 'text-emerald-500' : 'text-rose-500'}">
                        ${isProfit ? '+' : ''}₹${escapeHtml(pnlDollar.toFixed(2))}
                    </td>
                    <td class="px-4 py-3 text-right font-mono font-semibold ${isProfit ? 'text-emerald-500' : 'text-rose-500'}">
                        ${isProfit ? '+' : ''}${escapeHtml(pnlPercent.toFixed(2))}%
                    </td>
                    <td class="px-4 py-3 text-right">
                        <button class="px-3 py-1 text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white rounded transition-colors" data-action="close" data-symbol="${escapeHtml(pos.symbol)}">Close</button>
                    </td>
                </tr>
            `;
        }).join('');

        // Update summary cards
        const totalPnl = totalCurrent - totalInvested;
        const totalPnlPercent = ((totalPnl / totalInvested) * 100);
        const isOverallProfit = totalPnl >= 0;

        document.getElementById('total-positions').textContent = positionsData.length;
        document.getElementById('invested-value').textContent = `₹${totalInvested.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
        document.getElementById('current-value').textContent = `₹${totalCurrent.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

        const pnlElement = document.getElementById('total-pnl');
        pnlElement.className = `text-2xl font-bold ${isOverallProfit ? 'text-emerald-500' : 'text-rose-500'}`;
        pnlElement.innerHTML = `${isOverallProfit ? '+' : ''}₹${totalPnl.toFixed(0)} <span class="text-sm font-medium">(${isOverallProfit ? '+' : ''}${totalPnlPercent.toFixed(1)}%)</span>`;
    };

    // Event delegation for close buttons
    tableBody.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action="close"]');
        if (btn) {
            const symbol = btn.dataset.symbol;
            if (confirm(`Close entire position in ${symbol}?`)) {
                alert(`Position in ${symbol} closed at market price.`);
                // In real app, remove from data and re-render
            }
        }
    });

    // Initial render
    renderPositions();
});
