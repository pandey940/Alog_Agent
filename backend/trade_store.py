"""
Autonomous Trading Agent — Persistent Trade Store

JSON-file-based storage for all trades placed by the agent.
Supports save, update, query, and summary operations.
"""

import json
import os
import uuid
import threading
from datetime import datetime

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
TRADES_FILE = os.path.join(DATA_DIR, "trades.json")

_lock = threading.Lock()


def _ensure_file():
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(TRADES_FILE):
        with open(TRADES_FILE, "w") as f:
            json.dump([], f)


def _read_trades() -> list:
    _ensure_file()
    with open(TRADES_FILE, "r") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []


def _write_trades(trades: list):
    _ensure_file()
    with open(TRADES_FILE, "w") as f:
        json.dump(trades, f, indent=2, default=str)


def save_trade(trade: dict) -> dict:
    """Save a new trade record. Returns the saved trade with generated ID."""
    trade["trade_id"] = str(uuid.uuid4())[:8]
    trade["entry_time"] = trade.get("entry_time", datetime.now().isoformat())
    trade["status"] = trade.get("status", "OPEN")
    trade["exit_price"] = None
    trade["exit_time"] = None
    trade["exit_reason"] = None
    trade["pnl"] = None
    trade["pnl_percent"] = None

    with _lock:
        trades = _read_trades()
        trades.append(trade)
        _write_trades(trades)

    return trade


def update_trade(trade_id: str, updates: dict) -> dict | None:
    """Update an existing trade by ID. Returns updated trade or None."""
    with _lock:
        trades = _read_trades()
        for trade in trades:
            if trade["trade_id"] == trade_id:
                trade.update(updates)
                _write_trades(trades)
                return trade
    return None


def close_trade(trade_id: str, exit_price: float, exit_reason: str) -> dict | None:
    """Close a trade with exit price and reason. Calculates P&L."""
    with _lock:
        trades = _read_trades()
        for trade in trades:
            if trade["trade_id"] == trade_id and trade["status"] == "OPEN":
                entry = trade["entry_price"]
                qty = trade.get("quantity", 1)
                pnl = (exit_price - entry) * qty
                pnl_pct = ((exit_price - entry) / entry) * 100 if entry > 0 else 0

                trade["exit_price"] = round(exit_price, 2)
                trade["exit_time"] = datetime.now().isoformat()
                trade["exit_reason"] = exit_reason
                trade["pnl"] = round(pnl, 2)
                trade["pnl_percent"] = round(pnl_pct, 2)
                trade["status"] = "CLOSED"
                _write_trades(trades)
                return trade
    return None


def get_open_trades() -> list:
    """Get all trades with status OPEN."""
    trades = _read_trades()
    return [t for t in trades if t.get("status") == "OPEN"]


def get_all_trades(limit: int = 100) -> list:
    """Get all trades, newest first."""
    trades = _read_trades()
    trades.sort(key=lambda t: t.get("entry_time", ""), reverse=True)
    return trades[:limit]


def get_closed_trades(limit: int = 100) -> list:
    """Get closed trades, newest first."""
    trades = _read_trades()
    closed = [t for t in trades if t.get("status") == "CLOSED"]
    closed.sort(key=lambda t: t.get("exit_time", ""), reverse=True)
    return closed[:limit]


def get_trades_by_date_range(days: int = 7) -> list:
    """Get closed trades within the last N days."""
    from datetime import timedelta
    cutoff = (datetime.now() - timedelta(days=days)).isoformat()
    trades = _read_trades()
    filtered = [
        t for t in trades
        if t.get("status") == "CLOSED" and t.get("exit_time", "") >= cutoff
    ]
    filtered.sort(key=lambda t: t.get("exit_time", ""), reverse=True)
    return filtered


def get_trades_summary() -> dict:
    """Compute summary statistics from all closed trades."""
    trades = _read_trades()
    closed = [t for t in trades if t.get("status") == "CLOSED"]
    open_trades = [t for t in trades if t.get("status") == "OPEN"]

    if not closed:
        return {
            "total_trades": 0,
            "open_trades": len(open_trades),
            "wins": 0,
            "losses": 0,
            "win_rate": 0,
            "total_pnl": 0,
            "avg_pnl": 0,
            "max_win": 0,
            "max_loss": 0,
            "avg_win": 0,
            "avg_loss": 0,
            "sharpe_ratio": 0,
            "max_drawdown": 0,
            "sector_breakdown": {},
        }

    pnls = [t.get("pnl", 0) for t in closed]
    wins = [p for p in pnls if p > 0]
    losses = [p for p in pnls if p <= 0]
    total_pnl = sum(pnls)

    # Sharpe ratio (simplified: mean / std of trade returns)
    import statistics
    avg_pnl = total_pnl / len(pnls) if pnls else 0
    std_pnl = statistics.stdev(pnls) if len(pnls) > 1 else 1
    sharpe = round(avg_pnl / std_pnl, 2) if std_pnl > 0 else 0

    # Max drawdown from cumulative P&L
    cumulative = []
    running = 0
    for p in pnls:
        running += p
        cumulative.append(running)
    peak = 0
    max_dd = 0
    for val in cumulative:
        if val > peak:
            peak = val
        dd = peak - val
        if dd > max_dd:
            max_dd = dd

    # Sector breakdown
    sector_pnl = {}
    for t in closed:
        sector = t.get("sector", "Unknown")
        if sector not in sector_pnl:
            sector_pnl[sector] = {"trades": 0, "pnl": 0}
        sector_pnl[sector]["trades"] += 1
        sector_pnl[sector]["pnl"] += t.get("pnl", 0)
    for s in sector_pnl:
        sector_pnl[s]["pnl"] = round(sector_pnl[s]["pnl"], 2)

    return {
        "total_trades": len(closed),
        "open_trades": len(open_trades),
        "wins": len(wins),
        "losses": len(losses),
        "win_rate": round(len(wins) / len(closed) * 100, 1) if closed else 0,
        "total_pnl": round(total_pnl, 2),
        "avg_pnl": round(avg_pnl, 2),
        "max_win": round(max(wins), 2) if wins else 0,
        "max_loss": round(min(losses), 2) if losses else 0,
        "avg_win": round(sum(wins) / len(wins), 2) if wins else 0,
        "avg_loss": round(sum(losses) / len(losses), 2) if losses else 0,
        "sharpe_ratio": sharpe,
        "max_drawdown": round(max_dd, 2),
        "sector_breakdown": sector_pnl,
    }


def get_today_trade_count() -> int:
    """Count trades opened today."""
    today = datetime.now().strftime("%Y-%m-%d")
    trades = _read_trades()
    return sum(1 for t in trades if t.get("entry_time", "").startswith(today))


def clear_all():
    """Clear all trade data (used by kill switch for paper mode)."""
    with _lock:
        _write_trades([])
