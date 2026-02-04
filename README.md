# Alog_Agent

# Free Stock API URL: https://www.alphavantage.co/
# Agent MCP: https://mcp.alphavantage.co/

## Project Setup & Running Instructions

### 1. Python Backend
**Location:** `python_backend/`  
**Port:** 5001

```bash
cd python_backend
# Optional: Create and activate virtual environment
# python -m venv venv
# source venv/bin/activate  # On Mac/Linux
# venv\Scripts\activate     # On Windows

pip install -r requirements.txt
python app.py
```

### 2. Frontend
**Location:** Root directory (`index.html`)

You can run the frontend using any simple HTTP server.

**Using Python:**
```bash
# Run from the project root
python -m http.server 8000
```
Then open [http://localhost:8000](http://localhost:8000) in your browser.

**Alternatively:**  
You can use the "Live Server" extension in VS Code.