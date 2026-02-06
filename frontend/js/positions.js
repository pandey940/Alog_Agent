document.addEventListener('DOMContentLoaded', () => {
    // Mock position data
    const positionsData = [
        { symbol: 'AAPL', qty: 50, avgEntry: 172.40, markPrice: 178.85 },
        { symbol: 'MSFT', qty: 30, avgEntry: 400.00, markPrice: 415.32 },
        { symbol: 'NVDA', qty: 15, avgEntry: 850.00, markPrice: 878.50 },
        { symbol: 'GOOGL', qty: 20, avgEntry: 148.00, markPrice: 151.20 },
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
                        <span class="font-semibold text-slate-900 dark:text-white">${pos.symbol}</span>
                    </td>
                    <td class="px-4 py-3 text-right font-mono">${pos.qty}</td>
                    <td class="px-4 py-3 text-right font-mono text-slate-500">₹${pos.avgEntry.toFixed(2)}</td>
                    <td class="px-4 py-3 text-right font-mono font-semibold text-slate-900 dark:text-white">₹${pos.markPrice.toFixed(2)}</td>
                    <td class="px-4 py-3 text-right font-mono font-semibold ${isProfit ? 'text-emerald-500' : 'text-rose-500'}">
                        ${isProfit ? '+' : ''}₹${pnlDollar.toFixed(2)}
                    </td>
                    <td class="px-4 py-3 text-right font-mono font-semibold ${isProfit ? 'text-emerald-500' : 'text-rose-500'}">
                        ${isProfit ? '+' : ''}${pnlPercent.toFixed(2)}%
                    </td>
                    <td class="px-4 py-3 text-right">
                        <button class="px-3 py-1 text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white rounded transition-colors" onclick="closePosition('${pos.symbol}')">Close</button>
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

    // Global close function
    window.closePosition = (symbol) => {
        if (confirm(`Close entire position in ${symbol}?`)) {
            alert(`Position in ${symbol} closed at market price.`);
            // In real app, remove from data and re-render
        }
    };

    // Initial render
    renderPositions();
});
