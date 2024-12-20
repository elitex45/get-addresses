# Get-addresses

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/ethers.svg)](https://nodejs.org)

A Node.js tool to efficiently extract and track addresses that have interacted with smart contracts across multiple blockchain networks by monitoring specific events.

## Features
- 🔄 Parallel processing of multiple networks
- 📊 Real-time progress tracking
- 💾 Automatic data persistence (saves every 2% progress)
- 🔍 Deduplication of addresses
- 📈 Network-specific and cross-network statistics
- ⚡ Optimized for handling large datasets
- 🛡️ Robust error handling and retry mechanisms

## Prerequisites
- Node.js v16 or higher
- npm (Node Package Manager)

### System Requirements
- Memory: At least 4GB RAM recommended for large networks
- Storage: Sufficient space for JSON files (varies by network size)

## Dependencies
- ethers.js: Ethereum wallet implementation and utilities
- fs/promises: File system operations

## Installation
1. Clone the repository:
```bash
git clone https://github.com/elitex45/get-addresses.git
cd get-addresses
```

2. Install dependencies:
```bash
npm install
```

## Getting Started
To track addresses for your own smart contract:

1. Modify the event signature:
```javascript
const YOUR_EVENT = ethers.utils.id("YourEvent(address,uint256)");
```

2. Update contract addresses and deployment blocks
3. Add your RPC endpoints

## Configuration
The script requires the following configuration for each network:
- Deployment block numbers
- RPC endpoints
- Contract addresses
- Event signatures

Configure these in the script by modifying the following constants:
```javascript
const DEPLOYMENT_BLOCKS = {
    ethereum: 16291127,
    polygon: 25826028,
    // ... add more networks
};

const NETWORKS = {
    ethereum: "YOUR_RPC_ENDPOINT",
    polygon: "YOUR_RPC_ENDPOINT",
    // ... add more networks
};

const POOL_ADDRESSES = {
    ethereum: "CONTRACT_ADDRESS",
    polygon: "CONTRACT_ADDRESS",
    // ... add more networks
};
```

## Usage
Run the script:
```bash
node get_addresses.js
```

The script will:
1. Process all configured networks in parallel
2. Display real-time progress for each network
3. Save network-specific data in separate JSON files
4. Maintain a summary file with cross-network statistics

### Sample Output
```
Network Progress:
ethereum  : 45.23% - 1234 unique addresses
polygon   : 67.89% - 5678 unique addresses
base      : 12.34% - 910 unique addresses
arbitrum  : 89.01% - 2345 unique addresses
optimism  : 23.45% - 3456 unique addresses
...
```

## Output Files
The script generates the following files:

1. Network-specific files:
```
suppliers_ethereum.json
suppliers_polygon.json
// ... one file per network
```

2. Summary file:
```
aave_summary_stats.json
```

### File Format
Network-specific files (`suppliers_network.json`):
```json
{
    "network": "ethereum",
    "unique_addresses_count": 1234,
    "addresses": ["0x123...", "0x456..."],
    "last_updated": "2024-12-20T10:30:45.123Z"
}
```

Summary file (`aave_summary_stats.json`):
```json
{
    "total_unique_addresses": 5678,
    "all_unique_addresses": ["0x123...", "0x456..."],
    "network_statistics": {
        "ethereum": 1234,
        "polygon": 2345,
        // ... other networks
    },
    "last_updated": "2024-12-20T10:30:45.123Z"
}
```

## Features in Detail

### Parallel Processing
- Uses Promise.all to process all networks simultaneously
- Each network maintains its own progress and error handling

### Progress Tracking
- Real-time console display of progress for each network
- Shows percentage completion and unique addresses found
- Updates in-place (non-scrolling display)

### Data Persistence
- Saves data every 2% of blocks processed
- Uses atomic write operations with temporary files
- Handles large datasets through chunking if needed

### Error Handling
- Automatic retry mechanism with exponential backoff
- Dynamic batch size adjustment
- Preserves partial progress on network failures

## Limitations
- RPC rate limits may affect processing speed
- Large datasets may require significant memory
- Some RPC providers may have historical data limitations

## Troubleshooting
- If encountering RPC errors, try reducing batch size in the code
- For memory issues, adjust CHUNK_SIZE in the code
- For timeout errors, check RPC endpoint stability
- If file writing fails, ensure sufficient disk space and permissions

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## License
MIT

## Acknowledgments
- Thanks to Claude! (https://claude.ai/new)
- Built using ethers.js
