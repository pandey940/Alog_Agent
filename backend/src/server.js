const express = require('express');
const cors = require('cors');
require('dotenv').config();

const marketData = require('./marketData');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
    res.json({ status: 'active', service: 'Algo Agent Backend' });
});

// API: Get Stock Quote
app.get('/api/quote/:symbol', async (req, res) => {
    try {
        const symbol = req.params.symbol;
        const data = await marketData.getStockQuote(symbol);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Search Symbol
app.get('/api/search/:query', async (req, res) => {
    try {
        const query = req.params.query;
        const data = await marketData.searchSymbol(query);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Get RSI (Technical Indicator)
app.get('/api/indicator/rsi/:symbol', async (req, res) => {
    try {
        const symbol = req.params.symbol;
        const data = await marketData.getRSI(symbol);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Agent Status Endpoint (Placeholder for Agent Logic)
app.get('/api/agent/status', (req, res) => {
    res.json({
        agentId: 'ALGO-V1',
        status: 'IDLE',
        activeStrategies: ['RSI-Divergence'],
        lastHeartbeat: new Date().toISOString()
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: Node.js ${process.version}`);

    // Start the AI Agent
    const agent = require('./agent');
    agent.start();
});
