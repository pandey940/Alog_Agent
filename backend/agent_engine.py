"""
AI Market Intelligence Agent — Scanning Engine

Scans allowed sectors, computes technical indicators, and generates
rule-validated trade SIGNALS (never decisions or advice).

This module is stateless — it receives config and returns signal dicts.
"""

# import yfinance as yf  <-- Moved to scan_markets
import pandas as pd
from datetime import datetime

from agent_config import SECTOR_SCRIPS


def _compute_indicators(hist: pd.DataFrame) -> dict | None:
    """
    Compute EMA-9, EMA-21, RSI-14, ATR-14, VWAP from OHLCV data.
    Returns dict of indicator values at the latest bar, or None on failure.
    """
    if hist is None or len(hist) < 26:
        return None

    close = hist["Close"]
    high = hist["High"]
    low = hist["Low"]
    volume = hist["Volume"]

    # EMA
    ema9 = close.ewm(span=9, adjust=False).mean()
    ema21 = close.ewm(span=21, adjust=False).mean()

    # RSI-14
    delta = close.diff()
    gain = delta.where(delta > 0, 0).rolling(14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
    rs = gain / loss.replace(0, float("nan"))
    rsi = (100 - (100 / (1 + rs))).fillna(50)

    # ATR-14
    tr = pd.concat([
        high - low,
        (high - close.shift()).abs(),
        (low - close.shift()).abs(),
    ], axis=1).max(axis=1)
    atr = tr.rolling(14).mean()

    # VWAP
    typical = (high + low + close) / 3
    vwap_cum = (typical * volume).cumsum() / volume.cumsum().replace(0, float("nan"))

    last = len(hist) - 1
    return {
        "close": float(close.iloc[last]),
        "ema9": float(ema9.iloc[last]),
        "ema21": float(ema21.iloc[last]),
        "rsi": float(rsi.iloc[last]),
        "atr": float(atr.iloc[last]) if pd.notna(atr.iloc[last]) else float(close.iloc[last] * 0.015),
        "vwap": float(vwap_cum.iloc[last]) if pd.notna(vwap_cum.iloc[last]) else float(close.iloc[last]),
        "volume": float(volume.iloc[last]),
        "avg_volume": float(volume.rolling(14).mean().iloc[last]) if pd.notna(volume.rolling(14).mean().iloc[last]) else float(volume.iloc[last]),
    }


def _detect_trend(ind: dict) -> dict:
    """
    Detect trend direction and strength using EMA crossover + RSI + VWAP.
    Returns a dict with trend info.
    """
    bullish_ema = ind["ema9"] > ind["ema21"]
    rsi_ok = 40 <= ind["rsi"] <= 70
    above_vwap = ind["close"] > ind["vwap"]
    good_volume = ind["volume"] >= ind["avg_volume"] * 0.8

    trend_score = sum([bullish_ema, rsi_ok, above_vwap, good_volume])

    return {
        "is_bullish": bullish_ema and rsi_ok and above_vwap,
        "trend_score": trend_score,
        "bullish_ema_crossover": bullish_ema,
        "rsi_in_range": rsi_ok,
        "above_vwap": above_vwap,
        "volume_adequate": good_volume,
    }


def _calculate_levels(close: float, atr: float, config: dict) -> dict:
    """
    Calculate entry, stop-loss, and target prices based on ATR and config.
    """
    sl_pct = config["stop_loss_rule"]["value"] / 100
    target_pct = config["profit_booking_rule"]["value"] / 100

    # Use ATR-based stop-loss (1.5× ATR) or percentage, whichever is tighter
    atr_sl = close - (1.5 * atr)
    pct_sl = close * (1 - sl_pct)
    stop_loss = max(atr_sl, pct_sl)  # tighter = higher SL for long

    risk = close - stop_loss
    # Target: at least 1.5× risk, or percentage target, whichever is higher
    rr_target = close + (risk * 1.5)
    pct_target = close * (1 + target_pct)
    target = max(rr_target, pct_target)

    risk_reward = round((target - close) / risk, 2) if risk > 0 else 0

    return {
        "entry_price": round(close, 2),
        "stop_loss": round(stop_loss, 2),
        "target_price": round(target, 2),
        "risk_reward_ratio": risk_reward,
        "risk_amount": round(risk, 2),
    }


def _run_rule_checks(symbol: str, sector: str, levels: dict, config: dict,
                     trade_count: int) -> dict:
    """
    Validate all hard constraints.
    Returns dict of check results + overall pass/fail.
    """
    capital = config["capital_available"]

    # Sector check
    sector_allowed = sector in config["allowed_sectors"]

    # Risk check: risk per share × approx 1 share vs risk_per_trade % of capital
    risk_limit = capital * (config["risk_per_trade"] / 100) if capital > 0 else float("inf")
    risk_within_limit = levels["risk_amount"] <= risk_limit if capital > 0 else True

    # Capital check: entry price (1 share) vs max_capital_per_trade % of capital
    capital_limit = capital * (config["max_capital_per_trade"] / 100) if capital > 0 else float("inf")
    capital_within_limit = levels["entry_price"] <= capital_limit if capital > 0 else True

    # Trade count check
    trade_count_ok = trade_count < config["max_trades_per_day"]

    # R:R check
    rr_ok = levels["risk_reward_ratio"] >= 1.5

    all_pass = all([sector_allowed, risk_within_limit, capital_within_limit, trade_count_ok, rr_ok])

    checks = {
        "sector_allowed": sector_allowed,
        "risk_within_limit": risk_within_limit,
        "capital_within_limit": capital_within_limit,
        "trade_count_ok": trade_count_ok,
        "risk_reward_ok": rr_ok,
    }

    return {"all_pass": all_pass, "checks": checks}


def _build_rationale(trend: dict, levels: dict, rule_result: dict) -> str:
    """Build an objective, data-only rationale string."""
    parts = []

    if trend["is_bullish"]:
        parts.append(f"Bullish EMA crossover detected (EMA9 > EMA21). RSI at {trend.get('rsi', 'N/A'):.1f}, within 40-70 range." if 'rsi' in trend else "Bullish EMA crossover detected (EMA9 > EMA21).")
    else:
        reasons = []
        if not trend["bullish_ema_crossover"]:
            reasons.append("EMA9 below EMA21")
        if not trend["rsi_in_range"]:
            reasons.append("RSI outside 40-70 range")
        if not trend["above_vwap"]:
            reasons.append("price below VWAP")
        parts.append(f"Trend not confirmed: {', '.join(reasons)}.")

    parts.append(f"R:R ratio = {levels['risk_reward_ratio']}.")

    if not rule_result["all_pass"]:
        failed = [k for k, v in rule_result["checks"].items() if not v]
        parts.append(f"Rule check(s) failed: {', '.join(failed)}.")

    return " ".join(parts)


def scan_markets(config: dict) -> list:
    """
    Scan stocks across allowed sectors, compute indicators, detect trends,
    and generate rule-validated signals.

    Returns a list of signal dicts matching the mandatory JSON schema.
    """
    signals = []
    trade_count = 0
    seen_symbols = set()

    for sector in config["allowed_sectors"]:
        scrips = SECTOR_SCRIPS.get(sector, [])
        for symbol in scrips:
            if symbol in seen_symbols:
                continue
            seen_symbols.add(symbol)

            try:
                import yfinance as yf
                ticker = yf.Ticker(symbol)
                hist = ticker.history(period="1mo", interval="1d")

                if hist is None or hist.empty or len(hist) < 20:
                    continue

                indicators = _compute_indicators(hist)
                if indicators is None:
                    continue

                trend = _detect_trend(indicators)
                trend["rsi"] = indicators["rsi"]

                # Only generate signals for bullish setups
                if not trend["is_bullish"]:
                    continue

                levels = _calculate_levels(indicators["close"], indicators["atr"], config)
                rule_result = _run_rule_checks(symbol, sector, levels, config, trade_count)

                execution_instruction = "NONE"
                if rule_result["all_pass"]:
                    signal_status = "QUALIFIED"
                    trade_count += 1
                    if config["execution_mode"] == "MANUAL_CONFIRM":
                        execution_instruction = "WAIT_FOR_USER_CONFIRMATION"
                    else:
                        execution_instruction = "FORWARD_TO_EXECUTION_ENGINE"
                else:
                    signal_status = "REJECTED"

                rationale = _build_rationale(trend, levels, rule_result)

                signal = {
                    "signal_status": signal_status,
                    "symbol": symbol.replace(".NS", ""),
                    "ticker": symbol,
                    "sector": sector,
                    "entry_price": levels["entry_price"],
                    "stop_loss": levels["stop_loss"],
                    "target_price": levels["target_price"],
                    "risk_reward_ratio": levels["risk_reward_ratio"],
                    "rule_checks": rule_result["checks"],
                    "execution_instruction": execution_instruction,
                    "rationale": rationale,
                    "indicators": {
                        "ema9": round(indicators["ema9"], 2),
                        "ema21": round(indicators["ema21"], 2),
                        "rsi": round(indicators["rsi"], 2),
                        "atr": round(indicators["atr"], 2),
                        "vwap": round(indicators["vwap"], 2),
                        "volume": int(indicators["volume"]),
                    },
                    "trend": {
                        "score": trend["trend_score"],
                        "bullish_ema": trend["bullish_ema_crossover"],
                        "rsi_ok": trend["rsi_in_range"],
                        "above_vwap": trend["above_vwap"],
                        "volume_ok": trend["volume_adequate"],
                    },
                }

                signals.append(signal)

                # Stop if we have enough qualified signals
                if trade_count >= config["max_trades_per_day"]:
                    break

            except Exception as e:
                print(f"[AgentEngine] Error scanning {symbol}: {e}")
                continue

        if trade_count >= config["max_trades_per_day"]:
            break

    return rank_signals(signals)


def rank_signals(signals: list) -> list:
    """
    Rank signals by: QUALIFIED first, then by R:R ratio (desc),
    then by trend score (desc), then by volume (desc).
    """
    def sort_key(s):
        status_rank = 0 if s["signal_status"] == "QUALIFIED" else 1
        return (
            status_rank,
            -s.get("risk_reward_ratio", 0),
            -s.get("trend", {}).get("score", 0),
            -s.get("indicators", {}).get("volume", 0),
        )

    return sorted(signals, key=sort_key)
