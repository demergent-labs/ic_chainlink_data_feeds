# IC Chainlink Data Feeds

This is an example project showing how to use the IC outgoing HTTP requests feature to pull Ethereum data from a Web2 service directly into a canister running on the Internet Computer.

The following curl commands show you how to use the Ethereum JSON RPC API directly to pull the latest answers from Chainlink price data feeds. This example essentially does the same thing, but from within a canister:

Open Ethereum provider URLs found here: https://ethereumnodes.com/
Open BSC provider URLs found here: https://docs.bscscan.com/misc-tools-and-utilities/public-rpc-nodes

```bash
# Chainlink ETH/USD: https://data.chain.link/ethereum/mainnet/crypto-usd/eth-usd
# 0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419 is the ETH/USD Chainlink data feed Ethereum smart contract address
# 0x50d25bcd24f012a662bcaeb604f0285b8c5c6bb4b58e5f6ad53742bfead001cc is the Keccak-256 hash of "latestAnswer()" without the quotes
curl -X POST --data '{"jsonrpc":"2.0","method":"eth_call","params":[{ "to": "0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419", "data": "0x50d25bcd24f012a662bcaeb604f0285b8c5c6bb4b58e5f6ad53742bfead001cc" }, "latest"],"id":1}' https://your-ethereum-provider-url.org
```

## Installation

```bash
npm install
```

## Deployment

```bash
dfx canister create data_feeds

# TODO add a good amount of initial cycles, like 100T
dfx ledger fabricate-cycles --canister data_feeds

dfx build data_feeds
dfx canister install --wasm target/wasm32-unknown-unknown/release/data_feeds.wasm.gz --argument '("https://your-ethereum-provider-url.org")' data_feeds
```

## Usage
