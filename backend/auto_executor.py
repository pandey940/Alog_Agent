"""
Autonomous Trading Agent — Auto Execution Engine

Connects signal generation to order placement (Dhan API for LIVE, simulated for PAPER).
Monitors open positions and auto-exits at target/stop-loss.
"""

import math
# import yfinance as yf  <-- Moved to functions
from datetime import datetime

import trade_store


# Dhan security ID mapping for common NSE stocks
# In production, this should be fetched from Dhan's instrument list
SECURITY_IDS = {
    "RELIANCE.NS": "2885",
    "TCS.NS": "11536",
    "HDFCBANK.NS": "1333",
    "INFY.NS": "1594",
    "ICICIBANK.NS": "4963",
    "HINDUNILVR.NS": "1394",
    "BHARTIARTL.NS": "10604",
    "SBIN.NS": "3045",
    "BAJFINANCE.NS": "317",
    "LT.NS": "11483",
    "KOTAKBANK.NS": "1922",
    "AXISBANK.NS": "5900",
    "INDUSINDBK.NS": "5258",
    "BANDHANBNK.NS": "579",
    "FEDERALBNK.NS": "1023",
    "WIPRO.NS": "3787",
    "HCLTECH.NS": "7229",
    "TECHM.NS": "13538",
    "LTIM.NS": "17818",
    "MPHASIS.NS": "4503",
    "COFORGE.NS": "11543",
    "SUNPHARMA.NS": "3351",
    "DRREDDY.NS": "881",
    "CIPLA.NS": "694",
    "DIVISLAB.NS": "10940",
    "APOLLOHOSP.NS": "157",
    "LUPIN.NS": "10440",
    "AUROPHARMA.NS": "275",
    "BIOCON.NS": "11373",
    "MARUTI.NS": "10999",
    "TATAMOTORS.NS": "3456",
    "M&M.NS": "2031",
    "BAJAJ-AUTO.NS": "16669",
    "HEROMOTOCO.NS": "1348",
    "EICHERMOT.NS": "13596",
    "ASHOKLEY.NS": "212",
    "TVSMOTOR.NS": "8479",
    "ITC.NS": "1660",
    "NESTLEIND.NS": "17963",
    "BRITANNIA.NS": "547",
    "GODREJCP.NS": "10099",
    "DABUR.NS": "772",
    "MARICO.NS": "4067",
    "COLPAL.NS": "15141",
    "ONGC.NS": "2475",
    "NTPC.NS": "11630",
    "POWERGRID.NS": "14977",
    "ADANIGREEN.NS": "13141",
    "TATAPOWER.NS": "3426",
    "BPCL.NS": "526",
    "IOC.NS": "1624",
    "TATASTEEL.NS": "3499",
    "JSWSTEEL.NS": "11723",
    "HINDALCO.NS": "1363",
    "VEDL.NS": "3063",
    "COALINDIA.NS": "20374",
    "NMDC.NS": "15332",
    "NATIONALUM.NS": "6364",
    "SAIL.NS": "2963",
}


def execute_signal(signal: dict, config: dict, dhan_client) -> dict | None:
    """
    Execute a qualified signal by placing an order.

    For LIVE mode: places real order via Dhan API
    For PAPER mode: simulates order at current price

    Returns the trade record or None on failure.
    """
    if signal.get("signal_status") != "QUALIFIED":
        return None

    ticker = signal.get("ticker", "")
    entry_price = signal.get("entry_price", 0)
    stop_loss = signal.get("stop_loss", 0)
    target_price = signal.get("target_price", 0)
    sector = signal.get("sector", "")

    if entry_price <= 0:
        print(f"[AutoExecutor] Invalid entry price for {ticker}")
        return None

    # Calculate position size
    capital = config.get("capital_available", 0)
    max_capital_pct = config.get("max_capital_per_trade", 5) / 100
    max_trade_capital = capital * max_capital_pct
    quantity = max(1, math.floor(max_trade_capital / entry_price))

    trading_mode = config.get("trading_mode", "PAPER")
    order_id = None
    security_id = SECURITY_IDS.get(ticker, "")

    if trading_mode == "LIVE" and dhan_client:
        # Place real order via Dhan
        if not security_id:
            print(f"[AutoExecutor] No security ID for {ticker}, skipping LIVE order")
            return None

        try:
            response = dhan_client.place_order(
                security_id=security_id,
                exchange_segment="NSE_EQ",
                transaction_type="BUY",
                quantity=quantity,
                order_type="MARKET",
                product_type="INTRADAY",
                price=0,
                trigger_price=0,
                validity="DAY",
            )

            if response.get("status") == "success":
                order_id = response.get("data", {}).get("orderId")
                print(f"[AutoExecutor] LIVE order placed: {ticker} qty={quantity} order_id={order_id}")
            else:
                print(f"[AutoExecutor] LIVE order failed for {ticker}: {response.get('remarks', response)}")
                return None
        except Exception as e:
            print(f"[AutoExecutor] LIVE order error for {ticker}: {e}")
            return None
    else:
        # Paper trade — simulate
        order_id = f"PAPER-{signal.get('id', 'unknown')}"
        print(f"[AutoExecutor] PAPER order: {ticker} qty={quantity} @ {entry_price}")

    # Save trade to persistent store
    trade = trade_store.save_trade({
        "signal_id": signal.get("id", ""),
        "symbol": ticker,
        "display_symbol": signal.get("symbol", ticker.replace(".NS", "")),
        "sector": sector,
        "entry_price": entry_price,
        "quantity": quantity,
        "security_id": security_id,
        "order_id": order_id,
        "stop_loss": stop_loss,
        "target_price": target_price,
        "risk_reward_ratio": signal.get("risk_reward_ratio", 0),
        "trading_mode": trading_mode,
    })

    return trade


def check_and_exit_positions(dhan_client, config: dict) -> list:
    """
    Monitor all open trades and auto-exit at target/stop-loss.
    Returns list of closed trades.
    """
    open_trades = trade_store.get_open_trades()
    if not open_trades:
        return []

    closed = []
    trading_mode = config.get("trading_mode", "PAPER")

    for trade in open_trades:
        ticker = trade.get("symbol", "")
        if not ticker:
            continue

        try:
            # Fetch current price
            import yfinance as yf
            stock = yf.Ticker(ticker)
            hist = stock.history(period="1d")
            if hist.empty:
                continue
            current_price = float(hist["Close"].iloc[-1])

            target = trade.get("target_price", 0)
            sl = trade.get("stop_loss", 0)
            trade_id = trade["trade_id"]

            exit_reason = None
            if current_price >= target:
                exit_reason = "TARGET_HIT"
            elif current_price <= sl:
                exit_reason = "STOP_LOSS_HIT"

            if exit_reason:
                # Exit the position
                if trading_mode == "LIVE" and dhan_client:
                    security_id = trade.get("security_id", "")
                    if security_id:
                        try:
                            dhan_client.place_order(
                                security_id=security_id,
                                exchange_segment="NSE_EQ",
                                transaction_type="SELL",
                                quantity=trade.get("quantity", 1),
                                order_type="MARKET",
                                product_type="INTRADAY",
                                price=0,
                                trigger_price=0,
                                validity="DAY",
                            )
                            print(f"[AutoExecutor] LIVE exit: {ticker} reason={exit_reason}")
                        except Exception as e:
                            print(f"[AutoExecutor] LIVE exit error for {ticker}: {e}")
                            continue
                else:
                    print(f"[AutoExecutor] PAPER exit: {ticker} @ {current_price} reason={exit_reason}")

                # Close trade in store
                closed_trade = trade_store.close_trade(trade_id, current_price, exit_reason)
                if closed_trade:
                    closed.append(closed_trade)

        except Exception as e:
            print(f"[AutoExecutor] Price check error for {ticker}: {e}")
            continue

    return closed


def close_all_positions(dhan_client, config: dict, reason: str = "KILL_SWITCH") -> list:
    """
    Emergency close all open positions (kill switch).
    """
    open_trades = trade_store.get_open_trades()
    closed = []
    trading_mode = config.get("trading_mode", "PAPER")

    for trade in open_trades:
        ticker = trade.get("symbol", "")
        trade_id = trade["trade_id"]

        # Try to get current price for P&L calculation
        try:
            import yfinance as yf
            stock = yf.Ticker(ticker)
            hist = stock.history(period="1d")
            current_price = float(hist["Close"].iloc[-1]) if not hist.empty else trade["entry_price"]
        except Exception:
            current_price = trade["entry_price"]

        # Place sell order for LIVE
        if trading_mode == "LIVE" and dhan_client:
            security_id = trade.get("security_id", "")
            if security_id:
                try:
                    dhan_client.place_order(
                        security_id=security_id,
                        exchange_segment="NSE_EQ",
                        transaction_type="SELL",
                        quantity=trade.get("quantity", 1),
                        order_type="MARKET",
                        product_type="INTRADAY",
                        price=0,
                        trigger_price=0,
                        validity="DAY",
                    )
                except Exception as e:
                    print(f"[AutoExecutor] Kill switch exit error for {ticker}: {e}")

        closed_trade = trade_store.close_trade(trade_id, current_price, reason)
        if closed_trade:
            closed.append(closed_trade)
            print(f"[AutoExecutor] Closed {ticker} @ {current_price} reason={reason} P&L={closed_trade['pnl']}")

    return closed
