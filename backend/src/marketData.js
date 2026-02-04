const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const BASE_URL = 'https://www.alphavantage.co/query';

/**
 * Fetch generic data from Alpha Vantage
 * @param {Object} params - Query parameters (e.g., function, symbol)
 */
async function fetchFromAlphaVantage(params) {
    try {
        const queryParams = new URLSearchParams({
            ...params,
            apikey: API_KEY
        });

        const url = `${BASE_URL}?${queryParams.toString()}`;
        console.log(`[MarketData] Fetching: ${params.function} for ${params.symbol || 'query'}`);

        const response = await axios.get(url);

        // precise error handling for AV
        if (response.data['Error Message']) {
            throw new Error(`Alpha Vantage Error: ${response.data['Error Message']}`);
        }
        if (response.data['Information']) {
            console.warn(`[MarketData] Rate Limit/Info: ${response.data['Information']}`);
        }

        return response.data;
    } catch (error) {
        console.error('[MarketData] Request Failed:', error.message);
        throw error;
    }
}

async function getStockQuote(symbol) {
    const data = await fetchFromAlphaVantage({
        function: 'GLOBAL_QUOTE',
        symbol: symbol
    });
    return data['Global Quote'];
}

async function searchSymbol(keywords) {
    const data = await fetchFromAlphaVantage({
        function: 'SYMBOL_SEARCH',
        keywords: keywords
    });
    return data.bestMatches;
}

async function getDailyTimeSeries(symbol) {
    return await fetchFromAlphaVantage({
        function: 'TIME_SERIES_DAILY',
        symbol: symbol
    });
}

async function getRSI(symbol, interval = 'daily', time_period = 14, series_type = 'close') {
    return await fetchFromAlphaVantage({
        function: 'RSI',
        symbol: symbol,
        interval: interval,
        time_period: time_period,
        series_type: series_type
    });
}

module.exports = {
    getStockQuote,
    searchSymbol,
    getDailyTimeSeries,
    getRSI
};
