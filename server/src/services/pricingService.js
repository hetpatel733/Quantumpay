// Cryptocurrency pricing service using Binance API
const crypto = require('crypto');

// Supported cryptocurrency mappings to Binance symbols
const BINANCE_SYMBOLS = {
    'BTC': 'BTCUSDT',
    'ETH': 'ETHUSDT',
    'MATIC': 'MATICUSDT',
    'SOL': 'SOLUSDT',
    'USDT': null, // Stablecoin - always 1.0
    'USDC': 'USDCUSDT'
};

// Fallback prices in case Binance API is unavailable
const FALLBACK_PRICES = {
    'BTC': 42000.00,
    'ETH': 2500.00,
    'MATIC': 0.85,
    'SOL': 65.00,
    'USDT': 1.0,
    'USDC': 1.0
};

// Cache configuration
const PRICE_CACHE_DURATION = 60000; // 1 minute
let priceCache = new Map();
let lastCacheUpdate = 0;

/**
 * Fetch cryptocurrency price from Binance API
 * @param {string} cryptoType - Cryptocurrency symbol (BTC, ETH, etc.)
 * @returns {Promise<number>} Price in USD
 */
async function fetchCryptoPriceFromBinance(cryptoType) {
    const symbol = BINANCE_SYMBOLS[cryptoType];
    
    // Handle stablecoins
    if (!symbol) {
        if (cryptoType === 'USDT' || cryptoType === 'USDC') {
            return 1.0;
        }
        throw new Error(`Unsupported cryptocurrency: ${cryptoType}`);
    }

    try {
        console.log(`🔄 Fetching ${cryptoType} price from Binance (${symbol})...`);
        
        const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`, {
            timeout: 5000 // 5 second timeout
        });

        if (!response.ok) {
            throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const price = parseFloat(data.price);

        if (isNaN(price) || price <= 0) {
            throw new Error(`Invalid price data: ${data.price}`);
        }

        console.log(`✅ ${cryptoType} price from Binance: $${price.toFixed(6)}`);
        return price;

    } catch (error) {
        console.error(`❌ Error fetching ${cryptoType} from Binance:`, error.message);
        throw error;
    }
}

/**
 * Get cryptocurrency price with fallback
 * @param {string} cryptoType - Cryptocurrency symbol
 * @returns {Promise<Object>} Price data with source information
 */
async function getCryptocurrencyPrice(cryptoType) {
    try {
        const price = await fetchCryptoPriceFromBinance(cryptoType);
        return {
            price,
            source: 'binance',
            timestamp: new Date(),
            symbol: cryptoType
        };
    } catch (error) {
        console.warn(`⚠️ Using fallback price for ${cryptoType}:`, error.message);
        const fallbackPrice = FALLBACK_PRICES[cryptoType];
        
        if (!fallbackPrice) {
            throw new Error(`No fallback price available for ${cryptoType}`);
        }

        return {
            price: fallbackPrice,
            source: 'fallback',
            timestamp: new Date(),
            symbol: cryptoType,
            fallbackReason: error.message
        };
    }
}

/**
 * Get multiple cryptocurrency prices with caching
 * @param {string[]} cryptoTypes - Array of cryptocurrency symbols
 * @returns {Promise<Object>} Object with prices keyed by symbol
 */
async function getMultipleCryptoPrices(cryptoTypes = ['BTC', 'ETH', 'USDT', 'USDC', 'MATIC', 'SOL']) {
    const now = Date.now();
    
    // Check if cache is still valid
    if (priceCache.size > 0 && (now - lastCacheUpdate) < PRICE_CACHE_DURATION) {
        console.log('📊 Using cached cryptocurrency prices');
        const cachedPrices = {};
        cryptoTypes.forEach(type => {
            if (priceCache.has(type)) {
                cachedPrices[type] = priceCache.get(type);
            }
        });
        
        // Return cached prices if all requested types are available
        if (Object.keys(cachedPrices).length === cryptoTypes.length) {
            return cachedPrices;
        }
    }

    console.log('🔄 Fetching fresh cryptocurrency prices...');
    
    // Fetch prices for all requested cryptocurrencies
    const pricePromises = cryptoTypes.map(async (cryptoType) => {
        try {
            const priceData = await getCryptocurrencyPrice(cryptoType);
            return { cryptoType, priceData };
        } catch (error) {
            console.error(`❌ Failed to get price for ${cryptoType}:`, error.message);
            return { 
                cryptoType, 
                priceData: { 
                    price: FALLBACK_PRICES[cryptoType] || 1.0, 
                    source: 'fallback', 
                    timestamp: new Date(),
                    symbol: cryptoType,
                    error: error.message
                } 
            };
        }
    });

    const results = await Promise.all(pricePromises);
    
    // Build price object and update cache
    const prices = {};
    results.forEach(({ cryptoType, priceData }) => {
        prices[cryptoType] = priceData.price;
        priceCache.set(cryptoType, priceData.price);
    });

    lastCacheUpdate = now;
    
    console.log('💰 Updated cryptocurrency prices:', prices);
    return prices;
}

/**
 * Calculate crypto amount from USD amount
 * @param {number} usdAmount - Amount in USD
 * @param {string} cryptoType - Target cryptocurrency
 * @returns {Promise<Object>} Calculation result with metadata
 */
async function calculateCryptoAmount(usdAmount, cryptoType) {
    try {
        const priceData = await getCryptocurrencyPrice(cryptoType);
        const cryptoAmount = usdAmount / priceData.price;

        return {
            usdAmount,
            cryptoAmount,
            cryptoType,
            exchangeRate: priceData.price,
            source: priceData.source,
            timestamp: priceData.timestamp,
            calculation: `$${usdAmount} ÷ $${priceData.price} = ${cryptoAmount.toFixed(8)} ${cryptoType}`
        };
    } catch (error) {
        console.error('❌ Error calculating crypto amount:', error);
        throw error;
    }
}

/**
 * Get price trend for a cryptocurrency (simple implementation)
 * @param {string} cryptoType - Cryptocurrency symbol
 * @returns {Promise<Object>} Price trend data
 */
async function getPriceTrend(cryptoType) {
    try {
        // For now, get 24hr ticker statistics from Binance
        const symbol = BINANCE_SYMBOLS[cryptoType];
        if (!symbol) {
            return { trend: 'stable', change: 0, symbol: cryptoType };
        }

        const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
        
        if (!response.ok) {
            throw new Error(`Binance 24hr ticker error: ${response.status}`);
        }

        const data = await response.json();
        const priceChange = parseFloat(data.priceChangePercent);

        return {
            symbol: cryptoType,
            currentPrice: parseFloat(data.lastPrice),
            change24h: priceChange,
            trend: priceChange > 0 ? 'up' : priceChange < 0 ? 'down' : 'stable',
            volume24h: parseFloat(data.volume),
            high24h: parseFloat(data.highPrice),
            low24h: parseFloat(data.lowPrice)
        };
    } catch (error) {
        console.error(`❌ Error getting price trend for ${cryptoType}:`, error.message);
        return { 
            symbol: cryptoType, 
            trend: 'unknown', 
            change24h: 0,
            error: error.message 
        };
    }
}

/**
 * Clear price cache (useful for testing or manual refresh)
 */
function clearPriceCache() {
    priceCache.clear();
    lastCacheUpdate = 0;
    console.log('🧹 Price cache cleared');
}

/**
 * Get cache status and statistics
 */
function getCacheStatus() {
    return {
        cacheSize: priceCache.size,
        lastUpdate: new Date(lastCacheUpdate),
        cacheAge: Date.now() - lastCacheUpdate,
        isValid: (Date.now() - lastCacheUpdate) < PRICE_CACHE_DURATION,
        cachedSymbols: Array.from(priceCache.keys())
    };
}

module.exports = {
    fetchCryptoPriceFromBinance,
    getCryptocurrencyPrice,
    getMultipleCryptoPrices,
    calculateCryptoAmount,
    getPriceTrend,
    clearPriceCache,
    getCacheStatus,
    BINANCE_SYMBOLS,
    FALLBACK_PRICES
};
