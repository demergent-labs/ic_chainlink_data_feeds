CAUTION: This project is built with Azle Beta and inherits its disclaimer: https://github.com/demergent-labs/azle#disclaimer

# IC Chainlink Data Feeds

This is an example project showing how to use the Internet Computer outgoing HTTP requests feature to pull Ethereum data from a Web2 service directly into a canister running on the Internet Computer.

## Installation

```bash
dfx start --enable-canister-http --background
npm install
cd canisters/frontend && npm install
npm run install_data_feeds

# Adding 100T cycles just to make sure you don't run out anytime soon
dfx ledger fabricate-cycles --canister data_feeds --cycles 100000000000000
```

## Deployment

```bash
npm run deploy_data_feeds
dfx deploy frontend
```

## Usage

### Terminal

```bash
dfx canister call data_feeds get_state
dfx canister call data_feeds get_latest_answer_eth_usd
dfx canister call data_feeds get_latest_answer_btc_usd
dfx canister call data_feeds get_latest_answer_icp_usd
```

### Browser

Navigate to http://ryjl3-tyaaa-aaaaa-aaaba-cai.localhost:8000 and open the console

## Curl

The following curl commands show you how to use the Ethereum JSON RPC API directly to pull the latest answers from Chainlink price data feeds on Ethereum or Binance Smart Chain. This project essentially does the same thing, but from within a canister.

Open Ethereum provider URLs found here: https://ethereumnodes.com/
Open BSC provider URLs found here: https://docs.bscscan.com/misc-tools-and-utilities/public-rpc-nodes

```bash
# Chainlink ETH/USD: https://data.chain.link/ethereum/mainnet/crypto-usd/eth-usd
# 0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419 is the ETH/USD Chainlink data feed Ethereum smart contract address
# 0x50d25bcd24f012a662bcaeb604f0285b8c5c6bb4b58e5f6ad53742bfead001cc is the Keccak-256 hash of "latestAnswer()" without the quotes
curl -X POST --data '{"jsonrpc":"2.0","method":"eth_call","params":[{ "to": "0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419", "data": "0x50d25bcd24f012a662bcaeb604f0285b8c5c6bb4b58e5f6ad53742bfead001cc" }, "latest"],"id":1}' https://your-ethereum-provider-url.org
```
