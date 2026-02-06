function escapeHtml(str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Default top stocks (NSE) shown in scrolling bar below search
const TOP_STOCKS = [
    'TCS.NS', 'RELIANCE.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
    'SBIN.NS', 'BHARTIARTL.NS', 'ITC.NS', 'KOTAKBANK.NS', 'LT.NS',
    'HINDUNILVR.NS', 'AXISBANK.NS', 'ASIANPAINT.NS', 'MARUTI.NS', 'HCLTECH.NS'
];

// Long-term investment stocks (blue chips / index heavyweights)
const LONG_TERM_STOCKS = [
    'RELIANCE.NS', 'HDFCBANK.NS', 'INFY.NS', 'TCS.NS', 'ICICIBANK.NS',
    'ITC.NS', 'HINDUNILVR.NS', 'KOTAKBANK.NS', 'BHARTIARTL.NS', 'LT.NS',
    'ASIANPAINT.NS', 'HDFC.NS', 'NESTLEIND.NS', 'TITAN.NS', 'BAJFINANCE.NS'
];

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('globalSearchInput');
    const searchResults = document.getElementById('searchResults');
    let debounceTimer;

    // Dashboard uses PYTHON_API_URL for search/quote/history; Alpha Vantage is optional
    if (!window.APP_CONFIG || !window.APP_CONFIG.PYTHON_API_URL) {
        console.warn("APP_CONFIG.PYTHON_API_URL not set; using default http://127.0.0.1:5001/api");
    }

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();

        clearTimeout(debounceTimer);

        if (query.length < 2) {
            searchResults.classList.add('hidden');
            searchResults.innerHTML = '';
            return;
        }

        debounceTimer = setTimeout(() => {
            fetchStockData(query);
        }, 500); // Debounce for 500ms
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.add('hidden');
        }
    });

    async function fetchStockData(query) {
        // Use local Python API for search (Yahoo Finance Autocomplete)
        const baseUrl = window.APP_CONFIG.PYTHON_API_URL || 'http://127.0.0.1:5001/api';
        const url = `${baseUrl}/search?q=${query}`;

        try {
            const response = await fetch(url);

            if (!response.ok) {
                // Fallback to error handling if API is down
                console.error("Search API Error:", response.status);
                searchResults.innerHTML = '<div class="p-4 text-sm text-slate-500">Search unavailable.</div>';
                searchResults.classList.remove('hidden');
                return;
            }

            const data = await response.json();

            if (data.bestMatches && data.bestMatches.length > 0) {
                renderResults(data.bestMatches);
            } else {
                searchResults.innerHTML = '<div class="p-4 text-sm text-slate-500">No results found.</div>';
                searchResults.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error fetching stock data:', error);
            searchResults.innerHTML = '<div class="p-4 text-sm text-red-500">Error fetching data.</div>';
            searchResults.classList.remove('hidden');
        }
    }

    function renderResults(matches) {
        searchResults.innerHTML = '';

        if (matches.length === 0) {
            searchResults.innerHTML = '<div class="p-4 text-sm text-slate-500">No Indian stocks found.</div>';
            searchResults.classList.remove('hidden');
            return;
        }

        const ul = document.createElement('ul');
        ul.className = 'py-2';

        matches.forEach(match => {
            const symbol = match['1. symbol'] || '';
            const name = match['2. name'] || symbol;
            const region = match['4. region'] || '';
            const currency = match['8. currency'] || '';

            const li = document.createElement('li');
            li.className = 'px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors flex justify-between items-center group';
            li.innerHTML = `
                <div class="flex flex-col">
                    <span class="text-sm font-bold text-slate-900 dark:text-slate-100">${escapeHtml(symbol)}</span>
                    <span class="text-xs text-slate-500 truncate max-w-[200px]">${escapeHtml(name)}</span>
                </div>
                <div class="flex flex-col items-end">
                    <span class="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">${escapeHtml(region)}</span>
                    <span class="text-[10px] text-slate-400">${escapeHtml(currency)}</span>
                </div>
            `;

            li.addEventListener('click', () => {
                searchInput.value = symbol;
                searchResults.classList.add('hidden');
                selectStock(symbol);
            });

            ul.appendChild(li);
        });

        searchResults.appendChild(ul);
        searchResults.classList.remove('hidden');
    }

    async function fetchStockQuote(symbol) {
        // Use local Python API for quote data (Unlimited, Real-time)
        const baseUrl = window.APP_CONFIG.PYTHON_API_URL || 'http://127.0.0.1:5001/api';
        const url = `${baseUrl}/quote?symbol=${symbol}`;

        // Update UI immediately: chart title + loading state for price/P&L
        const valEquity = document.getElementById('val-equity');
        const valLivePrice = document.getElementById('val-live-price');
        const valPnl = document.getElementById('val-pnl');
        const mainChartTitle = document.getElementById('main-chart-title');

        if (mainChartTitle) mainChartTitle.textContent = `${symbol.replace(/\.(NS|BO)$/, '')} Performance`;
        const loadingHtml = '<span class="animate-pulse">Loading...</span>';
        if (valEquity) valEquity.innerHTML = loadingHtml;
        if (valLivePrice) valLivePrice.innerHTML = loadingHtml;
        if (valPnl) valPnl.innerHTML = loadingHtml;

        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();

            // Ignore stale response if user selected another stock meanwhile
            if (currentSymbol !== symbol) return;

            if (data.error) {
                console.warn('API Error:', data.error);
                const noData = '<span class="text-xs text-risk-warn">No Data</span>';
                if (valEquity) valEquity.innerHTML = noData;
                if (valLivePrice) valLivePrice.innerHTML = noData;
                if (valPnl) valPnl.textContent = '—';
                return;
            }

            // Extract data from Python API response
            const price = data.price;
            const change = data.change;
            const changePercent = data.change_percent;
            const formattedPrice = data.formatted_price;

            // Update Price in Portfolio Value card and Live Price in chart area
            if (valEquity) valEquity.textContent = formattedPrice;
            if (valLivePrice) valLivePrice.textContent = formattedPrice;

            // Update top stocks bar chip with change % if this symbol is in the bar
            updateTopStockChipQuote(symbol, changePercent, formattedPrice);

            // Update P&L (displayed as Daily Change)
            if (valPnl) {
                const isPositive = change >= 0;
                const changeSign = isPositive ? '+' : '';
                const percentStr = changePercent.toFixed(2) + '%';
                valPnl.textContent = `${changeSign}${change.toFixed(2)} (${percentStr})`;
                valPnl.className = `text-2xl font-extrabold tracking-tight ${isPositive ? 'text-success' : 'text-risk-danger'}`;
            }

        } catch (error) {
            if (currentSymbol !== symbol) return;
            console.error('Error fetching quote:', error);
            const offlineText = 'Offline';
            if (valEquity) valEquity.textContent = offlineText;
            if (valLivePrice) valLivePrice.textContent = offlineText;
            if (valPnl) {
                valPnl.textContent = error.message;
                valPnl.className = 'text-xs text-risk-danger font-mono';
            }
        }
    }

    // Dropdown Elements
    const notificationBtn = document.getElementById('notificationBtn');
    const notificationDropdown = document.getElementById('notificationDropdown');
    const profileBtn = document.getElementById('profileBtn');
    const profileDropdown = document.getElementById('profileDropdown');

    // Notification Dropdown Toggle
    if (notificationBtn && notificationDropdown) {
        notificationBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationDropdown.classList.toggle('hidden');
            // Close profile dropdown if open
            if (profileDropdown) profileDropdown.classList.add('hidden');
        });
    }

    // Profile Dropdown Toggle
    if (profileBtn && profileDropdown) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('hidden');
            // Close notification dropdown if open
            if (notificationDropdown) notificationDropdown.classList.add('hidden');
        });
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (notificationDropdown && !notificationDropdown.contains(e.target) && !notificationBtn?.contains(e.target)) {
            notificationDropdown.classList.add('hidden');
        }
        if (profileDropdown && !profileDropdown.contains(e.target) && !profileBtn?.contains(e.target)) {
            profileDropdown.classList.add('hidden');
        }
    });

    async function fetchDashboardStats() {
        const activeStrategiesElement = document.getElementById('active-strategies-count');
        const activeStrategiesStatus = document.getElementById('active-strategies-status');
        const marginValue = document.getElementById('margin-util-value');
        const marginBar = document.getElementById('margin-util-bar');

        const setLoading = () => {
            if (activeStrategiesElement) activeStrategiesElement.innerHTML = '<span class="animate-pulse text-slate-400">—</span>';
            if (activeStrategiesStatus) activeStrategiesStatus.textContent = '…';
            if (marginValue) marginValue.innerHTML = '<span class="animate-pulse text-slate-400">—</span>';
            if (marginBar) marginBar.style.width = '0%';
        };

        const setUnavailable = () => {
            if (activeStrategiesElement) activeStrategiesElement.textContent = '— / —';
            if (activeStrategiesStatus) activeStrategiesStatus.textContent = 'OFFLINE';
            if (marginValue) marginValue.textContent = '—';
            if (marginBar) marginBar.style.width = '0%';
        };

        const baseUrl = window.APP_CONFIG?.PYTHON_API_URL || 'http://127.0.0.1:5001/api';
        setLoading();

        try {
            const response = await fetch(baseUrl + '/stats');
            if (!response.ok) throw new Error('Stats API Error');
            const data = await response.json();

            if (activeStrategiesElement) {
                const active = String(data.active_strategies ?? 0).padStart(2, '0');
                const total = String(data.total_strategies ?? 12).padStart(2, '0');
                activeStrategiesElement.textContent = `${active} / ${total}`;
            }
            if (activeStrategiesStatus) {
                activeStrategiesStatus.textContent = `${data.paused_strategies ?? 0} PAUSED`;
            }
            if (marginValue) {
                marginValue.textContent = `${data.margin_utilization ?? 0}%`;
            }
            if (marginBar) {
                const pct = Math.min(100, Math.max(0, Number(data.margin_utilization) || 0));
                marginBar.style.width = `${pct}%`;
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
            setUnavailable();
        }
    }

    // Initial Fetch
    fetchDashboardStats();
    fetchStrategies();
    fetchAlerts();
    fetchExposure();
    fetchAvailableFund();

    // Refresh stats, strategies, alerts, exposure every 15 seconds so all features stay dynamic
    setInterval(() => {
        fetchDashboardStats();
        fetchStrategies();
        fetchAlerts();
        fetchExposure();
        fetchAvailableFund();
    }, 15000);

    // Fetch available fund for header display
    async function fetchAvailableFund() {
        const headerFundEl = document.getElementById('headerAvailableFund');
        if (!headerFundEl) return;

        const baseUrl = window.APP_CONFIG?.PYTHON_API_URL || 'http://127.0.0.1:5001/api';
        try {
            const response = await fetch(`${baseUrl}/account/funds`);
            if (!response.ok) throw new Error('Funds API Error');
            const data = await response.json();

            if (data.status === 'success' && data.data) {
                headerFundEl.textContent = data.data.formatted_balance || '₹0.00';
                // Add a subtle animation on update
                headerFundEl.classList.add('animate-pulse');
                setTimeout(() => headerFundEl.classList.remove('animate-pulse'), 500);
            }
        } catch (error) {
            console.error('Error fetching funds:', error);
            headerFundEl.textContent = '₹—';
        }
    }

    // Single entry point when user selects a stock (chip or search): updates chart, quote, P&L, title, highlight
    function selectStock(symbol) {
        currentSymbol = symbol;
        setActiveTopStock(symbol);
        fetchStockQuote(symbol);
        renderMarketChart(symbol);
    }

    // Top stocks and long-term bars: render and wire chip clicks to selectStock
    renderTopStocksBar(selectStock);
    renderLongTermStocksBar(selectStock);
    setActiveTopStock('TCS.NS');

    // Fetch quotes for all chips in both bars (prices + change %)
    fetchAllBarQuotes();


    // Auto Refresh Logic
    let autoRefreshInterval = null;
    const autoRefreshToggle = document.getElementById('autoRefreshToggle');

    if (autoRefreshToggle) {
        autoRefreshToggle.addEventListener('change', () => {
            if (autoRefreshToggle.checked) {
                startAutoRefresh();
                // Provide immediate feedback
                const span = autoRefreshToggle.nextElementSibling;
                if (span) {
                    span.classList.remove('text-slate-400');
                    span.classList.add('text-primary');
                    span.textContent = 'Refreshing...';
                    setTimeout(() => { span.textContent = 'Auto Refresh'; }, 1000);
                }
            } else {
                stopAutoRefresh();
                const span = autoRefreshToggle.nextElementSibling;
                if (span) {
                    span.classList.add('text-slate-400');
                    span.classList.remove('text-primary');
                }
            }
        });
    }

    function startAutoRefresh() {
        if (autoRefreshInterval) clearInterval(autoRefreshInterval);
        console.log("Auto-refresh started");

        // Refresh every 5 seconds
        autoRefreshInterval = setInterval(() => {
            if (currentSymbol) {
                // Flash the "Live Price" label slightly to indicate update
                const livePriceLabel = document.querySelector('#val-live-price')?.nextElementSibling;
                if (livePriceLabel) {
                    livePriceLabel.classList.add('text-primary');
                    setTimeout(() => livePriceLabel.classList.remove('text-primary'), 500);
                }

                fetchStockQuote(currentSymbol);
                renderMarketChart(currentSymbol, currentPeriod, currentInterval);
            }
        }, 5000);
    }

    function stopAutoRefresh() {
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
            console.log("Auto-refresh stopped");
        }
    }

    // Initial chart and quote (after DOM is ready)
    selectStock('TCS.NS');
});

function renderTopStocksBar(onSelectStock) {
    const container = document.getElementById('topStocksScroll');
    if (!container) return;
    container.innerHTML = '';
    TOP_STOCKS.forEach(symbol => {
        appendStockChip(container, symbol, () => onSelectStock && onSelectStock(symbol));
    });
}

function renderLongTermStocksBar(onSelectStock) {
    const container = document.getElementById('longTermStocksScroll');
    if (!container) return;
    container.innerHTML = '';
    LONG_TERM_STOCKS.forEach(symbol => {
        appendStockChip(container, symbol, () => onSelectStock && onSelectStock(symbol));
    });
}

function appendStockChip(container, symbol, onSelect) {
    const label = symbol.replace(/\.(NS|BO)$/, '');
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'top-stock-chip';
    chip.dataset.symbol = symbol;
    chip.innerHTML = `<span class="chip-label">${escapeHtml(label)}</span> <span class="chip-price">—</span> <span class="chip-change hidden"></span>`;
    chip.addEventListener('click', onSelect);
    container.appendChild(chip);
}

function setActiveTopStock(symbol) {
    document.querySelectorAll('.top-stock-chip').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.symbol === symbol);
    });
}

function updateTopStockChipQuote(symbol, changePercent, formattedPrice) {
    const chips = document.querySelectorAll(`.top-stock-chip[data-symbol="${symbol}"]`);
    chips.forEach(chip => {
        const priceEl = chip.querySelector('.chip-price');
        const changeEl = chip.querySelector('.chip-change');
        if (priceEl) priceEl.textContent = formattedPrice || '—';
        if (changeEl) {
            changeEl.classList.remove('hidden', 'positive', 'negative');
            const isPos = changePercent >= 0;
            changeEl.classList.add(isPos ? 'positive' : 'negative');
            changeEl.textContent = (isPos ? '+' : '') + changePercent.toFixed(2) + '%';
        }
    });
}

async function fetchAllBarQuotes() {
    const baseUrl = window.APP_CONFIG?.PYTHON_API_URL || 'http://127.0.0.1:5001/api';
    const allSymbols = [...new Set([...TOP_STOCKS, ...LONG_TERM_STOCKS])];
    const results = await Promise.allSettled(
        allSymbols.map(sym => fetch(`${baseUrl}/quote?symbol=${sym}`).then(r => r.json()))
    );
    results.forEach((result, i) => {
        if (result.status === 'fulfilled' && result.value && !result.value.error) {
            const d = result.value;
            updateTopStockChipQuote(d.symbol, d.change_percent, d.formatted_price);
        }
    });
}

async function fetchStrategies() {
    const tbody = document.getElementById('strategies-table-body');
    if (!tbody) return;

    const setLoading = () => {
        tbody.innerHTML = '<tr class="animate-pulse"><td colspan="5" class="px-6 py-4 text-center text-slate-400 text-xs">Loading strategies…</td></tr>';
    };
    const setError = () => {
        tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-risk-warn text-xs">Strategies unavailable. Retrying…</td></tr>';
    };

    setLoading();
    const baseUrl = window.APP_CONFIG?.PYTHON_API_URL || 'http://127.0.0.1:5001/api';
    try {
        const response = await fetch(`${baseUrl}/strategies`);
        if (!response.ok) throw new Error('Strategies API Error');
        const data = await response.json();
        const strategies = data.strategies || [];

        tbody.innerHTML = '';
        strategies.forEach(strategy => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group';
            const pnlColor = strategy.pnl >= 0 ? 'text-success' : 'text-danger';
            const pnlSign = strategy.pnl >= 0 ? '+' : '';
            const statusColor = strategy.status === 'active' ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700';
            const togglePos = strategy.status === 'active' ? 'right-1' : 'left-1';
            tr.innerHTML = `
                <td class="px-6 py-4 font-bold flex items-center gap-3">
                    <div class="w-2 h-2 rounded-full bg-${strategy.color || 'slate'}"></div>
                    ${escapeHtml(strategy.name)}
                </td>
                <td class="px-6 py-4 text-center">
                    <div class="w-10 h-5 ${statusColor} rounded-full relative mx-auto cursor-pointer">
                        <div class="absolute ${togglePos} top-1 w-3 h-3 bg-white rounded-full"></div>
                    </div>
                </td>
                <td class="px-6 py-4 text-right ${pnlColor} font-bold">${pnlSign}₹${Math.abs(strategy.pnl || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td class="px-6 py-4 text-right text-slate-400">${Number(strategy.drawdown ?? 0).toFixed(1)}%</td>
                <td class="px-6 py-4 text-center">
                    <button class="text-slate-400 hover:text-primary"><span class="material-symbols-outlined text-lg">edit</span></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error("Strategies fetch error:", e);
        setError();
    }
}

async function fetchAlerts() {
    const container = document.getElementById('alerts-container');
    const badgeEl = document.getElementById('alerts-active-count');
    if (!container) return;

    const setLoading = () => {
        container.innerHTML = '<div class="text-center text-slate-400 text-xs py-4 animate-pulse">Checking for alerts…</div>';
        if (badgeEl) badgeEl.textContent = '— ACTIVE';
    };
    const setError = () => {
        container.innerHTML = '<div class="text-center text-risk-warn text-xs py-4">Alerts unavailable. Retrying…</div>';
        if (badgeEl) badgeEl.textContent = '— ACTIVE';
    };

    setLoading();
    const baseUrl = window.APP_CONFIG?.PYTHON_API_URL || 'http://127.0.0.1:5001/api';
    try {
        const response = await fetch(`${baseUrl}/alerts`);
        if (!response.ok) throw new Error('Alerts API Error');
        const data = await response.json();
        const alerts = data.alerts || [];
        const activeCount = data.active_count ?? alerts.length;

        if (badgeEl) badgeEl.textContent = `${activeCount} ACTIVE`;

        container.innerHTML = '';
        alerts.forEach(alert => {
            let borderColor = 'border-slate-500';
            let bgColor = 'bg-slate-500/5';
            let iconColor = 'text-slate-500';
            let icon = 'info';
            if (alert.type === 'warning') {
                borderColor = 'border-danger';
                bgColor = 'bg-danger/5 dark:bg-danger/10';
                iconColor = 'text-danger';
                icon = 'warning';
            } else if (alert.type === 'info') {
                borderColor = 'border-primary';
                bgColor = 'bg-primary/5 dark:bg-primary/10';
                iconColor = 'text-primary';
                icon = 'info';
            } else if (alert.type === 'success') {
                borderColor = 'border-amber-500';
                bgColor = 'bg-amber-500/5 dark:bg-amber-500/10';
                iconColor = 'text-amber-500';
                icon = 'notifications_active';
            }

            const div = document.createElement('div');
            div.className = `p-4 rounded border-l-4 ${borderColor} ${bgColor}`;
            div.innerHTML = `
                <div class="flex gap-3">
                    <span class="material-symbols-outlined ${iconColor} text-lg">${icon}</span>
                    <div>
                        <h4 class="text-xs font-bold uppercase mb-1">${escapeHtml(alert.title || '')}</h4>
                        <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-2">${escapeHtml(alert.message || '')}</p>
                        <span class="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">${escapeHtml(alert.time || '')} · ${escapeHtml(alert.tag || '')}</span>
                    </div>
                </div>
            `;
            container.appendChild(div);
        });
    } catch (e) {
        console.error("Alerts fetch error:", e);
        setError();
    }
}

async function fetchExposure() {
    const container = document.getElementById('exposure-container');
    if (!container) return;

    const setLoading = () => {
        container.innerHTML = `
            <div class="flex justify-between items-end mb-1"><span class="text-xs font-medium">Equities</span><span class="text-xs text-slate-400 animate-pulse">—</span></div>
            <div class="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden animate-pulse"></div>
            <div class="flex justify-between items-end mb-1 pt-2"><span class="text-xs font-medium">Crypto</span><span class="text-xs text-slate-400 animate-pulse">—</span></div>
            <div class="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden animate-pulse"></div>
            <div class="flex justify-between items-end mb-1 pt-2"><span class="text-xs font-medium">FX / Commodities</span><span class="text-xs text-slate-400 animate-pulse">—</span></div>
            <div class="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden animate-pulse"></div>
        `;
    };
    const setError = () => {
        container.innerHTML = '<div class="text-center text-risk-warn text-xs py-2">Exposure unavailable. Retrying…</div>';
    };

    setLoading();
    const baseUrl = window.APP_CONFIG?.PYTHON_API_URL || 'http://127.0.0.1:5001/api';
    try {
        const response = await fetch(`${baseUrl}/exposure`);
        if (!response.ok) throw new Error('Exposure API Error');
        const data = await response.json();
        const equities = Math.min(100, Math.max(0, Number(data.equities) || 0));
        const crypto = Math.min(100, Math.max(0, Number(data.crypto) || 0));
        const fx = Math.min(100, Math.max(0, 100 - equities - crypto));

        container.innerHTML = `
            <div class="flex justify-between items-end mb-1">
                <span class="text-xs font-medium">Equities</span>
                <span class="text-xs font-bold uppercase">${equities}%</span>
            </div>
            <div class="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div class="bg-primary h-full transition-all duration-500" style="width: ${equities}%"></div>
            </div>
            <div class="flex justify-between items-end mb-1 pt-2">
                <span class="text-xs font-medium">Crypto</span>
                <span class="text-xs font-bold uppercase">${crypto}%</span>
            </div>
            <div class="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div class="bg-amber-500 h-full transition-all duration-500" style="width: ${crypto}%"></div>
            </div>
            <div class="flex justify-between items-end mb-1 pt-2">
                <span class="text-xs font-medium">FX / Commodities</span>
                <span class="text-xs font-bold uppercase">${fx}%</span>
            </div>
            <div class="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div class="bg-slate-400 h-full transition-all duration-500" style="width: ${fx}%"></div>
            </div>
        `;
    } catch (e) {
        console.error("Exposure fetch error:", e);
        setError();
    }
}

let marketChartInstance = null;
let currentSymbol = 'TCS.NS';
let currentPeriod = '1mo';
let currentInterval = '1d';

// Toggle Indicators Dropdown
const indicatorsBtn = document.getElementById('indicatorsBtn');
const indicatorsDropdown = document.getElementById('indicatorsDropdown');
if (indicatorsBtn && indicatorsDropdown) {
    indicatorsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        indicatorsDropdown.classList.toggle('hidden');
    });
    indicatorsDropdown.addEventListener('click', (e) => e.stopPropagation());
    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (!indicatorsDropdown.contains(e.target) && !indicatorsBtn.contains(e.target)) {
            indicatorsDropdown.classList.add('hidden');
        }
    });

    // Re-render chart when indicators change
    document.querySelectorAll('.indicator-checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
            renderMarketChart(currentSymbol, currentPeriod, currentInterval);
        });
    });
}

// Full View Toggle
const fullViewBtn = document.getElementById('fullViewBtn');
const chartContainer = document.getElementById('chartContainer');
if (fullViewBtn && chartContainer) {
    fullViewBtn.addEventListener('click', () => {
        chartContainer.classList.toggle('fixed');
        chartContainer.classList.toggle('inset-0');
        chartContainer.classList.toggle('z-50');
        chartContainer.classList.toggle('bg-white');
        chartContainer.classList.toggle('dark:bg-panel-dark');
        chartContainer.classList.toggle('h-64'); // Remove fixed height
        chartContainer.classList.toggle('h-screen'); // Add full height
        chartContainer.classList.toggle('p-2');
        chartContainer.classList.toggle('p-8');

        // Resize chart
        if (marketChartInstance) marketChartInstance.resize();
    });
}

async function renderMarketChart(symbol, period = currentPeriod, interval = currentInterval) {
    currentSymbol = symbol;
    currentPeriod = period;
    currentInterval = interval;

    const ctx = document.getElementById('marketChart');
    if (!ctx) return;

    // Get Active Indicators
    const activeIndicators = Array.from(document.querySelectorAll('.indicator-checkbox:checked')).map(cb => cb.value);
    const hasRSI = activeIndicators.includes('rsi');
    const hasMACD = activeIndicators.includes('macd');

    const baseUrl = window.APP_CONFIG.PYTHON_API_URL || 'http://127.0.0.1:5001/api';

    try {
        const response = await fetch(`${baseUrl}/history?symbol=${symbol}&period=${period}&interval=${interval}`);
        if (!response.ok) throw new Error('History API Error');
        const data = await response.json();

        // Ignore stale response if user selected another stock meanwhile
        if (currentSymbol !== symbol) return;

        if (!data.data || !data.data.length) return;

        // Data Parsing
        const dates = data.data.map(d => new Date(d.date).getTime());
        const prices = data.data.map(d => d.close);
        const volumes = data.data.map(d => d.volume);

        const datasets = [
            {
                label: 'Price (₹)',
                data: prices,
                borderColor: '#00cec9',
                backgroundColor: 'rgba(0, 206, 201, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                yAxisID: 'y',
                fill: true,
                pointRadius: 0,
                order: 1
            },
            {
                label: 'Volume',
                data: volumes,
                type: 'bar',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                yAxisID: 'y1',
                barThickness: 'flex',
                order: 2
            }
        ];

        // Add Indicators
        if (activeIndicators.includes('ema')) {
            datasets.push({
                label: 'EMA (9)',
                data: data.data.map(d => d.ema_9),
                borderColor: '#fbbf24', // Amber
                borderWidth: 1.5,
                pointRadius: 0,
                yAxisID: 'y',
                tension: 0.4,
                order: 0
            });
            datasets.push({
                label: 'EMA (21)',
                data: data.data.map(d => d.ema_21),
                borderColor: '#f472b6', // Pink
                borderWidth: 1.5,
                pointRadius: 0,
                yAxisID: 'y',
                tension: 0.4,
                order: 0
            });
        }

        if (activeIndicators.includes('vwap')) {
            datasets.push({
                label: 'VWAP',
                data: data.data.map(d => d.vwap),
                borderColor: '#a855f7', // Purple
                borderWidth: 1.5,
                borderDash: [5, 5],
                pointRadius: 0,
                yAxisID: 'y',
                tension: 0.4,
                order: 0
            });
        }

        if (hasRSI) {
            datasets.push({
                label: 'RSI (14)',
                data: data.data.map(d => d.rsi),
                borderColor: '#60a5fa', // Blue
                borderWidth: 1.5,
                pointRadius: 0,
                yAxisID: 'y_rsi',
                tension: 0.1,
                order: 3
            });
        }

        if (hasMACD) {
            datasets.push({
                label: 'MACD',
                data: data.data.map(d => d.macd),
                borderColor: '#34d399', // Green
                borderWidth: 1.5,
                pointRadius: 0,
                yAxisID: 'y_macd',
                tension: 0.1,
                order: 4
            });
            datasets.push({
                label: 'Signal',
                data: data.data.map(d => d.macd_signal),
                borderColor: '#f87171', // Red
                borderWidth: 1.5,
                pointRadius: 0,
                yAxisID: 'y_macd',
                tension: 0.1,
                order: 4
            });
        }

        if (marketChartInstance) {
            marketChartInstance.destroy();
        }

        // Calculate Layout Weights (Stacking)
        // Main: 1, RSI: 0.3, MACD: 0.3
        // If RSI is on, main chart takes up less space

        const scales = {
            x: {
                type: 'time',
                time: {
                    unit: period === '1d' ? 'hour' : getUnitForPeriod(period),
                    displayFormats: { hour: 'h:mm a' }
                },
                grid: { display: false, borderColor: '#334155' },
                ticks: { color: '#94a3b8', maxTicksLimit: period === '1d' ? 12 : 8 }
            },
            y: {
                type: 'linear',
                display: true,
                position: 'right',
                grid: { color: '#1e293b' },
                ticks: { color: '#94a3b8' },
                stack: 'main',
                weight: 2
            },
            y1: {
                type: 'linear',
                display: false,
                position: 'left',
                grid: { display: false },
                beginAtZero: true
            }
        };

        if (hasRSI) {
            scales.y_rsi = {
                type: 'linear',
                display: true,
                position: 'right',
                grid: { color: '#1e293b', borderDash: [2, 2] },
                ticks: { color: '#60a5fa' },
                min: 0,
                max: 100,
                stack: 'main',
                weight: 1,
                title: { display: true, text: 'RSI' }
            };
        }

        if (hasMACD) {
            scales.y_macd = {
                type: 'linear',
                display: true,
                position: 'right',
                grid: { color: '#1e293b', borderDash: [2, 2] },
                ticks: { color: '#34d399' },
                stack: 'main',
                weight: 1,
                title: { display: true, text: 'MACD' }
            };
        }

        marketChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false }, // Keep hidden or custom legend
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: scales
            }
        });

    } catch (error) {
        console.error('Chart Error:', error);
    }
}

function getUnitForPeriod(period) {
    if (period === '1d') return 'minute'; // Use minute for better granularity on 1D, Chart.js will auto-step
    if (period === '5d') return 'day';
    if (period === '1mo') return 'week';
    if (period === '6mo') return 'month';
    return 'month';
}

function getTimeConfig(period) {
    if (period === '1d') {
        return {
            unit: 'minute',
            displayFormats: { minute: 'h:mm a' },
            tooltipFormat: 'h:mm a'
        };
    }
    return { unit: getUnitForPeriod(period) };
}




// Timeframe Button Listeners (use currentTarget so click on icon/child still works)
document.querySelectorAll('.timeframe-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const button = e.currentTarget;
        document.querySelectorAll('.timeframe-btn').forEach(b => {
            b.classList.remove('bg-primary/20', 'text-primary');
            b.classList.add('text-slate-400');
        });
        button.classList.remove('text-slate-400');
        button.classList.add('bg-primary/20', 'text-primary');

        const period = button.getAttribute('data-period');
        const interval = button.getAttribute('data-interval');

        console.log(`Timeframe changed: ${period}, ${interval}`);
        renderMarketChart(currentSymbol, period, interval);
    });
});
