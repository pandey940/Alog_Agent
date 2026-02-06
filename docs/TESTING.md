# SATFIN Algo Trading Platform – Test Checklist

## Quick start (run before testing)

1. **Python backend (port 5001)**  
   ```bash
   cd /Users/punitpandey/Documents/GitHub/Algo_Agent
   source .venv/bin/activate
   python python_backend/app.py
   ```

2. **Frontend (port 8080)** – in another terminal:  
   ```bash
   cd /Users/punitpandey/Documents/GitHub/Algo_Agent
   python3 -m http.server 8080
   ```

3. **Open in browser:** http://localhost:8080/index.html

---

## API verification (optional)

Run these to confirm the Python API is up:

```bash
# Status
curl -s http://127.0.0.1:5001/api/status

# Stats (dashboard counts)
curl -s http://127.0.0.1:5001/api/stats

# Quote (e.g. TCS.NS)
curl -s "http://127.0.0.1:5001/api/quote?symbol=TCS.NS"

# History (chart data)
curl -s "http://127.0.0.1:5001/api/history?symbol=TCS.NS&period=1mo&interval=1d" | head -c 300

# Strategies, alerts, exposure
curl -s http://127.0.0.1:5001/api/strategies
curl -s http://127.0.0.1:5001/api/alerts
curl -s http://127.0.0.1:5001/api/exposure
```

---

## Manual UI checklist

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open http://localhost:8080/index.html | Dashboard loads; no console errors. |
| 2 | Wait 2–3 seconds | Stats (08/12 strategies, 22.4% margin), strategies table, alerts, and exposure bars appear. |
| 3 | Check chart | Portfolio Equity Curve shows TCS.NS (or default) with price line; “Live Price” shows a value. |
| 4 | Use search (e.g. “reliance”) | Dropdown shows Indian symbols (.NS / .BO). |
| 5 | Click a search result | Chart and “Live Price” update for selected symbol; Portfolio Value and P&L cards update. |
| 6 | Click timeframe (1D, 1W, 1M, 6M, 1Y) | Chart redraws for that period; active button is highlighted. |
| 7 | Open “Indicators”, tick EMA/RSI/MACD/VWAP | Chart redraws with selected indicators. |
| 8 | Open notification bell / profile | Dropdowns open and close; no errors. |
| 9 | Sidebar: expand/collapse “Strategies”, “Trading”, etc. | Submenus expand and collapse (accordion). |

---

## If something fails

- **“Search unavailable” / “No Data”**  
  Ensure the Python backend is running on port 5001 and CORS is enabled.

- **Chart stays “Loading…”**  
  Check `/api/history?symbol=...` in Network tab; ensure backend returns `data` array.

- **Blank or wrong stats**  
  Check `/api/stats`, `/api/strategies`, `/api/alerts`, `/api/exposure` return JSON.

- **Duplicate “Live Price” / Portfolio Value**  
  Confirm `index.html` has only one `id="val-equity"` (stats card) and one `id="val-live-price"` (chart area); both are updated by `dashboard.js`.
