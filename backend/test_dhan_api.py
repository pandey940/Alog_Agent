#!/usr/bin/env python3
"""
Dhan API Connection Test Script
Tests the API connectivity with your Dhan trading account.
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

DHAN_CLIENT_ID = os.getenv('DHAN_CLIENT_ID')
DHAN_ACCESS_TOKEN = os.getenv('DHAN_ACCESS_TOKEN')

def test_connection():
    """Test Dhan API connection and fetch account details."""
    print("=" * 60)
    print("🔐 DHAN API CONNECTION TEST")
    print("=" * 60)
    
    # Check credentials
    if not DHAN_CLIENT_ID or not DHAN_ACCESS_TOKEN:
        print("❌ ERROR: Credentials not found!")
        print("   Make sure .env file exists with DHAN_CLIENT_ID and DHAN_ACCESS_TOKEN")
        return False
    
    print(f"✓ Client ID: {DHAN_CLIENT_ID}")
    print("✓ Access Token: [redacted]")
    print()
    
    try:
        from dhanhq import dhanhq
        
        # Initialize client
        print("🔄 Initializing DhanHQ client...")
        dhan = dhanhq(DHAN_CLIENT_ID, DHAN_ACCESS_TOKEN)
        print("✓ DhanHQ client initialized successfully!")
        print()
        
        # Test 1: Get Fund Limits (Account Balance)
        print("📊 Fetching Fund Limits...")
        try:
            fund_limits = dhan.get_fund_limits()
            print(f"   Response: {fund_limits}")
            if fund_limits.get('status') == 'success':
                print("   ✓ Fund limits retrieved successfully!")
                data = fund_limits.get('data', {})
                print(f"   💰 Available Balance: ₹{data.get('availabelBalance', 'N/A')}")
                print(f"   💼 Utilized Margin: ₹{data.get('utilizedAmount', 'N/A')}")
            else:
                print(f"   ⚠️ Status: {fund_limits.get('status', 'unknown')}")
                print(f"   Details: {fund_limits}")
        except Exception as e:
            print(f"   ❌ Error getting fund limits: {e}")
        print()
        
        # Test 2: Get Holdings
        print("📈 Fetching Holdings...")
        try:
            holdings = dhan.get_holdings()
            print(f"   Response: {holdings}")
            if holdings.get('status') == 'success':
                holdings_data = holdings.get('data', [])
                print(f"   ✓ Holdings retrieved: {len(holdings_data)} positions")
                for holding in holdings_data[:5]:  # Show first 5
                    symbol = holding.get('tradingSymbol', 'N/A')
                    qty = holding.get('totalQty', 0)
                    print(f"      - {symbol}: {qty} shares")
            else:
                print(f"   ⚠️ Status: {holdings.get('status', 'unknown')}")
        except Exception as e:
            print(f"   ❌ Error getting holdings: {e}")
        print()
        
        # Test 3: Get Positions (if any open)
        print("📋 Fetching Open Positions...")
        try:
            positions = dhan.get_positions()
            print(f"   Response: {positions}")
            if positions.get('status') == 'success':
                pos_data = positions.get('data', [])
                print(f"   ✓ Open positions: {len(pos_data)}")
            else:
                print(f"   ⚠️ Status: {positions.get('status', 'unknown')}")
        except Exception as e:
            print(f"   ❌ Error getting positions: {e}")
        
        print()
        print("=" * 60)
        print("✅ API CONNECTION TEST COMPLETED")
        print("=" * 60)
        return True
        
    except ImportError as e:
        print(f"❌ Import Error: {e}")
        print("   Run: pip install dhanhq")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = test_connection()
    sys.exit(0 if success else 1)
