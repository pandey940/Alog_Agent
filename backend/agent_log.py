"""
AI Market Intelligence Agent — Decision Log

In-memory store for every signal generated + user decisions.
Each entry has a unique ID, timestamp, and current status.
"""

import uuid
from datetime import datetime

_log = []            # master list of all logged signals
_signals = []        # latest scan results (reset each scan)


def log_signal(signal: dict) -> dict:
    """
    Append a signal dict to the log with a unique ID and timestamp.
    Returns the enriched signal dict.
    """
    entry = {
        "id": str(uuid.uuid4())[:8],
        "timestamp": datetime.now().isoformat(),
        "user_action": None,       # None | APPROVED | REJECTED_BY_USER
        **signal,
    }
    _log.append(entry)
    return entry


def store_scan_results(signals: list):
    """Replace cached scan results with the latest batch."""
    global _signals
    _signals = list(signals)


def get_signals() -> list:
    """Return cached signals from the last scan."""
    return list(_signals)


def get_log(limit: int = 50) -> list:
    """Return the last N log entries (newest first)."""
    return list(reversed(_log[-limit:]))


def update_signal_status(signal_id: str, action: str) -> dict | None:
    """
    Update user_action for a signal by ID.
    action: 'APPROVED' or 'REJECTED_BY_USER'
    Returns updated entry or None if not found.
    """
    for entry in reversed(_log):
        if entry["id"] == signal_id:
            entry["user_action"] = action
            # Also update in cached signals
            for sig in _signals:
                if sig.get("id") == signal_id:
                    sig["user_action"] = action
            return entry
    return None


def get_signal_by_id(signal_id: str) -> dict | None:
    """Find a signal in the log by its ID."""
    for entry in reversed(_log):
        if entry["id"] == signal_id:
            return entry
    return None


def clear_all():
    """Kill-switch: wipe all signals and log entries."""
    global _log, _signals
    _log = []
    _signals = []


def get_stats() -> dict:
    """Return summary statistics of the log."""
    total = len(_log)
    qualified = sum(1 for s in _log if s.get("signal_status") == "QUALIFIED")
    rejected = sum(1 for s in _log if s.get("signal_status") == "REJECTED")
    approved = sum(1 for s in _log if s.get("user_action") == "APPROVED")
    user_rejected = sum(1 for s in _log if s.get("user_action") == "REJECTED_BY_USER")
    return {
        "total_signals": total,
        "qualified": qualified,
        "rejected": rejected,
        "user_approved": approved,
        "user_rejected": user_rejected,
    }
