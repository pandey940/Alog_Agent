"""
AI Market Intelligence Agent — Configuration Module

Stores user-defined agent rules and sector-to-scrip mappings.
All values are READ-ONLY during scans.  The engine never mutates config.
"""

import copy

# ──────────────────────────────────────────────
# SECTOR → REPRESENTATIVE NSE SCRIPS
# ──────────────────────────────────────────────
SECTOR_SCRIPS = {
    "NIFTY50": [
        "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
        "HINDUNILVR.NS", "BHARTIARTL.NS", "SBIN.NS", "BAJFINANCE.NS", "LT.NS"
    ],
    "BANKNIFTY": [
        "HDFCBANK.NS", "ICICIBANK.NS", "SBIN.NS", "KOTAKBANK.NS",
        "AXISBANK.NS", "INDUSINDBK.NS", "BANDHANBNK.NS", "FEDERALBNK.NS"
    ],
    "IT": [
        "TCS.NS", "INFY.NS", "WIPRO.NS", "HCLTECH.NS", "TECHM.NS",
        "LTIM.NS", "MPHASIS.NS", "COFORGE.NS"
    ],
    "PHARMA": [
        "SUNPHARMA.NS", "DRREDDY.NS", "CIPLA.NS", "DIVISLAB.NS",
        "APOLLOHOSP.NS", "LUPIN.NS", "AUROPHARMA.NS", "BIOCON.NS"
    ],
    "AUTO": [
        "MARUTI.NS", "TATAMOTORS.NS", "M&M.NS", "BAJAJ-AUTO.NS",
        "HEROMOTOCO.NS", "EICHERMOT.NS", "ASHOKLEY.NS", "TVSMOTOR.NS"
    ],
    "FMCG": [
        "HINDUNILVR.NS", "ITC.NS", "NESTLEIND.NS", "BRITANNIA.NS",
        "GODREJCP.NS", "DABUR.NS", "MARICO.NS", "COLPAL.NS"
    ],
    "ENERGY": [
        "RELIANCE.NS", "ONGC.NS", "NTPC.NS", "POWERGRID.NS",
        "ADANIGREEN.NS", "TATAPOWER.NS", "BPCL.NS", "IOC.NS"
    ],
    "METAL": [
        "TATASTEEL.NS", "JSWSTEEL.NS", "HINDALCO.NS", "VEDL.NS",
        "COALINDIA.NS", "NMDC.NS", "NATIONALUM.NS", "SAIL.NS"
    ],
}

# ──────────────────────────────────────────────
# DEFAULT CONFIGURATION (safe, conservative)
# ──────────────────────────────────────────────
_DEFAULT_CONFIG = {
    "allowed_sectors": ["NIFTY50", "BANKNIFTY", "IT", "PHARMA", "AUTO", "FMCG", "ENERGY", "METAL"],
    "max_capital_per_trade": 5,       # % of available capital
    "max_trades_per_day": 3,
    "risk_per_trade": 2,              # % of available capital
    "profit_booking_rule": {"type": "target_percent", "value": 3},
    "stop_loss_rule": {"type": "fixed_percent", "value": 1.5},
    "trading_mode": "PAPER",          # PAPER | LIVE
    "execution_mode": "MANUAL_CONFIRM",  # MANUAL_CONFIRM | AUTO_RULED
    "capital_available": 0,           # fetched from Dhan at scan time (READ ONLY)
}

# Runtime config — mutated only through update_config()
_config = copy.deepcopy(_DEFAULT_CONFIG)

# Agent active flag (kill-switch sets this to False)
_agent_active = True


def get_config() -> dict:
    """Return a *copy* of the current agent configuration."""
    return copy.deepcopy(_config)


def update_config(data: dict) -> dict:
    """
    Merge user-supplied values into the config.
    Returns the updated config copy.
    Raises ValueError on invalid input.
    """
    global _config

    VALID_SECTORS = set(SECTOR_SCRIPS.keys())
    VALID_TRADING_MODES = {"PAPER", "LIVE"}
    VALID_EXECUTION_MODES = {"MANUAL_CONFIRM", "AUTO_RULED"}

    if "allowed_sectors" in data:
        sectors = data["allowed_sectors"]
        if not isinstance(sectors, list) or not sectors:
            raise ValueError("allowed_sectors must be a non-empty list")
        invalid = [s for s in sectors if s not in VALID_SECTORS]
        if invalid:
            raise ValueError(f"Invalid sectors: {invalid}. Valid: {sorted(VALID_SECTORS)}")
        _config["allowed_sectors"] = sectors

    for key in ("max_capital_per_trade", "risk_per_trade"):
        if key in data:
            val = data[key]
            if not isinstance(val, (int, float)) or val <= 0 or val > 100:
                raise ValueError(f"{key} must be a number between 0 and 100")
            _config[key] = val

    if "max_trades_per_day" in data:
        val = data["max_trades_per_day"]
        if not isinstance(val, int) or val <= 0 or val > 50:
            raise ValueError("max_trades_per_day must be an integer between 1 and 50")
        _config["max_trades_per_day"] = val

    if "profit_booking_rule" in data:
        rule = data["profit_booking_rule"]
        if not isinstance(rule, dict) or "type" not in rule or "value" not in rule:
            raise ValueError("profit_booking_rule must have 'type' and 'value'")
        _config["profit_booking_rule"] = rule

    if "stop_loss_rule" in data:
        rule = data["stop_loss_rule"]
        if not isinstance(rule, dict) or "type" not in rule or "value" not in rule:
            raise ValueError("stop_loss_rule must have 'type' and 'value'")
        _config["stop_loss_rule"] = rule

    if "trading_mode" in data:
        if data["trading_mode"] not in VALID_TRADING_MODES:
            raise ValueError(f"trading_mode must be one of {VALID_TRADING_MODES}")
        _config["trading_mode"] = data["trading_mode"]

    if "execution_mode" in data:
        if data["execution_mode"] not in VALID_EXECUTION_MODES:
            raise ValueError(f"execution_mode must be one of {VALID_EXECUTION_MODES}")
        _config["execution_mode"] = data["execution_mode"]

    # capital_available is read-only — silently ignore
    return get_config()


def set_capital(amount: float):
    """Set capital_available (called internally before scan, never by user)."""
    _config["capital_available"] = amount


def is_agent_active() -> bool:
    return _agent_active


def activate_agent():
    global _agent_active
    _agent_active = True


def deactivate_agent():
    """Kill switch — halts all agent activity."""
    global _agent_active
    _agent_active = False


def reset_config():
    """Reset config to defaults."""
    global _config, _agent_active
    _config = copy.deepcopy(_DEFAULT_CONFIG)
    _agent_active = True
