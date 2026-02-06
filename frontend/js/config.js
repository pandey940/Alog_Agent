tailwind.config = {
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                // Satfin Brand Colors from Logo
                "primary": "#9d8a4d",           // Gold/Olive from logo text
                "primary-light": "#b9a86a",     // Lighter gold
                "primary-dark": "#7a6b3c",      // Darker gold

                // Background Colors - Dark theme with gold accents
                "background-light": "#faf9f6",  // Warm off-white
                "background-dark": "#0f1318",   // Deep dark
                "panel-dark": "#161a20",        // Panel background
                "card-dark": "#1c2128",         // Card background
                "surface-dark": "#14171c",      // Surface dark
                "border-dark": "#2a3038",       // Border color

                // Candlestick Colors
                "bullish": "#1a7a4c",           // Green candle from logo
                "bearish": "#c92a2a",           // Red candle from logo
                "success": "#1a7a4c",           // Same as bullish
                "danger": "#c92a2a",            // Same as bearish

                // Accent Colors
                "accent-green": "#1a7a4c",
                "accent-red": "#c92a2a",
                "accent-gold": "#9d8a4d",

                // Risk Management Colors
                "risk-warn": "#e6a23c",
                "risk-danger": "#c92a2a",

                // Legacy compatibility
                "loss": "#c92a2a",
                "accent-orange": "#e6a23c"
            },
            fontFamily: {
                "display": ["Manrope", "sans-serif"],
                "mono": ["JetBrains Mono", "monospace"]
            },
            borderRadius: {
                "DEFAULT": "0.25rem",
                "lg": "0.5rem",
                "xl": "0.75rem",
                "2xl": "1rem",
                "full": "9999px"
            },
            boxShadow: {
                "glow-gold": "0 0 20px rgba(157, 138, 77, 0.3)",
                "glow-green": "0 0 20px rgba(26, 122, 76, 0.3)",
                "glow-red": "0 0 20px rgba(201, 42, 42, 0.3)"
            }
        },
    },
}

// App Configuration
window.APP_CONFIG = {
    ALPHA_VANTAGE_API_KEY: "9DYPCB792ENKLXZ3",
    PYTHON_API_URL: "http://127.0.0.1:5001/api",
    COMPANY_NAME: "SATFIN",
    TAGLINE: "Trading | Investing | Training",
    PLATFORM_NAME: "Algorithmic Trading Execution Platform"
};
