/**
 * Currency Converter Utility
 * Uses Binance API to get real-time cryptocurrency prices
 */

// Cache for exchange rates (5 minute TTL)
const rateCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Binance trading pairs mapping (all paired with USDT for USD conversion)
const BINANCE_SYMBOLS = {
    'BTC': 'BTCUSDT',
    'ETH': 'ETHUSDT',
    'BNB': 'BNBUSDT',
    'SOL': 'SOLUSDT',
    'POL': 'POLUSDT',
    'MATIC': 'MATICUSDT',
    'XRP': 'XRPUSDT',
    'ADA': 'ADAUSDT',
    'DOGE': 'DOGEUSDT',
    'DOT': 'DOTUSDT',
    'AVAX': 'AVAXUSDT',
    'TRX': 'TRXUSDT',
    'LINK': 'LINKUSDT',
    'LTC': 'LTCUSDT'
};

// Stablecoins (1:1 with USD)
const STABLECOINS = ['USDT', 'USDC', 'BUSD', 'DAI', 'TUSD', 'PYUSD'];

// Fallback rates (updated periodically as last resort)
const FALLBACK_RATES = {
    'BTC': 67000,
    'ETH': 3500,
    'BNB': 600,
    'SOL': 150,
    'POL': 0.5,
    'MATIC': 0.5,
    'XRP': 0.5,
    'ADA': 0.4,
    'DOGE': 0.1,
    'DOT': 7,
    'AVAX': 35,
    'TRX': 0.12,
    'LINK': 14,
    'LTC': 85
};

/**
 * Fetch price from Binance API
 * @param {string} symbol - Binance trading pair symbol (e.g., 'BTCUSDT')
 * @returns {Promise<number|null>}
 */
async function fetchBinancePrice(symbol) {
    try {
        const url = `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`;
        //console.log(`🔄 Fetching price from Binance: ${symbol}`);

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Binance API error: ${response.status}`);
        }

        const data = await response.json();
        const price = parseFloat(data.price);

        if (isNaN(price) || price <= 0) {
            throw new Error(`Invalid price received: ${data.price}`);
        }

        return price;
    } catch (error) {
        console.error(`❌ Binance API error for ${symbol}:`, error.message);
        return null;
    }
}

/**
 * Get exchange rate for a cryptocurrency in USD
 * @param {string} cryptoType - Cryptocurrency symbol (e.g., 'BTC', 'ETH')
 * @returns {Promise<number>} - Price in USD
 */
async function getExchangeRate(cryptoType) {
    const symbol = cryptoType.toUpperCase();

    // Stablecoins are 1:1 with USD
    if (STABLECOINS.includes(symbol)) {
        //console.log(`💰 ${symbol} is stablecoin: $1.00`);
        return 1;
    }

    // Check cache first
    const cached = rateCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        //console.log(`💰 Using cached rate for ${symbol}: $${cached.rate.toFixed(2)}`);
        return cached.rate;
    }

    // Fetch from Binance
    const binanceSymbol = BINANCE_SYMBOLS[symbol];
    if (binanceSymbol) {
        const price = await fetchBinancePrice(binanceSymbol);
        if (price) {
            // Cache the rate
            rateCache.set(symbol, { rate: price, timestamp: Date.now() });
            //console.log(`✅ ${symbol} rate from Binance: $${price.toFixed(2)}`);
            return price;
        }
    }

    // Use fallback rate
    const fallbackRate = FALLBACK_RATES[symbol] || 1;
    console.warn(`⚠️ Using fallback rate for ${symbol}: $${fallbackRate}`);
    return fallbackRate;
}

/**
 * Get multiple exchange rates at once
 * @param {string[]} cryptoTypes - Array of cryptocurrency symbols
 * @returns {Promise<Object>} - Object with symbol as key and rate as value
 */
async function getMultipleRates(cryptoTypes) {
    const rates = {};

    await Promise.all(
        cryptoTypes.map(async (crypto) => {
            rates[crypto.toUpperCase()] = await getExchangeRate(crypto);
        })
    );

    return rates;
}

/**
 * Convert USD to crypto amount
 * @param {number} usdAmount - Amount in USD
 * @param {string} cryptoType - Target cryptocurrency
 * @returns {Promise<{amount: number, rate: number, symbol: string}>}
 */
async function usdToCrypto(usdAmount, cryptoType) {
    const rate = await getExchangeRate(cryptoType);
    const cryptoAmount = usdAmount / rate;

    return {
        amount: parseFloat(cryptoAmount.toFixed(8)),
        rate,
        symbol: cryptoType.toUpperCase()
    };
}

/**
 * Convert crypto to USD amount
 * @param {number} cryptoAmount - Amount in cryptocurrency
 * @param {string} cryptoType - Source cryptocurrency
 * @returns {Promise<{amount: number, rate: number, symbol: string}>}
 */
async function cryptoToUsd(cryptoAmount, cryptoType) {
    const rate = await getExchangeRate(cryptoType);
    const usdAmount = cryptoAmount * rate;

    return {
        amount: parseFloat(usdAmount.toFixed(2)),
        rate,
        symbol: 'USD'
    };
}

/**
 * Clear the rate cache
 */
function clearCache() {
    rateCache.clear();
    //console.log('🧹 Exchange rate cache cleared');
}

/**
 * Get cache statistics
 * @returns {Object}
 */
function getCacheStats() {
    const stats = {
        size: rateCache.size,
        entries: []
    };

    rateCache.forEach((value, key) => {
        stats.entries.push({
            symbol: key,
            rate: value.rate,
            age: Math.round((Date.now() - value.timestamp) / 1000) + 's'
        });
    });

    return stats;
}

module.exports = {
    getExchangeRate,
    getMultipleRates,
    usdToCrypto,
    cryptoToUsd,
    clearCache,
    getCacheStats,
    STABLECOINS,
    BINANCE_SYMBOLS
};
