import sys
print("Python version:", sys.version)
try:
    import flask
    print("Flask imported successfully")
except ImportError as e:
    print("Flask import failed:", e)

try:
    import dhanhq
    print("DhanHQ imported successfully")
except ImportError as e:
    print("DhanHQ import failed:", e)

try:
    from dotenv import load_dotenv
    print("python-dotenv imported successfully")
except ImportError as e:
    print("python-dotenv import failed:", e)
