import { State } from './types';

export let state: State = {
    chainlink_contract_addresses: {
        eth_usd: '0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419',
        btc_usd: '0xf4030086522a5beea4988f8ca5b36dbc97bee88c',
        icp_usd: '0x84210d9013a30c6ab169e28840a6cc54b60fa042'
    },
    fetching_data_feeds: false,
    heartbeat_minutes: 1n, // TODO set this back to 10 minutes
    last_heartbeat: null,
    latest_answers: null,
    provider_configs: {
        bsc: {
            threshold: 2,
            urls: [
                // Endpoints found here: https://docs.bscscan.com/misc-tools-and-utilities/public-rpc-nodes
                'https://bsc-dataseed1.binance.org/',
                'https://bsc-dataseed1.defibit.io/',
                'https://bsc-dataseed1.ninicoin.io/'
            ]
        },
        ethereum: {
            threshold: 2,
            urls: [
                // Endpoints found here: https://ethereumnodes.com/
                'https://rpc.ankr.com/eth',
                'https://rpc.flashbots.net/',
                'https://api.mycryptoapi.com/eth'
            ]
        }
    }
};
