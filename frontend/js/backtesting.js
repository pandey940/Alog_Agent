/**
 * Backtesting Engine — Frontend Logic
 * Loads completed trade data and computes backtesting metrics
 * (CAGR, Max Drawdown, Sharpe Ratio, Win/Loss) from real agent trades.
 */

const API_URL = window.APP_CONFIG?.PYTHON_API_URL || 'http://127.0.0.1:5001/api';
const AUTH_TOKEN = window.APP_CONFIG?.API_TOKEN || 'change-me-to-a-strong-random-secret';

const headers = () => ({
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json',
});

const $ = id => document.getElementById(id);

async function apiGet(path) {
    const res = await fetch(`${API_URL}${path}`, { headers: headers() });
    return res.json();
}

// ─── Load Backtesting Data ─────────────────────
async function loadBacktestData() {
    try {
        const [tradesRes, summaryRes] = await Promise.all([
            apiGet('/agent/trades?limit=200'),
            apiGet('/agent/trades/summary'),
        ]);

        if (tradesRes.status === 'success' && summaryRes.status === 'success') {
            const trades = tradesRes.data.trades || [];
            const summary = summaryRes.data;
            const closedTrades = trades.filter(t => t.status === 'CLOSED');

            renderMetrics(summary, closedTrades);
            renderExecutionLog(closedTrades);
            renderEquityCurve(closedTrades);
        }
    } catch (e) {
        console.error('Backtest load error:', e);
    }
}

// ─── Metrics ───────────────────────────────────
function renderMetrics(summary, trades) {
    // Win Rate
    const winRate = summary.win_rate || 0;
    $('bt-win-rate').textContent = `${winRate}%`;
    $('bt-win-bar').style.width = `${winRate}%`;
    $('bt-loss-bar').style.width = `${100 - winRate}%`;

    // Sharpe Ratio
    $('bt-sharpe').textContent = summary.sharpe_ratio || 0;
    const sharpeEl = $('bt-sharpe-label');
    if (summary.sharpe_ratio >= 1.5) {
        sharpeEl.textContent = 'High Efficiency';
        sharpeEl.className = 'flex items-center gap-1 text-[10px] font-bold text-emerald-500';
    } else if (summary.sharpe_ratio >= 0.5) {
        sharpeEl.textContent = 'Moderate';
        sharpeEl.className = 'flex items-center gap-1 text-[10px] font-bold text-amber-500';
    } else {
        sharpeEl.textContent = 'Low Efficiency';
        sharpeEl.className = 'flex items-center gap-1 text-[10px] font-bold text-rose-500';
    }

    // Max Drawdown
    $('bt-max-drawdown').textContent = `-₹${(summary.max_drawdown || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    // Total P&L as CAGR proxy
    const totalPnl = summary.total_pnl || 0;
    const sign = totalPnl >= 0 ? '+' : '';
    $('bt-total-pnl').textContent = `${sign}₹${Math.abs(totalPnl).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    $('bt-total-pnl').className = `text-2xl font-extrabold ${totalPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`;

    // Trade stats
    $('bt-total-trades').textContent = summary.total_trades || 0;
    $('bt-wins').textContent = summary.wins || 0;
    $('bt-losses').textContent = summary.losses || 0;
    $('bt-avg-win').textContent = `₹${(summary.avg_win || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    $('bt-avg-loss').textContent = `₹${Math.abs(summary.avg_loss || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

// ─── Equity Curve ──────────────────────────────
function renderEquityCurve(trades) {
    const container = $('bt-equity-curve');
    if (!trades.length) {
        container.innerHTML = `<div class="flex items-center justify-center h-full text-slate-400 text-xs">
            <div class="text-center">
                <span class="material-symbols-outlined text-4xl block mb-2">trending_up</span>
                Run some trades to see the equity curve
            </div>
        </div>`;
        return;
    }

    // Sort by exit_time
    const sorted = [...trades].sort((a, b) => (a.exit_time || '').localeCompare(b.exit_time || ''));

    // Build cumulative P&L
    let cumulative = 0;
    const points = sorted.map(t => {
        cumulative += (t.pnl || 0);
        return cumulative;
    });

    const maxVal = Math.max(...points.map(Math.abs), 1);
    const width = 1000;
    const height = 300;
    const padding = 20;

    const xStep = (width - 2 * padding) / Math.max(points.length - 1, 1);

    const pathPoints = points.map((val, i) => {
        const x = padding + i * xStep;
        const y = height / 2 - (val / maxVal) * (height / 2 - padding);
        return `${x},${y}`;
    });

    const pathD = 'M' + pathPoints.join(' L');
    const lineColor = cumulative >= 0 ? '#10b981' : '#f43f5e';

    // Zero line
    const zeroY = height / 2;

    container.innerHTML = `
        <svg class="w-full h-full" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
            <line x1="${padding}" y1="${zeroY}" x2="${width - padding}" y2="${zeroY}" stroke="#334155" stroke-width="1" stroke-dasharray="4"/>
            <path d="${pathD}" fill="none" stroke="${lineColor}" stroke-width="2.5"/>
            ${points.map((val, i) => {
                const x = padding + i * xStep;
                const y = height / 2 - (val / maxVal) * (height / 2 - padding);
                const color = val >= 0 ? '#10b981' : '#f43f5e';
                return `<circle cx="${x}" cy="${y}" r="3" fill="${color}"/>`;
            }).join('')}
        </svg>
        <div class="absolute top-4 left-4 bg-white/90 dark:bg-background-dark/90 border border-slate-200 dark:border-border-dark p-3 rounded-lg shadow-xl backdrop-blur text-xs">
            <div class="flex items-center gap-4 mb-1">
                <div class="flex items-center gap-1.5">
                    <div class="size-2 rounded-full" style="background: ${lineColor}"></div> Cumulative P&L
                </div>
            </div>
            <div class="text-[10px] text-slate-500">
                <span class="font-bold" style="color: ${lineColor}">${cumulative >= 0 ? '+' : ''}₹${Math.abs(cumulative).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                across ${points.length} trades
            </div>
        </div>`;
}

// ─── Execution Log ─────────────────────────────
function renderExecutionLog(trades) {
    const tbody = $('bt-execution-log');

    if (!trades.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="px-4 py-8 text-center text-slate-400 text-xs">
            <span class="material-symbols-outlined text-3xl block mb-2 text-slate-300">receipt_long</span>
            No completed trades yet. Start auto-trading to generate data.</td></tr>`;
        return;
    }

    // Show last 50, newest first
    const recent = [...trades].sort((a, b) => (b.exit_time || '').localeCompare(a.exit_time || '')).slice(0, 50);

    tbody.innerHTML = recent.map(t => {
        const pnl = t.pnl || 0;
        const pnlClass = pnl >= 0 ? 'text-emerald-500' : 'text-rose-500';
        const pnlSign = pnl >= 0 ? '+' : '';

        let typeBadge = '';
        if (t.exit_reason === 'TARGET_HIT') {
            typeBadge = `<span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded text-[10px] font-bold uppercase">Target Hit</span>`;
        } else if (t.exit_reason === 'STOP_LOSS_HIT') {
            typeBadge = `<span class="px-2 py-0.5 bg-rose-500/10 text-rose-500 rounded text-[10px] font-bold uppercase">Stop Loss</span>`;
        } else if (t.exit_reason === 'KILL_SWITCH') {
            typeBadge = `<span class="px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded text-[10px] font-bold uppercase">Kill Switch</span>`;
        } else {
            typeBadge = `<span class="px-2 py-0.5 bg-slate-500/10 text-slate-500 rounded text-[10px] font-bold uppercase">${(t.exit_reason || 'Manual').replace(/_/g, ' ')}</span>`;
        }

        const exitDate = t.exit_time ? new Date(t.exit_time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

        return `<tr class="hover:bg-slate-50 dark:hover:bg-background-dark/40 transition-colors">
            <td class="px-4 py-3 font-medium text-xs">${exitDate}</td>
            <td class="px-4 py-3">${typeBadge}</td>
            <td class="px-4 py-3 text-xs">
                <span class="font-bold">${t.display_symbol || t.symbol}</span>
                <span class="text-slate-400 ml-1">@ ₹${(t.entry_price || 0).toLocaleString('en-IN')} → ₹${(t.exit_price || 0).toLocaleString('en-IN')}</span>
            </td>
            <td class="px-4 py-3 text-xs">${t.quantity || 1} shares</td>
            <td class="px-4 py-3 text-right font-bold ${pnlClass}">${pnlSign}₹${Math.abs(pnl).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>`;
    }).join('');
}

// ─── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', loadBacktestData);
