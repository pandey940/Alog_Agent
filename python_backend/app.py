from flask import Flask, jsonify, request
from flask_cors import CORS
import random
import yfinance as yf
import pandas as pd
import requests
from dhanhq import dhanhq

# Initialize DhanHQ client
# TODO: Replace "client_id" and "access_token" with actual credentials or environment variables
dhan = dhanhq("client_id", "access_token")


app = Flask(__name__)
# Enable CORS for all routes to allow requests from the frontend
CORS(app)

@app.route('/api/stats', methods=['GET'])
def get_stats():
    # Mock data for dashboard stats - slight variation so UI visibly updates on refresh
    # In a real app, this would come from the trading engine/database
    active = 7 + random.randint(0, 2)   # 7–9 active
    total = 12
    paused = total - active
    margin = round(21.5 + random.uniform(0, 2), 1)  # 21.5–23.5%
    return jsonify({
        "active_strategies": active,
        "total_strategies": total,
        "paused_strategies": paused,
        "margin_utilization": margin,
        "system_status": "SYSTEM OK"
    })

@app.route('/api/search', methods=['GET'])
def search_symbol():
    query = request.args.get('q')
    if not query:
        return jsonify({"bestMatches": []})
        
    try:
        # Yahoo Finance Autocomplete API
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
                # Filter for Equity and Indian exchanges
                if item.get('quoteType') == 'EQUITY' and item.get('isYfin', True):
                    # Look for Indian symbols
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

def format_currency(value):
    return f"₹{value:,.2f}"

@app.route('/api/status', methods=['GET'])
def status():
    return jsonify({"status": "online", "service": "Satfin Python Market Data"})

@app.route('/api/quote', methods=['GET'])
def get_quote():
    symbol = request.args.get('symbol')
    if not symbol:
        return jsonify({"error": "Symbol is required"}), 400
    
    # Handle common suffixes if missing (default to NSE if no suffix)
    if not ('.NS' in symbol or '.BO' in symbol or '.BSE' in symbol):
        # Default to NSE if valid, else try BSE? For now, assume user/frontend sends correct suffix
        pass

    # Normalize .BSE to .BO for yfinance (Yahoo Finance uses .BO for BSE)
    yf_symbol = symbol.replace('.BSE', '.BO')
    
    try:
        ticker = yf.Ticker(yf_symbol)
        
        # Fast fetch using fast_info or history
        # history(period="1d") is reliable for latest price
        hist = ticker.history(period="1d")
        
        if hist.empty:
             print(f"Warning: No data found for {yf_symbol} (original: {symbol})")
             return jsonify({
                 "error": f"No data found for symbol '{symbol}'", 
                 "provider_symbol": yf_symbol
             }), 404
             
        current_price = hist['Close'].iloc[-1]
        open_price = hist['Open'].iloc[-1]
        prev_close = ticker.info.get('previousClose', open_price) # Fallback to open if prev_close missing
        
        # Calculate change
        change = current_price - prev_close
        change_percent = (change / prev_close) * 100
        
        # Get basic info
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
        
    # Handle common suffixes
    yf_symbol = symbol.replace('.BSE', '.BO')
    
    try:
        ticker = yf.Ticker(yf_symbol)
        hist = ticker.history(period=period, interval=interval)
        
        if hist.empty:
            return jsonify({"error": "No history found", "symbol": symbol}), 404
            
        # --- Indicator Calculations ---
        # Ensure Close is float
        close = hist['Close']
        
        # 1. EMAs (9 and 21)
        hist['EMA_9'] = close.ewm(span=9, adjust=False).mean()
        hist['EMA_21'] = close.ewm(span=21, adjust=False).mean()
        
        # 2. RSI (14) — avoid div-by-zero and clip to 0–100
        delta = close.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss.replace(0, float('nan'))
        hist['RSI'] = (100 - (100 / (1 + rs))).clip(0, 100).fillna(50)
        
        # 3. MACD (12, 26, 9)
        exp12 = close.ewm(span=12, adjust=False).mean()
        exp26 = close.ewm(span=26, adjust=False).mean()
        macd = exp12 - exp26
        signal = macd.ewm(span=9, adjust=False).mean()
        hist['MACD'] = macd
        hist['MACD_Signal'] = signal
        hist['MACD_Hist'] = macd - signal
        
        # 4. VWAP (Cumulative over the fetched period) — avoid div-by-zero when Volume is 0
        vwap_vol = hist['Volume'] * ((hist['High'] + hist['Low'] + close) / 3)
        vol_cum = hist['Volume'].cumsum()
        hist['VWAP'] = (vwap_vol.cumsum() / vol_cum.replace(0, float('nan'))).ffill().fillna(close)
        
        # Format data for chart
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


from datetime import datetime, timedelta

@app.route('/api/strategies', methods=['GET'])
def get_strategies():
    # Simulate dynamic data - P&L and drawdown vary each request so UI visibly updates
    strategies = [
        {
            "id": 1,
            "name": "Trend Follower v2.1",
            "status": "active",
            "pnl": 4231.00 + random.uniform(-80, 80),
            "drawdown": round(1.0 + random.uniform(0, 0.5), 1),
            "color": "success"
        },
        {
            "id": 2,
            "name": "Mean Reversion Alpha",
            "status": "active",
            "pnl": -842.20 + random.uniform(-40, 40),
            "drawdown": round(3.8 + random.uniform(0, 0.6), 1),
            "color": "primary"
        },
        {
            "id": 3,
            "name": "Sentiment Grid BOT",
            "status": "paused",
            "pnl": 0.00,
            "drawdown": 0.0,
            "color": "slate"
        }
    ]
    return jsonify({"strategies": strategies})

@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    # Dynamic alerts: latest alert uses current time so each refresh shows "live" update
    now = datetime.now()
    t_now = now.strftime("%I:%M %p")
    t_1 = (now.replace(second=0, microsecond=0) - timedelta(minutes=17)).strftime("%I:%M %p")
    t_2 = (now.replace(second=0, microsecond=0) - timedelta(minutes=95)).strftime("%I:%M %p")
    alerts = [
        {
            "id": 1,
            "type": "warning",
            "title": "High Volatility Detected",
            "message": "RELIANCE.NSE slippage exceeding 5bps on NSE. Strategy 'Scalper v1' paused by risk engine.",
            "time": t_now,
            "tag": "CRITICAL"
        },
        {
            "id": 2,
            "type": "info",
            "title": "API Handshake Success",
            "message": "Primary websocket connection re-established with NSE Live Feed. Latency: {}ms.".format(38 + random.randint(0, 12)),
            "time": t_1,
            "tag": "SYSTEM"
        },
        {
            "id": 3,
            "type": "success",
            "title": "Take Profit Triggered",
            "message": "NVDA long position closed at ₹892.40. Target reached (+4.2%). Net profit: ₹1,240.00.",
            "time": t_2,
            "tag": "TRADE"
        }
    ]
    return jsonify({"alerts": alerts, "active_count": len(alerts)})

@app.route('/api/exposure', methods=['GET'])
def get_exposure():
    # Simulate slight fluctuation
    equities = 65 + random.randint(-2, 2)
    crypto = 25 + random.randint(-1, 1)
    # FX is remainder
    fx = 100 - equities - crypto
    
    return jsonify({
        "equities": equities,
        "crypto": crypto,
        "fx": fx
    })

if __name__ == '__main__':
    print("Starting Satfin Python Backend on port 5001...")
    app.run(debug=True, port=5001)
