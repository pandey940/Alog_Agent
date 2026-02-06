document.addEventListener('DOMContentLoaded', () => {
    // Mock watchlist data
    const watchlistData = [
        { symbol: 'AAPL', name: 'Apple Inc.', price: 178.85, change: 2.15, changePercent: 1.22 },
        { symbol: 'MSFT', name: 'Microsoft Corp.', price: 415.32, change: -1.45, changePercent: -0.35 },
        { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 151.20, change: 3.80, changePercent: 2.58 },
        { symbol: 'TSLA', name: 'Tesla Inc.', price: 248.30, change: -5.70, changePercent: -2.24 },
        { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 878.50, change: 12.30, changePercent: 1.42 },
        { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 178.55, change: 0.85, changePercent: 0.48 },
        { symbol: 'META', name: 'Meta Platforms', price: 502.80, change: 8.20, changePercent: 1.66 },
        { symbol: 'AMD', name: 'AMD Inc.', price: 168.45, change: -2.10, changePercent: -1.23 },
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
                            <p class="font-bold text-slate-900 dark:text-white text-lg">${stock.symbol}</p>
                            <p class="text-xs text-slate-500 truncate max-w-[120px]">${stock.name}</p>
                        </div>
                        <button class="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-rose-500" onclick="removeFromWatchlist('${stock.symbol}')">
                            <span class="material-symbols-outlined text-sm">close</span>
                        </button>
                    </div>
                    <p class="text-2xl font-bold text-slate-900 dark:text-white mb-1">₹${stock.price.toFixed(2)}</p>
                    <p class="text-sm font-semibold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}">
                        <span class="material-symbols-outlined text-sm align-middle">${isPositive ? 'arrow_upward' : 'arrow_downward'}</span>
                        ${isPositive ? '+' : ''}${stock.change.toFixed(2)} (${isPositive ? '+' : ''}${stock.changePercent.toFixed(2)}%)
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

    // Remove from watchlist
    window.removeFromWatchlist = (symbol) => {
        if (confirm(`Remove ${symbol} from watchlist?`)) {
            const index = watchlistData.findIndex(s => s.symbol === symbol);
            if (index > -1) {
                watchlistData.splice(index, 1);
                renderWatchlist();
            }
        }
    };

    // Initial render
    renderWatchlist();
});
