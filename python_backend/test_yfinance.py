import yfinance as yf
import pandas as pd

def fetch_data(symbol):
    print(f"Fetching data for {symbol}...")
    ticker = yf.Ticker(symbol)
    
    # Get current market data
    try:
        hist = ticker.history(period="1d")
        
        if not hist.empty:
            current_price = hist['Close'].iloc[-1]
            print(f"✅ {symbol} Price: ₹{current_price:.2f}")
        else:
            print(f"⚠️ No price data for {symbol}")
            
        # Get info (sometimes slow or rate limited, but good for verification)
        info = ticker.info
        if 'longName' in info:
            print(f"   Name: {info['longName']}")
        if 'currency' in info:
            print(f"   Currency: {info['currency']}")
            
    except Exception as e:
        print(f"   Error details: {e}")
        
    print("-" * 30)

if __name__ == "__main__":
    print("Satfin Algo - Python Market Data Test")
    print("=" * 30)
    
    # Test symbols for NSE and BSE
    symbols = ['TCS.NS', 'RELIANCE.BO', 'INFY.NS']
    
    for sym in symbols:
        try:
            fetch_data(sym)
        except Exception as e:
            print(f"❌ Error fetching {sym}: {e}")
