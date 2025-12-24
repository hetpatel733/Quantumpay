/**
 * Blockchain Transfer Verification Utility
 * Uses Alchemy API to verify incoming cryptocurrency transfers
 */

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || 'F1VJYt_AJfuFGhOqy2QmWTYr0FV1nvl0';

// Network configurations with Alchemy endpoints
const NETWORK_CONFIG = {
    'Polygon': {
        endpoint: `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
        nativeAsset: 'MATIC',
        decimals: 18,
        explorerUrl: 'https://polygonscan.com/tx/'
    },
    'Ethereum': {
        endpoint: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
        nativeAsset: 'ETH',
        decimals: 18,
        explorerUrl: 'https://etherscan.io/tx/'
    },
    'BSC': {
        endpoint: `https://bnb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
        nativeAsset: 'BNB',
        decimals: 18,
        explorerUrl: 'https://bscscan.com/tx/'
    }
};

// Token contract addresses for USDT/USDC on different networks
const TOKEN_CONTRACTS = {
    'USDT_Polygon': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    'USDC_Polygon': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    'USDT_Ethereum': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    'USDC_Ethereum': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    'USDT_BSC': '0x55d398326f99059fF775485246999027B3197955',
    'USDC_BSC': '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'
};

/**
 * Fetch asset transfers from Alchemy API
 * @param {string} network - Network name (Polygon, Ethereum, BSC)
 * @param {string} toAddress - Recipient wallet address
 * @param {string} category - Transfer category (external, erc20, etc.)
 * @param {string} fromBlock - Starting block (hex or 'latest')
 * @returns {Promise<Array>} - Array of transfer objects
 */
async function fetchAssetTransfers(network, toAddress, category = 'external', fromBlock = '0x0') {
    const config = NETWORK_CONFIG[network];
    
    if (!config) {
        console.error(`❌ Unsupported network: ${network}`);
        return [];
    }

    try {
        //console.log(`🔍 Fetching ${category} transfers for ${toAddress} on ${network}...`);

        const requestBody = {
            jsonrpc: '2.0',
            id: 1,
            method: 'alchemy_getAssetTransfers',
            params: [{
                fromBlock: fromBlock,
                toBlock: 'latest',
                toAddress: toAddress.toLowerCase(),
                excludeZeroValue: true,
                withMetadata: true,
                category: [category],
                order: 'desc',
                maxCount: '0x64' // Last 100 transfers
            }]
        };

        const response = await fetch(config.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`Alchemy API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(`Alchemy RPC error: ${data.error.message}`);
        }

        const transfers = data.result?.transfers || [];
        //console.log(`✅ Found ${transfers.length} ${category} transfers on ${network}`);
        
        return transfers;
    } catch (error) {
        console.error(`❌ Error fetching transfers from ${network}:`, error.message);
        return [];
    }
}

/**
 * Get all incoming transfers (native + ERC20 tokens)
 * @param {string} network - Network name
 * @param {string} toAddress - Recipient wallet address
 * @returns {Promise<Array>} - Combined array of all transfers
 */
async function getAllIncomingTransfers(network, toAddress) {
    const [externalTransfers, erc20Transfers] = await Promise.all([
        fetchAssetTransfers(network, toAddress, 'external'),
        fetchAssetTransfers(network, toAddress, 'erc20')
    ]);

    // Combine and sort by timestamp (most recent first)
    const allTransfers = [...externalTransfers, ...erc20Transfers];
    
    allTransfers.sort((a, b) => {
        const timeA = new Date(a.metadata?.blockTimestamp || 0).getTime();
        const timeB = new Date(b.metadata?.blockTimestamp || 0).getTime();
        return timeB - timeA;
    });

    return allTransfers;
}

/**
 * Find a matching transfer for a payment
 * @param {string} network - Network name (Polygon, Ethereum, BSC)
 * @param {string} toAddress - Recipient wallet address
 * @param {number} expectedAmount - Expected amount in crypto
 * @param {string} cryptoType - Cryptocurrency type (ETH, MATIC, USDT, etc.)
 * @param {Date} paymentCreatedAt - When the payment was created
 * @param {number} tolerancePercent - Amount tolerance percentage (default 1%)
 * @returns {Promise<Object|null>} - Matching transfer or null
 */
async function findMatchingTransfer(
    network, 
    toAddress, 
    expectedAmount, 
    cryptoType, 
    paymentCreatedAt, 
    tolerancePercent = 1
) {
    //console.log(`🔎 Searching for transfer: ${expectedAmount} ${cryptoType} to ${toAddress} on ${network}`);

    const transfers = await getAllIncomingTransfers(network, toAddress);

    if (transfers.length === 0) {
        //console.log('❌ No transfers found');
        return null;
    }

    // Calculate tolerance bounds
    const tolerance = expectedAmount * (tolerancePercent / 100);
    const minAmount = expectedAmount - tolerance;
    const maxAmount = expectedAmount + tolerance;

    // Filter transfers that match criteria
    const paymentTime = new Date(paymentCreatedAt).getTime();

    for (const transfer of transfers) {
        const transferTime = new Date(transfer.metadata?.blockTimestamp || 0).getTime();
        
        // Only consider transfers after payment was created
        if (transferTime < paymentTime) {
            continue;
        }

        // Check if asset matches
        const transferAsset = transfer.asset?.toUpperCase() || '';
        const expectedAsset = cryptoType.toUpperCase();
        
        // Handle asset name variations
        const assetMatches = 
            transferAsset === expectedAsset ||
            (expectedAsset === 'POL' && transferAsset === 'MATIC') ||
            (expectedAsset === 'MATIC' && transferAsset === 'POL');

        if (!assetMatches) {
            continue;
        }

        // Check amount within tolerance
        const transferValue = parseFloat(transfer.value) || 0;
        
        if (transferValue >= minAmount && transferValue <= maxAmount) {
            //console.log(`✅ Found matching transfer!`);
            //console.log(`   Hash: ${transfer.hash}`);
            //console.log(`   Amount: ${transferValue} ${transferAsset}`);
            //console.log(`   Expected: ${expectedAmount} ${cryptoType}`);
            //console.log(`   Time: ${transfer.metadata?.blockTimestamp}`);
            
            return {
                hash: transfer.hash,
                from: transfer.from,
                to: transfer.to,
                value: transferValue,
                asset: transferAsset,
                blockNumber: transfer.blockNum,
                timestamp: transfer.metadata?.blockTimestamp,
                network: network,
                explorerUrl: `${NETWORK_CONFIG[network].explorerUrl}${transfer.hash}`
            };
        }
    }

    //console.log(`❌ No matching transfer found within tolerance (${tolerancePercent}%)`);
    return null;
}

/**
 * Verify a specific transaction hash
 * @param {string} network - Network name
 * @param {string} txHash - Transaction hash to verify
 * @param {string} expectedTo - Expected recipient address
 * @param {number} expectedAmount - Expected amount
 * @param {string} cryptoType - Cryptocurrency type
 * @returns {Promise<Object>} - Verification result
 */
async function verifyTransaction(network, txHash, expectedTo, expectedAmount, cryptoType) {
    const config = NETWORK_CONFIG[network];
    
    if (!config) {
        return { verified: false, error: `Unsupported network: ${network}` };
    }

    try {
        //console.log(`🔍 Verifying transaction ${txHash} on ${network}...`);

        const requestBody = {
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_getTransactionReceipt',
            params: [txHash]
        };

        const response = await fetch(config.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (!data.result) {
            return { verified: false, error: 'Transaction not found or pending' };
        }

        const receipt = data.result;

        // Check if transaction was successful
        if (receipt.status !== '0x1') {
            return { verified: false, error: 'Transaction failed on blockchain' };
        }

        // Get transaction details
        const txDetailsBody = {
            jsonrpc: '2.0',
            id: 2,
            method: 'eth_getTransactionByHash',
            params: [txHash]
        };

        const txResponse = await fetch(config.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(txDetailsBody)
        });

        const txData = await txResponse.json();
        const tx = txData.result;

        if (!tx) {
            return { verified: false, error: 'Could not fetch transaction details' };
        }

        // Verify recipient
        if (tx.to?.toLowerCase() !== expectedTo.toLowerCase()) {
            return { 
                verified: false, 
                error: `Recipient mismatch. Expected: ${expectedTo}, Got: ${tx.to}` 
            };
        }

        // Verify amount (for native transfers)
        const actualValue = parseInt(tx.value, 16) / Math.pow(10, config.decimals);
        const tolerance = expectedAmount * 0.01; // 1% tolerance

        if (Math.abs(actualValue - expectedAmount) > tolerance) {
            return { 
                verified: false, 
                error: `Amount mismatch. Expected: ${expectedAmount}, Got: ${actualValue}` 
            };
        }

        //console.log(`✅ Transaction verified successfully!`);

        return {
            verified: true,
            hash: txHash,
            from: tx.from,
            to: tx.to,
            value: actualValue,
            blockNumber: parseInt(receipt.blockNumber, 16),
            gasUsed: parseInt(receipt.gasUsed, 16),
            network: network,
            explorerUrl: `${config.explorerUrl}${txHash}`
        };
    } catch (error) {
        console.error(`❌ Transaction verification error:`, error.message);
        return { verified: false, error: error.message };
    }
}

/**
 * Check recent transfers and find payment matches
 * This is useful for background payment verification jobs
 * @param {Array} pendingPayments - Array of pending payment objects
 * @returns {Promise<Array>} - Array of matched payments with transfer details
 */
async function checkPendingPayments(pendingPayments) {
    const matches = [];

    for (const payment of pendingPayments) {
        const { network, walletAddress, amountCrypto, cryptoType, createdAt, payId } = payment;

        // Map network names
        let alchemyNetwork = network;
        if (network === 'POLYGON' || network === 'Polygon') alchemyNetwork = 'Polygon';
        if (network === 'ETHEREUM' || network === 'Ethereum' || network === 'ETH') alchemyNetwork = 'Ethereum';
        if (network === 'BSC' || network === 'BNB') alchemyNetwork = 'BSC';

        // Skip unsupported networks
        if (!NETWORK_CONFIG[alchemyNetwork]) {
            //console.log(`⏭️ Skipping payment ${payId} - unsupported network: ${network}`);
            continue;
        }

        const match = await findMatchingTransfer(
            alchemyNetwork,
            walletAddress,
            amountCrypto,
            cryptoType,
            createdAt,
            2 // 2% tolerance for amount matching
        );

        if (match) {
            matches.push({
                payId,
                transfer: match
            });
        }
    }

    //console.log(`📊 Found ${matches.length} matching transfers out of ${pendingPayments.length} pending payments`);
    return matches;
}

/**
 * Get supported networks list
 * @returns {Array<string>} - Array of supported network names
 */
function getSupportedNetworks() {
    return Object.keys(NETWORK_CONFIG);
}

/**
 * Get network configuration
 * @param {string} network - Network name
 * @returns {Object|null} - Network configuration or null
 */
function getNetworkConfig(network) {
    return NETWORK_CONFIG[network] || null;
}

module.exports = {
    fetchAssetTransfers,
    getAllIncomingTransfers,
    findMatchingTransfer,
    verifyTransaction,
    checkPendingPayments,
    getSupportedNetworks,
    getNetworkConfig,
    NETWORK_CONFIG,
    TOKEN_CONTRACTS
};
