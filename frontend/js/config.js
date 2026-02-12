tailwind.config = {
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                // Algo Agent Brand Colors - Bright Cyan/Teal
                "primary": "#00FFE5",           // Bright neon cyan
                "primary-light": "#5CFFE8",     // Lighter vibrant cyan
                "primary-dark": "#00CDB5",      // Slightly darker teal

                // Background Colors - Brighter dark tech theme
                "background-light": "#f0f4f8",  // Cool light gray
                "background-dark": "#111827",   // Lighter dark blue
                "panel-dark": "#1a2332",        // Brighter panel
                "card-dark": "#1e293b",         // Brighter card
                "surface-dark": "#162031",      // Brighter surface
                "border-dark": "#2d3f55",       // Visible border

                // Candlestick Colors
                "bullish": "#00FF88",           // Bright green
                "bearish": "#FF6B6B",           // Bright red
                "success": "#00FF88",           // Same as bullish
                "danger": "#FF6B6B",            // Same as bearish

                // Accent Colors
                "accent-green": "#00FF88",
                "accent-red": "#FF6B6B",
                "accent-cyan": "#00FFE5",

                // Risk Management Colors
                "risk-warn": "#FFD166",
                "risk-danger": "#FF6B6B",

                // Legacy compatibility
                "loss": "#FF6B6B",
                "accent-orange": "#FFD166"
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
                "glow-cyan": "0 0 20px rgba(0, 255, 229, 0.35)",
                "glow-green": "0 0 20px rgba(0, 255, 136, 0.35)",
                "glow-red": "0 0 20px rgba(255, 107, 107, 0.35)"
            }
        },
    },
}

// App Configuration
// NOTE: API keys must never be hardcoded here. Use backend endpoints instead.
window.APP_CONFIG = {
    // DEVELOPMENT (Localhost):
    PYTHON_API_URL: "http://127.0.0.1:5001/api",

    // API Auth Token — must match API_SECRET_KEY in .env
    API_TOKEN: "change-me-to-a-strong-random-secret",

    // PRODUCTION (GCP Backend):
    // Replace the URL below with your GCP External IP (hurry, verify this on GCP!)
    // PYTHON_API_URL: "http://<YOUR_GCP_EXTERNAL_IP>:5001/api",
    COMPANY_NAME: "Algo Agent",
    TAGLINE: "Algorithmic Trading",
    PLATFORM_NAME: "Algorithmic Trading Execution Platform"
};
