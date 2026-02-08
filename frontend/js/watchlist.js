function escapeHtml(str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
    // Mock watchlist data
    const watchlistData = [
        { symbol: 'RELIANCE', name: 'Reliance Industries', price: 2945.50, change: 32.10, changePercent: 1.10 },
        { symbol: 'TCS', name: 'Tata Consultancy Services', price: 3820.00, change: -18.50, changePercent: -0.48 },
        { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.', price: 1720.30, change: 22.80, changePercent: 1.34 },
        { symbol: 'INFY', name: 'Infosys Ltd.', price: 1785.00, change: -9.25, changePercent: -0.52 },
        { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd.', price: 1248.75, change: 15.60, changePercent: 1.27 },
        { symbol: 'SBIN', name: 'State Bank of India', price: 815.60, change: 6.40, changePercent: 0.79 },
        { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd.', price: 7125.00, change: -85.00, changePercent: -1.18 },
        { symbol: 'WIPRO', name: 'Wipro Ltd.', price: 562.40, change: 4.15, changePercent: 0.74 },
    ];

    const grid = document.getElementById('watchlist-grid');
    const addBtn = document.getElementById('add-symbol-btn');

    const renderWatchlist = () => {
        grid.innerHTML = watchlistData.map(stock => {
            const isPositive = stock.change >= 0;
            return `
                <div class="bg-white dark:bg-panel-dark rounded-lg border border-slate-200 dark:border-slate-800 p-4 hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer group">
                    <div class="flex items-start justify-between mb-3">
                        <div>
                            <p class="font-bold text-slate-900 dark:text-white text-lg">${escapeHtml(stock.symbol)}</p>
                            <p class="text-xs text-slate-500 truncate max-w-[120px]">${escapeHtml(stock.name)}</p>
                        </div>
                        <button class="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-rose-500" data-action="remove" data-symbol="${escapeHtml(stock.symbol)}">
                            <span class="material-symbols-outlined text-sm">close</span>
                        </button>
                    </div>
                    <p class="text-2xl font-bold text-slate-900 dark:text-white mb-1">₹${escapeHtml(stock.price.toFixed(2))}</p>
                    <p class="text-sm font-semibold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}">
                        <span class="material-symbols-outlined text-sm align-middle">${isPositive ? 'arrow_upward' : 'arrow_downward'}</span>
                        ${isPositive ? '+' : ''}${escapeHtml(stock.change.toFixed(2))} (${isPositive ? '+' : ''}${escapeHtml(stock.changePercent.toFixed(2))}%)
                    </p>
                </div>
            `;
        }).join('');
    };

    // Add symbol mock
    addBtn.addEventListener('click', () => {
        const symbol = prompt('Enter stock symbol to add:');
        if (symbol) {
            alert(`${symbol.toUpperCase()} added to watchlist!`);
            // In a real app, fetch data and add to watchlistData
        }
    });

    // Event delegation for remove buttons
    grid.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action="remove"]');
        if (btn) {
            const symbol = btn.dataset.symbol;
            if (confirm(`Remove ${symbol} from watchlist?`)) {
                const index = watchlistData.findIndex(s => s.symbol === symbol);
                if (index > -1) {
                    watchlistData.splice(index, 1);
                    renderWatchlist();
                }
            }
        }
    });

    // Initial render
    renderWatchlist();
});
