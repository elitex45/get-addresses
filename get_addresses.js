const { ethers } = require('ethers');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const readline = require('readline');

// Progress tracking
const networkProgress = {};

function updateProgressDisplay() {
    readline.cursorTo(process.stdout, 0, 0);
    readline.clearScreenDown(process.stdout);
    
    console.log('Network Progress:');
    Object.keys(networkProgress).sort().forEach(network => {
        const progress = networkProgress[network];
        const percentage = progress.percentage.toFixed(2);
        const addressCount = progress.addresses || 0;
        console.log(`${network.padEnd(10)}: ${percentage}% - ${addressCount} unique addresses`);
    });
}

// update when the contract is deployed for that specific network, this example is for aave
const DEPLOYMENT_BLOCKS = {
    ethereum: 16291127, 
    polygon: 25826028,
    arbitrum: 7742429,
    base: 2357134,
    bsc: 33571625,
    optimism: 4365693,
    fantom: 33142113,
    gnosis: 30293057,
    scroll: 2618764,
    avalanche: 11970506,
};
const YOUR_API = ""
// rpc for networks, this used Alchemy RPC which gives us more than enough queries to make
// some rpc providers might rate limiting make sure you don't any rate limits because we will running this async 
// for speed
const NETWORKS = {
    ethereum: `https://eth-mainnet.g.alchemy.com/v2/{YOUR_API}`,
    polygon: `https://polygon-mainnet.g.alchemy.com/v2/{YOUR_API}`,
    arbitrum: `https://arb-mainnet.g.alchemy.com/v2/{YOUR_API}`,
    base: `https://base-mainnet.g.alchemy.com/v2/{YOUR_API}`,
    bsc: `https://bnb-mainnet.g.alchemy.com/v2/{YOUR_API}`,
    optimism: `https://opt-mainnet.g.alchemy.com/v2/{YOUR_API}`,
    fantom: `https://fantom-mainnet.g.alchemy.com/v2/{YOUR_API}`,
    gnosis: `https://gnosis-mainnet.g.alchemy.com/v2/{YOUR_API}`,
    scroll: `https://scroll-mainnet.g.alchemy.com/v2/{YOUR_API}`,
    avalanche: `https://avax-mainnet.g.alchemy.com/v2/{YOUR_API}`,
};
// contract address that you are trying to query in all chains
const POOL_ADDRESSES = {
    ethereum: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2",
    polygon: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
    arbitrum: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
    base: "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
    bsc: "0x6807dc923806fE8Fd134338EABCA509979a7e0cB",
    optimism: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
    fantom: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
    gnosis: "0xb50201558B00496A145fE76f7424749556E326D8",
    scroll: "0x11fCfe756c05AD438e312a7fd934381537D3cFfe",
    avalanche: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
};

// event that you are trying get logs of, this uses deposit (supply) event by aave
const SUPPLY_TOPIC = ethers.utils.id("Supply(address,address,address,uint256,uint16)");
const BATCH_SIZE = 2000;
const SAVE_INTERVAL = 10000;

// this is to show current progress of getting those addresses across all chains
function updateProgressDisplay() {
    readline.cursorTo(process.stdout, 0, 0);
    readline.clearScreenDown(process.stdout);
    
    console.log('Network Progress:');
    Object.keys(networkProgress).forEach(network => {
        const progress = networkProgress[network];
        const percentage = progress.percentage.toFixed(2);
        const addressCount = progress.addresses || 0;
        const status = progress.error ? 'ERROR' : `${percentage}%`;
        console.log(`${network.padEnd(10)}: ${status.padEnd(8)} - ${addressCount} addresses`);
    });
}

// this handles all the cases which as if the json data is too big etc
async function writeJsonSafely(filename, data, maxRetries = 3) {
    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            const tempFile = `${filename}.tmp`;
            await fsPromises.writeFile(tempFile, JSON.stringify(data, null, 2));
            await fsPromises.rename(tempFile, filename);
            return;
        } catch (error) {
            attempt++;
            
            try {
                await fsPromises.unlink(`${filename}.tmp`).catch(() => {});
            } catch {}

            if (attempt === maxRetries) {
                throw error;
            }

            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
    }
}

// gets logs in batches
async function getLogsInBatches(provider, network, fromBlock, toBlock) {
        const addresses = new Set();
        let currentBlock = fromBlock;
        
        // Initialize progress tracking
        networkProgress[network] = { percentage: 0, addresses: 0 };
        updateProgressDisplay();
        
        // Calculate total blocks
        const totalBlocks = toBlock - fromBlock;
        let lastSavePercentage = 0;
        
        let localBatchSize = totalBlocks > 1000000 ? 10000 : 
                            totalBlocks > 100000 ? 5000 :
                            BATCH_SIZE;
        
        while (currentBlock <= toBlock) {
            const endBlock = Math.min(currentBlock + localBatchSize, toBlock);
            
            try {
                const logs = await provider.getLogs({
                    address: POOL_ADDRESSES[network],
                    topics: [SUPPLY_TOPIC],
                    fromBlock: currentBlock,
                    toBlock: endBlock,
                });
    
                logs.forEach(log => {
                    const supplierAddress = ethers.utils.getAddress('0x' + log.topics[2].slice(26));
                    addresses.add(supplierAddress);
                });
    
                // Calculate current progress percentage
                const blocksProcessed = currentBlock - fromBlock;
                const currentPercentage = (blocksProcessed / totalBlocks) * 100;
                
                // Update progress display
                networkProgress[network] = {
                    percentage: currentPercentage,
                    addresses: addresses.size
                };
                updateProgressDisplay();
    
                // Check if we've reached another 2% interval
                const currentInterval = Math.floor(currentPercentage / 2);
                const lastInterval = Math.floor(lastSavePercentage / 2);
                
                if (addresses.size > 0 && currentInterval > lastInterval) {
                    try {
                        await saveToJson(network, Array.from(addresses));
                        lastSavePercentage = currentPercentage;
                    } catch (saveError) {
                        console.error(`Error saving ${network} data:`, saveError);
                    }
                }
    
            } catch (error) {
                localBatchSize = Math.floor(localBatchSize / 2);
                if (localBatchSize < 100) {
                    localBatchSize = 100;
                }
                continue;
            }
    
            currentBlock = endBlock + 1;
        }
    
        // Final save for this network
        if (addresses.size > 0) {
            try {
                await saveToJson(network, Array.from(addresses));
            } catch (saveError) {
                console.error(`Error in final save for ${network}:`, saveError);
            }
        }
    
        return Array.from(addresses);
    }

// saves to json
    async function saveToJson(network, data) {
        const filename = `suppliers_${network}.json`;
        const outputData = {
            network,
            unique_addresses_count: data.length,
            addresses: data,
            last_updated: new Date().toISOString()
        };
    
        try {
            // Write to temporary file first
            const tempFile = `${filename}.tmp`;
            await fsPromises.writeFile(tempFile, JSON.stringify(outputData, null, 2));
            
            // Rename temp file to actual file (atomic operation)
            await fsPromises.rename(tempFile, filename);
        } catch (error) {
            // Try without pretty printing if the first attempt fails
            try {
                const tempFile = `${filename}.tmp`;
                await fsPromises.writeFile(tempFile, JSON.stringify(outputData));
                await fsPromises.rename(tempFile, filename);
            } catch (retryError) {
                throw retryError;
            }
        }
    }

// adds summary after each network's data queried, this tracks across all networks and has all addresses in summary file
    async function saveSummaryStats(networkStats, allAddresses) {
        const summary = {
            total_unique_addresses: allAddresses.size,
            all_unique_addresses: Array.from(allAddresses),
            network_statistics: networkStats,
            last_updated: new Date().toISOString()
        };
    
        try {
            await fsPromises.writeFile('aave_summary_stats.json', JSON.stringify(summary, null, 2));
        } catch (error) {
            // Try without addresses if full save fails
            try {
                const summaryWithoutAddresses = {
                    total_unique_addresses: allAddresses.size,
                    network_statistics: networkStats,
                    last_updated: new Date().toISOString()
                };
                await fsPromises.writeFile('aave_summary_stats.json', JSON.stringify(summaryWithoutAddresses, null, 2));
                
                // Save addresses in chunks
                const addresses = Array.from(allAddresses);
                const CHUNK_SIZE = 10000;
                for (let i = 0; i < addresses.length; i += CHUNK_SIZE) {
                    const chunk = addresses.slice(i, i + CHUNK_SIZE);
                    const chunkFile = `aave_addresses_chunk_${Math.floor(i / CHUNK_SIZE)}.json`;
                    await fsPromises.writeFile(chunkFile, JSON.stringify({
                        chunk_index: Math.floor(i / CHUNK_SIZE),
                        addresses: chunk,
                        total_chunks: Math.ceil(addresses.length / CHUNK_SIZE),
                        last_updated: new Date().toISOString()
                    }, null, 2));
                }
            } catch (retryError) {
                throw retryError;
            }
        }
    }

// processing each network
async function processNetwork(network) {
        const provider = new ethers.providers.JsonRpcProvider(NETWORKS[network]);
        
        try {
            const currentBlock = await provider.getBlockNumber();
            
            // Decide which starting block to use
            let fromBlock;
            let useDeploymentBlock = true;  // Set this to true to use deployment blocks
            
            if (useDeploymentBlock) {
                fromBlock = DEPLOYMENT_BLOCKS[network];
            } else {
                fromBlock = currentBlock - 50000;
            }
            
            const addresses = await getLogsInBatches(provider, network, fromBlock, currentBlock);
            await saveToJson(network, addresses);
            
            // Update to 100% when complete
            networkProgress[network] = {
                percentage: 100,
                addresses: addresses.length
            };
            updateProgressDisplay();
            
            return addresses;
        } catch (error) {
            console.error(`Error processing ${network}:`, error);
            networkProgress[network] = {
                percentage: 0,
                addresses: 0,
                error: true
            };
            updateProgressDisplay();
            return [];
        }
}

// does all this async so that it will be parellel
async function main() {
    const networkStats = {};
    const allAddresses = new Set();
    
    const networkPromises = Object.keys(NETWORKS).map(async network => {
        const addresses = await processNetwork(network);
        networkStats[network] = addresses.length;
        addresses.forEach(address => allAddresses.add(address));
        
        try {
            await saveSummaryStats(networkStats, allAddresses);
        } catch (error) {}
        
        return addresses;
    });
    
    try {
        await Promise.all(networkPromises);
        console.log('\nCompleted all networks. Total unique addresses:', allAddresses.size);
        await saveSummaryStats(networkStats, allAddresses);
    } catch (error) {
        console.error('\nError in main process');
    }
}

main().catch(console.error);
