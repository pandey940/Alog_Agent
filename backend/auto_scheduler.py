"""
Autonomous Trading Agent — Background Auto-Scan Scheduler

Runs a background thread that periodically:
1. Scans markets for signals
2. Auto-executes qualified signals
3. Monitors open positions for target/stop-loss exit

Only trades during NSE market hours (9:15 AM - 3:30 PM IST).
"""

import threading
import time
from datetime import datetime, timezone, timedelta

import agent_config
import agent_engine
import agent_log
import auto_executor
import trade_store

# IST timezone offset
IST = timezone(timedelta(hours=5, minutes=30))

# Market hours
MARKET_OPEN_HOUR = 9
MARKET_OPEN_MIN = 15
MARKET_CLOSE_HOUR = 15
MARKET_CLOSE_MIN = 30

# Scheduler state
_scheduler_thread = None
_scheduler_running = False
_scan_interval = 300  # 5 minutes default
_last_scan_time = None
_last_scan_result = None
_dhan_client = None


def _is_market_hours() -> bool:
    """Check if current time is within NSE market hours (IST)."""
    now = datetime.now(IST)
    market_open = now.replace(hour=MARKET_OPEN_HOUR, minute=MARKET_OPEN_MIN, second=0)
    market_close = now.replace(hour=MARKET_CLOSE_HOUR, minute=MARKET_CLOSE_MIN, second=0)
    # Also check weekday (0=Monday, 6=Sunday)
    if now.weekday() >= 5:
        return False
    return market_open <= now <= market_close


def _run_cycle():
    """Execute one scan + execute + monitor cycle."""
    global _last_scan_time, _last_scan_result

    config = agent_config.get_config()

    # Fetch real capital from Dhan
    if _dhan_client:
        try:
            fund_response = _dhan_client.get_fund_limits()
            if fund_response.get("status") == "success":
                capital = fund_response.get("data", {}).get("availabelBalance", 0)
                agent_config.set_capital(capital)
                config["capital_available"] = capital
        except Exception as e:
            print(f"[Scheduler] Could not fetch capital: {e}")

    # Step 1: Scan markets
    print(f"[Scheduler] Running market scan at {datetime.now(IST).strftime('%H:%M:%S IST')}")
    signals = agent_engine.scan_markets(config)

    # Log signals
    logged_signals = []
    for sig in signals:
        logged = agent_log.log_signal(sig)
        logged_signals.append(logged)
    agent_log.store_scan_results(logged_signals)

    qualified = [s for s in logged_signals if s["signal_status"] == "QUALIFIED"]
    print(f"[Scheduler] Scan complete: {len(signals)} signals, {len(qualified)} qualified")

    # Step 2: Auto-execute qualified signals
    executed = 0
    if config.get("execution_mode") == "AUTO_RULED":
        today_count = trade_store.get_today_trade_count()
        max_trades = config.get("max_trades_per_day", 3)

        for sig in qualified:
            if today_count >= max_trades:
                print(f"[Scheduler] Max trades/day ({max_trades}) reached, skipping remaining")
                break

            if sig.get("execution_instruction") == "FORWARD_TO_EXECUTION_ENGINE":
                trade = auto_executor.execute_signal(sig, config, _dhan_client)
                if trade:
                    agent_log.update_signal_status(sig["id"], "AUTO_EXECUTED")
                    executed += 1
                    today_count += 1

    print(f"[Scheduler] Auto-executed {executed} trades")

    # Step 3: Monitor and exit open positions
    closed = auto_executor.check_and_exit_positions(_dhan_client, config)
    if closed:
        print(f"[Scheduler] Auto-closed {len(closed)} positions")

    _last_scan_time = datetime.now().isoformat()
    _last_scan_result = {
        "scan_time": _last_scan_time,
        "total_signals": len(signals),
        "qualified": len(qualified),
        "executed": executed,
        "positions_closed": len(closed),
    }


def _scheduler_loop():
    """Main scheduler loop running in background thread."""
    global _scheduler_running

    print("[Scheduler] Auto-trading loop started")

    while _scheduler_running:
        try:
            if not agent_config.is_agent_active():
                print("[Scheduler] Agent deactivated, pausing...")
                time.sleep(10)
                continue

            if _is_market_hours():
                _run_cycle()
            else:
                now = datetime.now(IST)
                print(f"[Scheduler] Outside market hours ({now.strftime('%H:%M IST')}), waiting...")

            # Sleep in small increments to allow quick shutdown
            for _ in range(int(_scan_interval)):
                if not _scheduler_running:
                    break
                time.sleep(1)

        except Exception as e:
            print(f"[Scheduler] Error in cycle: {e}")
            time.sleep(30)

    print("[Scheduler] Auto-trading loop stopped")


def start_scheduler(dhan_client=None, interval: int = 300):
    """Start the background auto-trading scheduler."""
    global _scheduler_thread, _scheduler_running, _scan_interval, _dhan_client

    if _scheduler_running:
        return {"status": "already_running"}

    _dhan_client = dhan_client
    _scan_interval = max(60, interval)  # minimum 1 minute
    _scheduler_running = True

    _scheduler_thread = threading.Thread(target=_scheduler_loop, daemon=True)
    _scheduler_thread.start()

    return {"status": "started", "interval": _scan_interval}


def stop_scheduler():
    """Stop the background auto-trading scheduler."""
    global _scheduler_running

    if not _scheduler_running:
        return {"status": "not_running"}

    _scheduler_running = False
    print("[Scheduler] Stop signal sent, waiting for current cycle to finish...")

    return {"status": "stopped"}


def get_status() -> dict:
    """Get current scheduler status."""
    open_trades = trade_store.get_open_trades()
    today_count = trade_store.get_today_trade_count()

    return {
        "running": _scheduler_running,
        "scan_interval": _scan_interval,
        "last_scan_time": _last_scan_time,
        "last_scan_result": _last_scan_result,
        "market_hours": _is_market_hours(),
        "open_positions": len(open_trades),
        "trades_today": today_count,
    }


def force_run_now():
    """Force an immediate scan cycle (for testing outside market hours)."""
    if not agent_config.is_agent_active():
        return {"error": "Agent is not active"}
    _run_cycle()
    return {"status": "success", "result": _last_scan_result}
