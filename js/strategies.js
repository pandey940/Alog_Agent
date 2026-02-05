document.addEventListener('DOMContentLoaded', () => {
    console.log(' Strategies.js loaded');
    fetchMyStrategies();

    // Handle initial hash scroll
    setTimeout(handleScrollToHash, 500);

    // Auto-refresh every 15 seconds
    setInterval(fetchMyStrategies, 15000);
});

// Listen for hash changes (clicking sidebar links)
window.addEventListener('hashchange', handleScrollToHash);

function handleScrollToHash() {
    const hash = window.location.hash;
    if (hash === '#my-strategies') {
        const target = document.getElementById('my-strategies');
        const container = document.getElementById('main-scroll-container');
        if (target && container) {
            console.log('Scrolling to My Strategies...');
            // Calculate position relative to container
            container.scrollTo({
                top: target.offsetTop - container.offsetTop,
                behavior: 'smooth'
            });
        }
    }
}


async function fetchMyStrategies() {
    console.log('Fetching my strategies...');
    const container = document.getElementById('my-strategies-container');
    const loadingEl = document.getElementById('my-strategies-loading');

    if (!container) return;

    const baseUrl = window.APP_CONFIG?.PYTHON_API_URL || 'http://127.0.0.1:5001/api';

    try {
        const response = await fetch(`${baseUrl}/strategies`);
        if (!response.ok) throw new Error('Strategies API Error');

        const data = await response.json();
        const strategies = data.strategies || [];

        // Hide loading after first load
        if (loadingEl) loadingEl.style.display = 'none';

        if (strategies.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12 bg-slate-50 dark:bg-card-dark rounded-lg border border-dashed border-slate-300 dark:border-border-dark">
                    <span class="material-symbols-outlined text-4xl text-slate-300 mb-2">smart_toy</span>
                    <p class="text-slate-500 font-medium">No active strategies found</p>
                    <button class="mt-4 text-primary text-sm font-bold hover:underline">Deploy from Library</button>
                </div>
            `;
            return;
        }

        container.innerHTML = '';

        strategies.forEach(strategy => {
            const card = document.createElement('div');
            card.className = 'bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-lg p-5 flex flex-col gap-4 hover:border-primary/50 transition-all group cursor-pointer relative overflow-hidden';

            // Status Badge
            const statusColor = strategy.status === 'active' ? 'bg-green-500' : 'bg-slate-400';
            const statusText = strategy.status === 'active' ? 'RUNNING' : 'PAUSED';

            // PnL Color
            const pnl = strategy.pnl || 0;
            const pnlClass = pnl >= 0 ? 'text-success' : 'text-danger';
            const pnlSign = pnl >= 0 ? '+' : '';
            const pnlFormatted = `₹${Math.abs(pnl).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

            card.innerHTML = `
                <div class="flex justify-between items-start z-10">
                    <div class="flex flex-col">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">My Strategy</span>
                        <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            ${strategy.name}
                        </h3>
                    </div>
                    <div class="px-2 py-0.5 rounded text-[10px] font-bold ${statusColor}/10 ${statusColor.replace('bg-', 'text-')} border ${statusColor.replace('bg-', 'border-')}/20 flex items-center gap-1">
                        <span class="w-1.5 h-1.5 rounded-full ${statusColor} animate-pulse"></span>
                        ${statusText}
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-3 mt-2">
                    <div class="flex flex-col p-2 bg-slate-50 dark:bg-background-dark/50 rounded">
                        <p class="text-[10px] text-slate-500 uppercase font-bold">Total P&L</p>
                        <p class="text-sm font-bold ${pnlClass}">${pnlSign}${pnlFormatted}</p>
                    </div>
                    <div class="flex flex-col p-2 bg-slate-50 dark:bg-background-dark/50 rounded">
                        <p class="text-[10px] text-slate-500 uppercase font-bold">Drawdown</p>
                        <p class="text-sm font-bold text-slate-600 dark:text-slate-300">${strategy.drawdown}%</p>
                    </div>
                </div>

                <div class="flex items-center gap-2 mt-2 pt-4 border-t border-slate-100 dark:border-border-dark">
                    <button class="flex-1 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded hover:bg-primary hover:text-white transition-colors">
                        Configure
                    </button>
                    <button class="flex-1 py-1.5 bg-slate-100 dark:bg-background-dark text-slate-600 dark:text-slate-300 text-xs font-bold rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                        Logs
                    </button>
                    <button class="p-1.5 text-danger hover:bg-danger/10 rounded transition-colors" title="Stop Strategy">
                        <span class="material-symbols-outlined text-lg">stop_circle</span>
                    </button>
                </div>
            `;

            container.appendChild(card);
        });

    } catch (error) {
        console.error('Error fetching my strategies:', error);
        if (loadingEl) {
            loadingEl.textContent = 'Failed to load strategies. Retrying...';
            loadingEl.className = 'col-span-full text-center py-8 text-danger text-sm';
        }
    }
}
