/**
 * AI Market Intelligence Agent — Frontend Logic
 * Handles config load/save, scan trigger, signal rendering,
 * approve/reject actions, kill switch, and decision log.
 */

const API_URL = window.APP_CONFIG?.PYTHON_API_URL || 'http://127.0.0.1:5001/api';
const AUTH_TOKEN = window.APP_CONFIG?.API_TOKEN || 'change-me-to-a-strong-random-secret';

const headers = () => ({
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json',
});

// ─── State ────────────────────────────────────
let currentConfig = {};
let allSectors = [];
let selectedSectors = [];
let agentActive = true;

// ─── DOM Elements ─────────────────────────────
const $ = id => document.getElementById(id);
const sectorChips = $('sectorChips');
const signalsTableBody = $('signalsTableBody');
const decisionLog = $('decisionLog');
const scanBtn = $('scanBtn');
const scanIcon = $('scanIcon');
const scanText = $('scanText');
const killSwitchBtn = $('killSwitchBtn');
const activateBtn = $('activateBtn');
const saveConfigBtn = $('saveConfigBtn');
const refreshLogBtn = $('refreshLogBtn');

// ─── API Helpers ──────────────────────────────
async function apiGet(path) {
    const res = await fetch(`${API_URL}${path}`, { headers: headers() });
    return res.json();
}

async function apiPost(path, body = {}) {
    const res = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(body),
    });
    return res.json();
}

// ─── Config ───────────────────────────────────
async function loadConfig() {
    try {
        const res = await apiGet('/agent/config');
        if (res.status === 'success') {
            currentConfig = res.data;
            allSectors = res.data.available_sectors || [];
            selectedSectors = res.data.allowed_sectors || [];
            agentActive = res.data.agent_active;
            renderSectorChips();
            populateConfigForm();
            updateStatusBadges();
            updateCapitalStat(res.data.capital_available || 0);
        }
    } catch (e) {
        console.error('Failed to load config:', e);
    }
}

function renderSectorChips() {
    sectorChips.innerHTML = '';
    allSectors.forEach(sector => {
        const chip = document.createElement('span');
        chip.className = `sector-chip ${selectedSectors.includes(sector) ? 'active' : ''}`;
        chip.textContent = sector;
        chip.addEventListener('click', () => {
            if (selectedSectors.includes(sector)) {
                selectedSectors = selectedSectors.filter(s => s !== sector);
            } else {
                selectedSectors.push(sector);
            }
            renderSectorChips();
        });
        sectorChips.appendChild(chip);
    });
}

function populateConfigForm() {
    $('cfgMaxCapital').value = currentConfig.max_capital_per_trade || 5;
    $('cfgRiskPerTrade').value = currentConfig.risk_per_trade || 2;
    $('cfgMaxTrades').value = currentConfig.max_trades_per_day || 3;
    $('cfgStopLoss').value = currentConfig.stop_loss_rule?.value || 1.5;
    $('cfgTargetProfit').value = currentConfig.profit_booking_rule?.value || 3;
    $('cfgExecutionMode').value = currentConfig.execution_mode || 'MANUAL_CONFIRM';
    $('cfgTradingMode').value = currentConfig.trading_mode || 'PAPER';
}

async function saveConfig() {
    const body = {
        allowed_sectors: selectedSectors,
        max_capital_per_trade: parseFloat($('cfgMaxCapital').value),
        risk_per_trade: parseFloat($('cfgRiskPerTrade').value),
        max_trades_per_day: parseInt($('cfgMaxTrades').value),
        stop_loss_rule: { type: 'fixed_percent', value: parseFloat($('cfgStopLoss').value) },
        profit_booking_rule: { type: 'target_percent', value: parseFloat($('cfgTargetProfit').value) },
        execution_mode: $('cfgExecutionMode').value,
        trading_mode: $('cfgTradingMode').value,
    };

    try {
        saveConfigBtn.textContent = 'Saving...';
        const res = await apiPost('/agent/configure', body);
        if (res.status === 'success') {
            currentConfig = res.data;
            saveConfigBtn.textContent = '✓ Saved';
            setTimeout(() => { saveConfigBtn.textContent = 'Save'; }, 1500);
        } else {
            alert('Config error: ' + (res.error || 'Unknown'));
            saveConfigBtn.textContent = 'Save';
        }
    } catch (e) {
        console.error('Save config error:', e);
        saveConfigBtn.textContent = 'Save';
    }
}

// ─── Status Badges ────────────────────────────
function updateStatusBadges() {
    const badge = $('agentStatusBadge');
    const dot = badge.querySelector('.w-2');
    const text = badge.querySelector('.status-text');
    const modeBadge = $('tradingModeBadge');

    if (agentActive) {
        badge.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-success/30 bg-success/10 text-xs font-bold uppercase tracking-wider';
        dot.className = 'w-2 h-2 rounded-full bg-success animate-pulse';
        text.textContent = 'Active';
        scanBtn.disabled = false;
        scanBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        killSwitchBtn.classList.remove('hidden');
        killSwitchBtn.classList.add('flex');
        activateBtn.classList.add('hidden');
        activateBtn.classList.remove('flex');
    } else {
        badge.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-danger/30 bg-danger/10 text-xs font-bold uppercase tracking-wider';
        dot.className = 'w-2 h-2 rounded-full bg-danger';
        text.textContent = 'Deactivated';
        scanBtn.disabled = true;
        scanBtn.classList.add('opacity-50', 'cursor-not-allowed');
        killSwitchBtn.classList.add('hidden');
        killSwitchBtn.classList.remove('flex');
        activateBtn.classList.remove('hidden');
        activateBtn.classList.add('flex');
    }

    const mode = currentConfig.trading_mode || 'PAPER';
    modeBadge.textContent = mode;
    if (mode === 'LIVE') {
        modeBadge.className = 'px-3 py-1.5 rounded-lg border border-danger/30 bg-danger/10 text-danger text-[10px] font-bold uppercase tracking-widest';
    } else {
        modeBadge.className = 'px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest';
    }
}

function updateCapitalStat(capital) {
    $('stat-capital').textContent = '₹' + Number(capital).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

// ─── Scan ─────────────────────────────────────
async function triggerScan() {
    if (!agentActive) return;

    scanIcon.className = 'material-symbols-outlined text-lg scan-spin';
    scanIcon.textContent = 'progress_activity';
    scanText.textContent = 'Scanning...';
    scanBtn.disabled = true;

    try {
        const res = await apiPost('/agent/scan');
        if (res.status === 'success') {
            renderSignals(res.signals || []);
            updateStats(res);
            $('stat-last-scan').textContent = new Date(res.scan_time).toLocaleTimeString('en-IN');
            updateCapitalStat(res.config_snapshot?.capital_available || 0);
            loadLog();
        } else {
            alert('Scan error: ' + (res.error || 'Unknown'));
        }
    } catch (e) {
        console.error('Scan error:', e);
        alert('Network error during scan');
    } finally {
        scanIcon.className = 'material-symbols-outlined text-lg';
        scanIcon.textContent = 'radar';
        scanText.textContent = 'Scan Markets';
        scanBtn.disabled = false;
    }
}

function updateStats(res) {
    $('stat-total').textContent = res.total_signals || 0;
    $('stat-qualified').textContent = res.qualified || 0;
    $('stat-rejected').textContent = res.rejected || 0;
    $('signalCount').textContent = `${res.total_signals || 0} signals`;
}

// ─── Signal Rendering ─────────────────────────
function renderSignals(signals) {
    if (!signals.length) {
        signalsTableBody.innerHTML = `<tr><td colspan="9" class="px-4 py-8 text-center text-slate-400 text-xs">
            <span class="material-symbols-outlined text-3xl block mb-2 text-slate-300">search_off</span>
            No signals found in the current scan. Adjust sectors or try again later.</td></tr>`;
        return;
    }

    signalsTableBody.innerHTML = signals.map(sig => {
        const isQualified = sig.signal_status === 'QUALIFIED';
        const statusClass = isQualified ? 'text-success bg-success/10 border-success/20' : 'text-danger bg-danger/10 border-danger/20';
        const ruleChecks = sig.rule_checks || {};

        const rulesHtml = Object.entries(ruleChecks).map(([key, val]) => {
            const label = key.replace(/_/g, ' ').replace('ok', '').trim();
            return `<span class="rule-check ${val ? 'rule-pass' : 'rule-fail'}">${val ? '✓' : '✗'} ${label}</span>`;
        }).join(' ');

        let actionHtml = '';
        if (isQualified && sig.execution_instruction === 'WAIT_FOR_USER_CONFIRMATION' && !sig.user_action) {
            actionHtml = `
                <button onclick="approveSignal('${sig.id}')" class="px-2 py-1 bg-success/10 text-success text-[10px] font-bold rounded hover:bg-success/20 transition-all mr-1">Approve</button>
                <button onclick="rejectSignal('${sig.id}')" class="px-2 py-1 bg-danger/10 text-danger text-[10px] font-bold rounded hover:bg-danger/20 transition-all">Reject</button>`;
        } else if (sig.user_action === 'APPROVED') {
            actionHtml = `<span class="text-[10px] font-bold text-success uppercase">✓ Approved</span>`;
        } else if (sig.user_action === 'REJECTED_BY_USER') {
            actionHtml = `<span class="text-[10px] font-bold text-danger uppercase">✗ Rejected</span>`;
        } else if (!isQualified) {
            actionHtml = `<span class="text-[10px] text-slate-400">—</span>`;
        } else {
            actionHtml = `<span class="text-[10px] text-slate-400 font-mono">${sig.execution_instruction}</span>`;
        }

        return `<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors fade-in">
            <td class="px-4 py-3">
                <div class="font-bold text-sm">${sig.symbol}</div>
                <div class="text-[10px] text-slate-400 font-mono">${sig.ticker || ''}</div>
            </td>
            <td class="px-4 py-3 text-xs text-slate-500">${sig.sector}</td>
            <td class="px-4 py-3 text-right font-mono text-xs">₹${sig.entry_price?.toLocaleString('en-IN')}</td>
            <td class="px-4 py-3 text-right font-mono text-xs text-danger">₹${sig.stop_loss?.toLocaleString('en-IN')}</td>
            <td class="px-4 py-3 text-right font-mono text-xs text-success">₹${sig.target_price?.toLocaleString('en-IN')}</td>
            <td class="px-4 py-3 text-center"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${sig.risk_reward_ratio >= 1.5 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}">${sig.risk_reward_ratio}x</span></td>
            <td class="px-4 py-3 text-center"><span class="px-2 py-0.5 rounded border text-[10px] font-bold ${statusClass}">${sig.signal_status}</span></td>
            <td class="px-4 py-3"><div class="flex flex-wrap gap-1">${rulesHtml}</div></td>
            <td class="px-4 py-3 text-center whitespace-nowrap">${actionHtml}</td>
        </tr>`;
    }).join('');
}

// ─── Signal Actions ───────────────────────────
async function approveSignal(id) {
    try {
        const res = await apiPost(`/agent/approve/${id}`);
        if (res.status === 'success') {
            loadSignals();
            loadLog();
        } else {
            alert('Approve failed: ' + (res.error || 'Unknown'));
        }
    } catch (e) {
        console.error('Approve error:', e);
    }
}

async function rejectSignal(id) {
    try {
        const res = await apiPost(`/agent/reject/${id}`);
        if (res.status === 'success') {
            loadSignals();
            loadLog();
        } else {
            alert('Reject failed: ' + (res.error || 'Unknown'));
        }
    } catch (e) {
        console.error('Reject error:', e);
    }
}

// Make actions globally accessible
window.approveSignal = approveSignal;
window.rejectSignal = rejectSignal;

// ─── Load Cached Signals ─────────────────────
async function loadSignals() {
    try {
        const res = await apiGet('/agent/signals');
        if (res.status === 'success') {
            renderSignals(res.signals || []);
            const stats = res.stats || {};
            $('stat-total').textContent = stats.total_signals || 0;
            $('stat-qualified').textContent = stats.qualified || 0;
            $('stat-rejected').textContent = stats.rejected || 0;
            $('signalCount').textContent = `${(res.signals || []).length} signals`;
        }
    } catch (e) {
        console.error('Load signals error:', e);
    }
}

// ─── Decision Log ─────────────────────────────
async function loadLog() {
    try {
        const res = await apiGet('/agent/log?limit=30');
        if (res.status === 'success') {
            renderLog(res.log || []);
        }
    } catch (e) {
        console.error('Load log error:', e);
    }
}

function renderLog(entries) {
    if (!entries.length) {
        decisionLog.innerHTML = '<div class="px-5 py-4 text-center text-slate-400 text-xs">No log entries yet.</div>';
        return;
    }

    decisionLog.innerHTML = entries.map(entry => {
        const isQ = entry.signal_status === 'QUALIFIED';
        const icon = isQ ? 'check_circle' : 'cancel';
        const iconColor = isQ ? 'text-success' : 'text-danger';
        const time = new Date(entry.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        let actionBadge = '';
        if (entry.user_action === 'APPROVED') {
            actionBadge = '<span class="px-1.5 py-0.5 rounded bg-success/10 text-success text-[9px] font-bold uppercase">Approved</span>';
        } else if (entry.user_action === 'REJECTED_BY_USER') {
            actionBadge = '<span class="px-1.5 py-0.5 rounded bg-danger/10 text-danger text-[9px] font-bold uppercase">User Rejected</span>';
        }

        return `<div class="px-5 py-2.5 border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors flex items-start gap-3">
            <span class="material-symbols-outlined ${iconColor} text-sm mt-0.5">${icon}</span>
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-bold text-xs">${entry.symbol}</span>
                    <span class="text-[10px] text-slate-400">${entry.sector}</span>
                    <span class="px-1.5 py-0.5 rounded text-[9px] font-bold ${isQ ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}">${entry.signal_status}</span>
                    ${actionBadge}
                </div>
                <p class="text-[10px] text-slate-400 mt-0.5 truncate">${entry.rationale || ''}</p>
            </div>
            <span class="text-[10px] text-slate-400 font-mono whitespace-nowrap shrink-0">${time}</span>
        </div>`;
    }).join('');
}

// ─── Kill Switch ──────────────────────────────
async function killSwitch() {
    if (!confirm('⚠️ This will deactivate the agent and clear ALL signals and logs. Continue?')) return;
    try {
        const res = await apiPost('/agent/kill');
        if (res.status === 'success') {
            agentActive = false;
            updateStatusBadges();
            signalsTableBody.innerHTML = `<tr><td colspan="9" class="px-4 py-8 text-center text-danger text-xs font-bold">
                <span class="material-symbols-outlined text-3xl block mb-2">emergency_home</span>
                Agent deactivated. All signals cleared.</td></tr>`;
            decisionLog.innerHTML = '<div class="px-5 py-4 text-center text-danger text-xs font-bold">Log cleared by kill switch.</div>';
            $('stat-total').textContent = '0';
            $('stat-qualified').textContent = '0';
            $('stat-rejected').textContent = '0';
            $('signalCount').textContent = '0 signals';
        }
    } catch (e) {
        console.error('Kill switch error:', e);
    }
}

async function activateAgent() {
    try {
        const res = await apiPost('/agent/activate');
        if (res.status === 'success') {
            agentActive = true;
            updateStatusBadges();
        }
    } catch (e) {
        console.error('Activate error:', e);
    }
}

// ─── Event Listeners ──────────────────────────
scanBtn.addEventListener('click', triggerScan);
killSwitchBtn.addEventListener('click', killSwitch);
activateBtn.addEventListener('click', activateAgent);
saveConfigBtn.addEventListener('click', saveConfig);
refreshLogBtn.addEventListener('click', loadLog);

// ─── Init ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadConfig();
    loadSignals();
    loadLog();
});
