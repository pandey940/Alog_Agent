const marketData = require('./marketData');

class AlgoAgent {
    constructor() {
        this.isRunning = false;
        this.watchlist = ['RELIANCE.BSE', 'TATASTEEL.BSE', 'INFY.BSE'];
        this.intervalId = null;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log('[Agent] Algo Agent Started.');

        // Run immediately then schedule
        this.runCycle();
        this.intervalId = setInterval(() => this.runCycle(), 60000); // Every 1 minute
    }

    stop() {
        this.isRunning = false;
        if (this.intervalId) clearInterval(this.intervalId);
        console.log('[Agent] Algo Agent Stopped.');
    }

    async runCycle() {
        if (!this.isRunning) return;

        console.log(`[Agent] Starting Analysis Cycle: ${new Date().toISOString()}`);

        for (const symbol of this.watchlist) {
            try {
                // 1. Fetch Data
                const quote = await marketData.getStockQuote(symbol);
                const price = quote && quote['05. price'] != null ? parseFloat(quote['05. price']) : NaN;
                if (Number.isNaN(price)) {
                    console.warn(`[Agent] No price for ${symbol}, skipping`);
                    continue;
                }

                // 2. Simple Logic (Example)
                console.log(`[Agent] Analyzing ${symbol}: Current Price ₹${price}`);

                // Placeholder for Strategy
                if (price < 2400) {
                    console.log(`[Agent] SIGNAL: BUY ${symbol} (Price < 2400)`);
                    // this.executor.executeTrade(symbol, 'BUY');
                }
            } catch (error) {
                console.error(`[Agent] Error analyzing ${symbol}:`, error.message);
            }
        }
    }
}

module.exports = new AlgoAgent();
