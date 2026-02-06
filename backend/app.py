from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import random
import yfinance as yf
import pandas as pd
import requests
from dhanhq import dhanhq
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta

# Load environment variables from .env file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

# Initialize DhanHQ client with credentials from environment variables
DHAN_CLIENT_ID = os.getenv('DHAN_CLIENT_ID')
DHAN_ACCESS_TOKEN = os.getenv('DHAN_ACCESS_TOKEN')

if not DHAN_CLIENT_ID or not DHAN_ACCESS_TOKEN:
    print("WARNING: Dhan API credentials not found. Set DHAN_CLIENT_ID and DHAN_ACCESS_TOKEN in .env file")
    dhan = None
else:
    dhan = dhanhq(DHAN_CLIENT_ID, DHAN_ACCESS_TOKEN)
    print(f"DhanHQ client initialized for client: {DHAN_CLIENT_ID}")

# Get the parent directory (project root) for serving static files
PROJECT_ROOT = os.path.join(os.path.dirname(__file__), '..')
FRONTEND_DIR = os.path.join(PROJECT_ROOT, 'frontend')
PAGES_DIR = os.path.join(FRONTEND_DIR, 'pages')

app = Flask(__name__, static_folder=FRONTEND_DIR)
# Enable CORS for all routes to allow requests from the frontend
CORS(app)

# Serve frontend files
@app.route('/')
def serve_index():
    return send_from_directory(FRONTEND_DIR, 'index.html')

@app.route('/pages/<path:filename>')
def serve_pages(filename):
    return send_from_directory(PAGES_DIR, filename)

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory(FRONTEND_DIR, filename)

def format_currency(value):
    return f"₹{value:,.2f}"

def require_dhan(f):
    """Decorator to check if Dhan client is available"""
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if dhan is None:
            return jsonify({"error": "Dhan API not configured. Set credentials in .env file"}), 503
        return f(*args, **kwargs)
    return decorated_function

# ===========================
# ACCOUNT ENDPOINTS (DHAN API)
# ===========================

@app.route('/api/account/funds', methods=['GET'])
@require_dhan
def get_fund_limits():
    """Get fund limits/balance from Dhan account"""
    try:
        response = dhan.get_fund_limits()
        if response.get('status') == 'success':
            data = response.get('data', {})
            return jsonify({
                "status": "success",
                "data": {
                    "available_balance": data.get('availabelBalance', 0),
                    "utilized_amount": data.get('utilizedAmount', 0),
                    "collateral_amount": data.get('collateralAmount', 0),
                    "withdrawable_balance": data.get('withdrawableBalance', 0),
                    "blocked_payout": data.get('blockedPayoutAmount', 0),
                    "sod_limit": data.get('sodLimit', 0),
                    "receivable_amount": data.get('receiveableAmount', 0),
                    "formatted_balance": format_currency(data.get('availabelBalance', 0))
                }
            })
        else:
            return jsonify({"status": "failure", "error": response.get('remarks', 'Unknown error')}), 400
    except Exception as e:
        print(f"Fund limits error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/account/holdings', methods=['GET'])
@require_dhan
def get_holdings():
    """Get portfolio holdings from Dhan account"""
    try:
        response = dhan.get_holdings()
        if response.get('status') == 'success':
            holdings = response.get('data', [])
            formatted_holdings = []
            total_value = 0
            total_pnl = 0
            
            for h in holdings:
                current_value = h.get('totalQty', 0) * h.get('lastTradedPrice', 0)
                cost_value = h.get('totalQty', 0) * h.get('avgCostPrice', 0)
                pnl = current_value - cost_value
                pnl_percent = (pnl / cost_value * 100) if cost_value > 0 else 0
                
                total_value += current_value
                total_pnl += pnl
                
                formatted_holdings.append({
                    "symbol": h.get('tradingSymbol'),
                    "exchange": h.get('exchange'),
                    "quantity": h.get('totalQty', 0),
                    "avg_cost": h.get('avgCostPrice', 0),
                    "ltp": h.get('lastTradedPrice', 0),
                    "current_value": current_value,
                    "pnl": pnl,
                    "pnl_percent": round(pnl_percent, 2),
                    "isin": h.get('isin'),
                    "security_id": h.get('securityId')
                })
            
            return jsonify({
                "status": "success",
                "data": {
                    "holdings": formatted_holdings,
                    "summary": {
                        "total_holdings": len(formatted_holdings),
                        "total_value": total_value,
                        "total_pnl": total_pnl,
                        "formatted_value": format_currency(total_value),
                        "formatted_pnl": format_currency(total_pnl)
                    }
                }
            })
        else:
            remarks = response.get('remarks', {})
            if remarks.get('error_code') == 'DH-1111':
                return jsonify({"status": "success", "data": {"holdings": [], "summary": {"total_holdings": 0, "total_value": 0, "total_pnl": 0}}})
            return jsonify({"status": "failure", "error": remarks}), 400
    except Exception as e:
        print(f"Holdings error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/account/positions', methods=['GET'])
@require_dhan
def get_positions():
    """Get open positions from Dhan account"""
    try:
        response = dhan.get_positions()
        if response.get('status') == 'success':
            positions = response.get('data', [])
            formatted_positions = []
            total_pnl = 0
            
            for p in positions:
                pnl = p.get('realizedProfit', 0) + p.get('unrealizedProfit', 0)
                total_pnl += pnl
                
                formatted_positions.append({
                    "symbol": p.get('tradingSymbol'),
                    "exchange": p.get('exchangeSegment'),
                    "product_type": p.get('productType'),
                    "position_type": p.get('positionType'),
                    "quantity": p.get('netQty', 0),
                    "buy_qty": p.get('buyQty', 0),
                    "sell_qty": p.get('sellQty', 0),
                    "buy_avg": p.get('buyAvg', 0),
                    "sell_avg": p.get('sellAvg', 0),
                    "ltp": p.get('lastTradedPrice', 0),
                    "realized_pnl": p.get('realizedProfit', 0),
                    "unrealized_pnl": p.get('unrealizedProfit', 0),
                    "total_pnl": pnl,
                    "security_id": p.get('securityId')
                })
            
            return jsonify({
                "status": "success",
                "data": {
                    "positions": formatted_positions,
                    "summary": {
                        "total_positions": len(formatted_positions),
                        "total_pnl": total_pnl,
                        "formatted_pnl": format_currency(total_pnl)
                    }
                }
            })
        else:
            return jsonify({"status": "failure", "error": response.get('remarks', 'Unknown error')}), 400
    except Exception as e:
        print(f"Positions error: {e}")
        return jsonify({"error": str(e)}), 500

# ===========================
# ORDER MANAGEMENT (DHAN API)
# ===========================

@app.route('/api/orders', methods=['GET'])
@require_dhan
def get_orders():
    """Get order book from Dhan account"""
    try:
        response = dhan.get_order_list()
        if response.get('status') == 'success':
            orders = response.get('data', [])
            formatted_orders = []
            
            for o in orders:
                formatted_orders.append({
                    "order_id": o.get('orderId'),
                    "symbol": o.get('tradingSymbol'),
                    "exchange": o.get('exchangeSegment'),
                    "transaction_type": o.get('transactionType'),
                    "order_type": o.get('orderType'),
                    "product_type": o.get('productType'),
                    "quantity": o.get('quantity', 0),
                    "filled_qty": o.get('filledQty', 0),
                    "pending_qty": o.get('pendingQty', 0),
                    "price": o.get('price', 0),
                    "trigger_price": o.get('triggerPrice', 0),
                    "status": o.get('orderStatus'),
                    "validity": o.get('validity'),
                    "created_time": o.get('createTime'),
                    "updated_time": o.get('updateTime'),
                    "security_id": o.get('securityId')
                })
            
            return jsonify({
                "status": "success",
                "data": {
                    "orders": formatted_orders,
                    "total_orders": len(formatted_orders)
                }
            })
        else:
            return jsonify({"status": "success", "data": {"orders": [], "total_orders": 0}})
    except Exception as e:
        print(f"Orders error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/orders/place', methods=['POST'])
@require_dhan
def place_order():
    """Place a new order via Dhan API"""
    try:
        data = request.get_json()
        
        # Required fields
        security_id = data.get('security_id')
        exchange = data.get('exchange', 'NSE')
        segment = data.get('segment', 'NSE_EQ')
        transaction_type = data.get('transaction_type', 'BUY')
        quantity = data.get('quantity')
        order_type = data.get('order_type', 'MARKET')
        product_type = data.get('product_type', 'INTRADAY')
        price = data.get('price', 0)
        trigger_price = data.get('trigger_price', 0)
        validity = data.get('validity', 'DAY')
        
        if not security_id or not quantity:
            return jsonify({"error": "security_id and quantity are required"}), 400
        
        response = dhan.place_order(
            security_id=security_id,
            exchange_segment=segment,
            transaction_type=transaction_type,
            quantity=int(quantity),
            order_type=order_type,
            product_type=product_type,
            price=float(price),
            trigger_price=float(trigger_price),
            validity=validity
        )
        
        if response.get('status') == 'success':
            return jsonify({
                "status": "success",
                "message": "Order placed successfully",
                "data": {
                    "order_id": response.get('data', {}).get('orderId'),
                    "order_status": response.get('data', {}).get('orderStatus')
                }
            })
        else:
            return jsonify({"status": "failure", "error": response.get('remarks', response)}), 400
    except Exception as e:
        print(f"Place order error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/orders/modify', methods=['PUT'])
@require_dhan
def modify_order():
    """Modify an existing order via Dhan API"""
    try:
        data = request.get_json()
        
        order_id = data.get('order_id')
        order_type = data.get('order_type')
        quantity = data.get('quantity')
        price = data.get('price', 0)
        trigger_price = data.get('trigger_price', 0)
        validity = data.get('validity', 'DAY')
        
        if not order_id:
            return jsonify({"error": "order_id is required"}), 400
        
        response = dhan.modify_order(
            order_id=order_id,
            order_type=order_type,
            quantity=int(quantity) if quantity else None,
            price=float(price),
            trigger_price=float(trigger_price),
            validity=validity
        )
        
        if response.get('status') == 'success':
            return jsonify({
                "status": "success",
                "message": "Order modified successfully",
                "data": response.get('data')
            })
        else:
            return jsonify({"status": "failure", "error": response.get('remarks', response)}), 400
    except Exception as e:
        print(f"Modify order error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/orders/cancel', methods=['DELETE'])
@require_dhan
def cancel_order():
    """Cancel an existing order via Dhan API"""
    try:
        order_id = request.args.get('order_id')
        
        if not order_id:
            return jsonify({"error": "order_id is required"}), 400
        
        response = dhan.cancel_order(order_id=order_id)
        
        if response.get('status') == 'success':
            return jsonify({
                "status": "success",
                "message": "Order cancelled successfully",
                "data": response.get('data')
            })
        else:
            return jsonify({"status": "failure", "error": response.get('remarks', response)}), 400
    except Exception as e:
        print(f"Cancel order error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/trades', methods=['GET'])
@require_dhan
def get_trades():
    """Get trade book from Dhan account"""
    try:
        response = dhan.get_trade_book()
        if response.get('status') == 'success':
            trades = response.get('data', [])
            formatted_trades = []
            
            for t in trades:
                formatted_trades.append({
                    "trade_id": t.get('tradeId'),
                    "order_id": t.get('orderId'),
                    "symbol": t.get('tradingSymbol'),
                    "exchange": t.get('exchangeSegment'),
                    "transaction_type": t.get('transactionType'),
                    "product_type": t.get('productType'),
                    "quantity": t.get('tradedQuantity', 0),
                    "price": t.get('tradedPrice', 0),
                    "trade_time": t.get('exchangeTime'),
                    "security_id": t.get('securityId')
                })
            
            return jsonify({
                "status": "success",
                "data": {
                    "trades": formatted_trades,
                    "total_trades": len(formatted_trades)
                }
            })
        else:
            return jsonify({"status": "success", "data": {"trades": [], "total_trades": 0}})
    except Exception as e:
        print(f"Trades error: {e}")
        return jsonify({"error": str(e)}), 500

# ===========================
# DASHBOARD STATS (REAL DATA)
# ===========================

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Dashboard stats - uses real Dhan data if available"""
    try:
        if dhan:
            fund_response = dhan.get_fund_limits()
            if fund_response.get('status') == 'success':
                fund_data = fund_response.get('data', {})
                available = fund_data.get('availabelBalance', 0)
                utilized = fund_data.get('utilizedAmount', 0)
                total_funds = available + utilized
                margin_util = (utilized / total_funds * 100) if total_funds > 0 else 0
                
                return jsonify({
                    "active_strategies": 0,
                    "total_strategies": 0,
                    "paused_strategies": 0,
                    "available_balance": available,
                    "utilized_margin": utilized,
                    "margin_utilization": round(margin_util, 1),
                    "formatted_balance": format_currency(available),
                    "system_status": "DHAN CONNECTED"
                })
    except Exception as e:
        print(f"Stats error (falling back to mock): {e}")
    
    # Fallback to mock data
    active = 7 + random.randint(0, 2)
    total = 12
    paused = total - active
    margin = round(21.5 + random.uniform(0, 2), 1)
    return jsonify({
        "active_strategies": active,
        "total_strategies": total,
        "paused_strategies": paused,
        "margin_utilization": margin,
        "system_status": "SYSTEM OK (MOCK)"
    })

# ===========================
# MARKET DATA ENDPOINTS
# ===========================

@app.route('/api/search', methods=['GET'])
def search_symbol():
    query = request.args.get('q')
    if not query:
        return jsonify({"bestMatches": []})
        
    try:
        url = f"https://query2.finance.yahoo.com/v1/finance/search?q={query}&lang=en-US&region=IN&quotesCount=10&newsCount=0"
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers)
        data = response.json()
        
        matches = []
        if 'quotes' in data:
            for item in data['quotes']:
                symbol = item.get('symbol')
                if not symbol:
                    continue
                if item.get('quoteType') == 'EQUITY' and item.get('isYfin', True):
                    if '.NS' in symbol or '.BO' in symbol:
                        matches.append({
                            "1. symbol": symbol,
                            "2. name": item.get('longname') or item.get('shortname'),
                            "4. region": "India/NSE" if ".NS" in symbol else "India/Bombay",
                            "8. currency": "INR"
                        })
                        
        return jsonify({"bestMatches": matches})
        
    except Exception as e:
        print(f"Search error: {e}")
        return jsonify({"error": str(e), "bestMatches": []})

@app.route('/api/status', methods=['GET'])
def status():
    dhan_status = "connected" if dhan else "not configured"
    return jsonify({
        "status": "online",
        "service": "Satfin Python Market Data",
        "dhan_api": dhan_status,
        "client_id": DHAN_CLIENT_ID if dhan else None
    })

@app.route('/api/quote', methods=['GET'])
def get_quote():
    symbol = request.args.get('symbol')
    if not symbol:
        return jsonify({"error": "Symbol is required"}), 400
    
    yf_symbol = symbol.replace('.BSE', '.BO')
    
    try:
        ticker = yf.Ticker(yf_symbol)
        hist = ticker.history(period="1d")
        
        if hist.empty:
             return jsonify({"error": f"No data found for symbol '{symbol}'"}), 404
             
        current_price = hist['Close'].iloc[-1]
        open_price = hist['Open'].iloc[-1]
        prev_close = ticker.info.get('previousClose', open_price)
        
        change = current_price - prev_close
        change_percent = (change / prev_close) * 100
        
        name = ticker.info.get('longName', symbol)
        currency = ticker.info.get('currency', 'INR')
        
        return jsonify({
            "symbol": symbol,
            "name": name,
            "price": current_price,
            "change": change,
            "change_percent": change_percent,
            "currency": currency,
            "exchange": "BSE" if ".BO" in yf_symbol else "NSE",
            "formatted_price": format_currency(current_price)
        })
        
    except Exception as e:
        print(f"Error fetching {symbol}: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/history', methods=['GET'])
def get_history():
    symbol = request.args.get('symbol')
    period = request.args.get('period', '1mo')
    interval = request.args.get('interval', '1d')
    
    if not symbol:
        return jsonify({"error": "Symbol is required"}), 400
        
    yf_symbol = symbol.replace('.BSE', '.BO')
    
    try:
        ticker = yf.Ticker(yf_symbol)
        hist = ticker.history(period=period, interval=interval)
        
        if hist.empty:
            return jsonify({"error": "No history found", "symbol": symbol}), 404
            
        close = hist['Close']
        
        hist['EMA_9'] = close.ewm(span=9, adjust=False).mean()
        hist['EMA_21'] = close.ewm(span=21, adjust=False).mean()
        
        delta = close.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss.replace(0, float('nan'))
        hist['RSI'] = (100 - (100 / (1 + rs))).clip(0, 100).fillna(50)
        
        exp12 = close.ewm(span=12, adjust=False).mean()
        exp26 = close.ewm(span=26, adjust=False).mean()
        macd = exp12 - exp26
        signal = macd.ewm(span=9, adjust=False).mean()
        hist['MACD'] = macd
        hist['MACD_Signal'] = signal
        hist['MACD_Hist'] = macd - signal
        
        vwap_vol = hist['Volume'] * ((hist['High'] + hist['Low'] + close) / 3)
        vol_cum = hist['Volume'].cumsum()
        hist['VWAP'] = (vwap_vol.cumsum() / vol_cum.replace(0, float('nan'))).ffill().fillna(close)
        
        data = []
        for index, row in hist.iterrows():
            data.append({
                "date": index.strftime('%Y-%m-%d %H:%M:%S'),
                "close": row['Close'],
                "volume": row['Volume'],
                "ema_9": row['EMA_9'],
                "ema_21": row['EMA_21'],
                "rsi": row['RSI'],
                "macd": row['MACD'],
                "macd_signal": row['MACD_Signal'],
                "macd_hist": row['MACD_Hist'],
                "vwap": row['VWAP']
            })
            
        return jsonify({
            "symbol": symbol,
            "period": period,
            "data": data
        })
        
    except Exception as e:
        print(f"History error: {e}")
        return jsonify({"error": str(e)}), 500

# ===========================
# LEGACY ENDPOINTS (MOCK DATA)
# ===========================

@app.route('/api/strategies', methods=['GET'])
def get_strategies():
    strategies = [
        {"id": 1, "name": "Trend Follower v2.1", "status": "active", "pnl": 4231.00 + random.uniform(-80, 80), "drawdown": round(1.0 + random.uniform(0, 0.5), 1), "color": "success"},
        {"id": 2, "name": "Mean Reversion Alpha", "status": "active", "pnl": -842.20 + random.uniform(-40, 40), "drawdown": round(3.8 + random.uniform(0, 0.6), 1), "color": "primary"},
        {"id": 3, "name": "Sentiment Grid BOT", "status": "paused", "pnl": 0.00, "drawdown": 0.0, "color": "slate"}
    ]
    return jsonify({"strategies": strategies})

@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    now = datetime.now()
    t_now = now.strftime("%I:%M %p")
    t_1 = (now - timedelta(minutes=17)).strftime("%I:%M %p")
    t_2 = (now - timedelta(minutes=95)).strftime("%I:%M %p")
    alerts = [
        {"id": 1, "type": "warning", "title": "High Volatility Detected", "message": "RELIANCE.NSE slippage exceeding 5bps on NSE.", "time": t_now, "tag": "CRITICAL"},
        {"id": 2, "type": "info", "title": "API Handshake Success", "message": f"Websocket connection established. Latency: {38 + random.randint(0, 12)}ms.", "time": t_1, "tag": "SYSTEM"},
        {"id": 3, "type": "success", "title": "Take Profit Triggered", "message": "NVDA position closed at ₹892.40. Net profit: ₹1,240.00.", "time": t_2, "tag": "TRADE"}
    ]
    return jsonify({"alerts": alerts, "active_count": len(alerts)})

@app.route('/api/exposure', methods=['GET'])
def get_exposure():
    if dhan:
        try:
            holdings_response = dhan.get_holdings()
            positions_response = dhan.get_positions()
            
            holdings_value = 0
            if holdings_response.get('status') == 'success':
                for h in holdings_response.get('data', []):
                    holdings_value += h.get('totalQty', 0) * h.get('lastTradedPrice', 0)
            
            positions_value = 0
            if positions_response.get('status') == 'success':
                for p in positions_response.get('data', []):
                    positions_value += abs(p.get('netQty', 0) * p.get('lastTradedPrice', 0))
            
            total = holdings_value + positions_value
            if total > 0:
                return jsonify({
                    "holdings": round(holdings_value / total * 100),
                    "positions": round(positions_value / total * 100),
                    "cash": 0,
                    "total_value": total,
                    "formatted_total": format_currency(total)
                })
        except Exception as e:
            print(f"Exposure error: {e}")
    
    equities = 65 + random.randint(-2, 2)
    crypto = 25 + random.randint(-1, 1)
    fx = 100 - equities - crypto
    return jsonify({"equities": equities, "crypto": crypto, "fx": fx})

if __name__ == '__main__':
    print("Starting Satfin Python Backend on port 5001...")
    print(f"Dhan API: {'Connected' if dhan else 'Not configured'}")
    app.run(debug=True, port=5001)
