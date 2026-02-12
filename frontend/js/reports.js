/**
 * Performance Reports — Frontend Logic
 * Loads real trade data from the API and renders performance metrics,
 * trade history, and daily P&L breakdown.
 */

const API_URL = window.APP_CONFIG?.PYTHON_API_URL || 'http://127.0.0.1:5001/api';
const AUTH_TOKEN = window.APP_CONFIG?.API_TOKEN || 'change-me-to-a-strong-random-secret';

const headers = () => ({
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json',
});

const $ = id => document.getElementById(id);

let currentDays = 30;

async function apiGet(path) {
    const res = await fetch(`${API_URL}${path}`, { headers: headers() });
    return res.json();
}

// ─── Load Reports ──────────────────────────────
async function loadReports(days) {
    currentDays = days;
    updateDateButtons(days);

    try {
        const res = await apiGet(`/reports?days=${days}`);
        if (res.status === 'success') {
            renderSummary(res.data.summary);
            renderTradesTable(res.data.trades);
            renderDailyPnl(res.data.daily_pnl);
            renderSectorBreakdown(res.data.summary.sector_breakdown);
        }
    } catch (e) {
        console.error('Load reports error:', e);
    }
}

function updateDateButtons(days) {
    document.querySelectorAll('[data-days]').forEach(btn => {
        const d = parseInt(btn.dataset.days);
        if (d === days) {
            btn.className = 'px-3 py-1.5 text-xs font-semibold bg-primary text-white rounded';
        } else {
            btn.className = 'px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-200 dark:hover:bg-slate-700';
        }
    });
}

// ─── Summary Cards ─────────────────────────────
function renderSummary(summary) {
    const totalPnl = summary.total_pnl || 0;
    const pnlClass = totalPnl >= 0 ? 'text-emerald-500' : 'text-rose-500';
    const pnlSign = totalPnl >= 0 ? '+' : '';

    $('rpt-total-pnl').textContent = `${pnlSign}₹${Math.abs(totalPnl).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    $('rpt-total-pnl').className = `text-2xl font-bold ${pnlClass}`;

    $('rpt-win-rate').textContent = `${summary.win_rate || 0}%`;
    $('rpt-total-trades').textContent = summary.total_trades || 0;

    const avgPnl = summary.avg_pnl || 0;
    const avgClass = avgPnl >= 0 ? 'text-emerald-500' : 'text-rose-500';
    const avgSign = avgPnl >= 0 ? '+' : '';
    $('rpt-avg-trade').textContent = `${avgSign}₹${Math.abs(avgPnl).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    $('rpt-avg-trade').className = `text-2xl font-bold ${avgClass}`;

    $('rpt-sharpe').textContent = summary.sharpe_ratio || 0;

    // Extra stats
    $('rpt-wins').textContent = summary.wins || 0;
    $('rpt-losses').textContent = summary.losses || 0;
    $('rpt-max-win').textContent = `₹${(summary.max_win || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    $('rpt-max-loss').textContent = `₹${Math.abs(summary.max_loss || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    $('rpt-max-drawdown').textContent = `₹${(summary.max_drawdown || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    $('rpt-open-trades').textContent = summary.open_trades || 0;

    // Win rate bar
    const winRate = summary.win_rate || 0;
    $('rpt-win-bar').style.width = `${winRate}%`;
    $('rpt-loss-bar').style.width = `${100 - winRate}%`;
}

// ─── Trades Table ──────────────────────────────
function renderTradesTable(trades) {
    const tbody = $('rpt-trades-body');

    if (!trades || !trades.length) {
        tbody.innerHTML = `<tr><td colspan="8" class="px-4 py-8 text-center text-slate-400 text-xs">
            <span class="material-symbols-outlined text-3xl block mb-2 text-slate-300">receipt_long</span>
            No trades in this period. Start auto-trading to see real data.</td></tr>`;
        return;
    }

    tbody.innerHTML = trades.map(t => {
        const pnl = t.pnl || 0;
        const pnlClass = pnl >= 0 ? 'text-emerald-500' : 'text-rose-500';
        const pnlSign = pnl >= 0 ? '+' : '';
        const exitDate = t.exit_time ? new Date(t.exit_time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';
        const modeClass = t.trading_mode === 'LIVE' ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary';

        let reasonClass = 'text-slate-400';
        if (t.exit_reason === 'TARGET_HIT') reasonClass = 'text-emerald-500';
        else if (t.exit_reason === 'STOP_LOSS_HIT') reasonClass = 'text-rose-500';
        else if (t.exit_reason === 'KILL_SWITCH') reasonClass = 'text-amber-500';

        return `<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50">
            <td class="px-4 py-2.5 font-semibold text-xs">${t.display_symbol || t.symbol}</td>
            <td class="px-4 py-2.5 text-xs text-slate-500">${t.sector || '—'}</td>
            <td class="px-4 py-2.5 text-right font-mono text-xs">₹${(t.entry_price || 0).toLocaleString('en-IN')}</td>
            <td class="px-4 py-2.5 text-right font-mono text-xs">${t.exit_price ? '₹' + t.exit_price.toLocaleString('en-IN') : '—'}</td>
            <td class="px-4 py-2.5 text-center text-xs font-bold">${t.quantity || 1}</td>
            <td class="px-4 py-2.5 text-right font-mono text-xs font-bold ${pnlClass}">${pnlSign}₹${Math.abs(pnl).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td class="px-4 py-2.5 text-center"><span class="text-[10px] font-bold ${reasonClass}">${(t.exit_reason || '—').replace(/_/g, ' ')}</span></td>
            <td class="px-4 py-2.5 text-xs text-slate-500">${exitDate}</td>
        </tr>`;
    }).join('');
}

// ─── Daily P&L ─────────────────────────────────
function renderDailyPnl(dailyPnl) {
    const container = $('rpt-daily-pnl');

    if (!dailyPnl || !dailyPnl.length) {
        container.innerHTML = `<div class="flex items-center justify-center h-48 text-slate-400 text-xs">
            <div class="text-center">
                <span class="material-symbols-outlined text-3xl block mb-2">bar_chart</span>
                No daily data yet
            </div>
        </div>`;
        return;
    }

    const maxPnl = Math.max(...dailyPnl.map(d => Math.abs(d.pnl)), 1);

    container.innerHTML = `<div class="flex items-end gap-1 h-48 px-2">
        ${dailyPnl.map(d => {
            const height = Math.max(5, (Math.abs(d.pnl) / maxPnl) * 100);
            const color = d.pnl >= 0 ? 'bg-emerald-500' : 'bg-rose-500';
            const date = new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
            return `<div class="flex-1 flex flex-col items-center justify-end gap-1" title="${date}: ₹${d.pnl.toFixed(2)}">
                <div class="${color} rounded-t-sm w-full" style="height: ${height}%"></div>
                <span class="text-[8px] text-slate-500 -rotate-45 origin-left">${date}</span>
            </div>`;
        }).join('')}
    </div>`;
}

// ─── Sector Breakdown ──────────────────────────
function renderSectorBreakdown(sectors) {
    const container = $('rpt-sector-breakdown');

    if (!sectors || Object.keys(sectors).length === 0) {
        container.innerHTML = `<div class="text-center text-slate-400 text-xs py-4">No sector data</div>`;
        return;
    }

    container.innerHTML = Object.entries(sectors).map(([sector, data]) => {
        const pnlClass = data.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500';
        const sign = data.pnl >= 0 ? '+' : '';
        return `<div class="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
            <div>
                <span class="text-xs font-bold">${sector}</span>
                <span class="text-[10px] text-slate-400 ml-2">${data.trades} trades</span>
            </div>
            <span class="text-xs font-bold ${pnlClass}">${sign}₹${Math.abs(data.pnl).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>`;
    }).join('');
}

// ─── Event Listeners ──────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Date range buttons
    document.querySelectorAll('[data-days]').forEach(btn => {
        btn.addEventListener('click', () => {
            loadReports(parseInt(btn.dataset.days));
        });
    });

    // Initial load
    loadReports(30);
});
