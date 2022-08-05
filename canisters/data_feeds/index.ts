// TODO build a frontend for this
// TODO make the documentation very good

import { Async, CanisterResult, Heartbeat, ic, Init, ok, Query } from 'azle';
import { HttpResponse, ManagementCanister } from 'azle/canisters/management';
import { ONE_MINUTE_IN_NANOSECONDS } from './constants';
import { HttpResponseResult, JsonRpcResponse, LatestAnswerResult, LatestAnswersResult, StableStorage, State } from './types';
import utf8 from 'utf8-encoder';

export let state: State = {
    chainlink_contract_addresses: {
        eth_usd: '0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419',
        btc_usd: '0xf4030086522a5beea4988f8ca5b36dbc97bee88c',
        link_usd: '0x2c1d072e956affc0d435cb7ac38ef18d24d9127c',
        aave_usd: '0x547a514d5e3769680ce22b2361c10ea13619e8a9',
        bnb_usd: '0x14e613ac84a31f709eadbdf89c6cc390fdc9540a',
        uni_usd: '0x553303d460ee0afb37edff9be42922d8ff63220e'
    },
    fetching_data_feeds: false,
    heartbeat_minutes: 10n,
    last_heartbeat: ic.time(),
    latest_answers: null
};

let stable_storage: StableStorage = ic.stable_storage();

export {
    get_state,
    get_latest_answer_eth_usd,
    get_latest_answer_btc_usd,
    get_latest_answer_link_usd,
    get_latest_answer_aave_usd,
    get_latest_answer_bnb_usd,
    get_latest_answer_uni_usd
} from './api';

export function init(ethereum_url: string): Init {
    stable_storage.ethereum_url = ethereum_url;
}

export function* heartbeat(): Heartbeat {
    const heartbeat_interval_elapsed = ic.time() >= state.last_heartbeat + state.heartbeat_minutes * ONE_MINUTE_IN_NANOSECONDS;
    const should_fetch_data_feeds = state.fetching_data_feeds === false && heartbeat_interval_elapsed === true;

    if (should_fetch_data_feeds === false) {
        return;
    }

    state.fetching_data_feeds = true;

    const latest_answers_result: LatestAnswersResult = yield fetch_latest_answers();

    if (!ok(latest_answers_result)) {
        state.fetching_data_feeds = false;
        state.last_heartbeat = ic.time();
        return;
    }

    state.latest_answers = {
        eth_usd: latest_answers_result.ok.eth_usd,
        btc_usd: latest_answers_result.ok.btc_usd,
        link_usd: latest_answers_result.ok.link_usd,
        aave_usd: latest_answers_result.ok.aave_usd,
        bnb_usd: latest_answers_result.ok.bnb_usd,
        uni_usd: latest_answers_result.ok.uni_usd
    };

    state.fetching_data_feeds = false;
    state.last_heartbeat = ic.time();
}

function* fetch_latest_answers(): Async<LatestAnswersResult> {
    const eth_usd_latest_answer_result: LatestAnswerResult = yield fetch_latest_answer(state.chainlink_contract_addresses.eth_usd);
    const btc_usd_latest_answer_result: LatestAnswerResult = yield fetch_latest_answer(state.chainlink_contract_addresses.btc_usd);
    const link_usd_latest_answer_result: LatestAnswerResult = yield fetch_latest_answer(state.chainlink_contract_addresses.link_usd);
    const aave_usd_latest_answer_result: LatestAnswerResult = yield fetch_latest_answer(state.chainlink_contract_addresses.aave_usd);
    const bnb_usd_latest_answer_result: LatestAnswerResult = yield fetch_latest_answer(state.chainlink_contract_addresses.bnb_usd);
    const uni_usd_latest_answer_result: LatestAnswerResult = yield fetch_latest_answer(state.chainlink_contract_addresses.uni_usd);

    if (!ok(eth_usd_latest_answer_result)) return { err: eth_usd_latest_answer_result.err };
    if (!ok(btc_usd_latest_answer_result)) return { err: btc_usd_latest_answer_result.err };
    if (!ok(link_usd_latest_answer_result)) return { err: link_usd_latest_answer_result.err };
    if (!ok(aave_usd_latest_answer_result)) return { err: aave_usd_latest_answer_result.err };
    if (!ok(bnb_usd_latest_answer_result)) return { err: bnb_usd_latest_answer_result.err };
    if (!ok(uni_usd_latest_answer_result)) return { err: uni_usd_latest_answer_result.err };

    const data_feeds_result: LatestAnswersResult = {
        ok: {
            eth_usd: eth_usd_latest_answer_result.ok,
            btc_usd: btc_usd_latest_answer_result.ok,
            link_usd: link_usd_latest_answer_result.ok,
            aave_usd: aave_usd_latest_answer_result.ok,
            bnb_usd: bnb_usd_latest_answer_result.ok,
            uni_usd: uni_usd_latest_answer_result.ok
        }
    };

    return data_feeds_result;
}

function* fetch_latest_answer(data_feed_address: string): Async<LatestAnswerResult> {
    const latest_answer_http_response_result: HttpResponseResult = yield get_latest_answer_http_response(data_feed_address);

    if (!ok(latest_answer_http_response_result)) return { err: latest_answer_http_response_result.err };

    const latest_answer_http_response = latest_answer_http_response_result.ok;
    const latest_answer_string: string = utf8.toString(latest_answer_http_response.body);
    const latest_answer_json: JsonRpcResponse = JSON.parse(latest_answer_string);

    if (latest_answer_json.error !== undefined) {
        return {
            err: `code: ${latest_answer_json.error.code}, message: ${latest_answer_json.error.message}`
        };
    }

    const data_feed_result: LatestAnswerResult = {
        ok: {
            answer: BigInt(parseInt(latest_answer_json.result)),
            time: ic.time()
        }
    };

    return data_feed_result;
}

// To increase security, multiple providers could be used here, for example Infura, QuickNode, and Alchemy
// Each of the provider's responses could then be compared to ensure they are identical before trusting the results
// You would also need some kind of functionality for upgrading the endpoints in case they cease to function properly
// Doing this in a secure/decentralized manner could be challenging
function* get_latest_answer_http_response(data_feed_address: string): Async<HttpResponseResult> {
    const http_response_result: CanisterResult<HttpResponse> =
        yield ManagementCanister.http_request({
            url: stable_storage.ethereum_url,
            max_response_bytes: 200n,
            http_method: {
                POST: null
            },
            headers: [],
            body: utf8.fromString(
                JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'eth_call',
                    params: [
                        {
                            to: data_feed_address,
                            data: '0x50d25bcd24f012a662bcaeb604f0285b8c5c6bb4b58e5f6ad53742bfead001cc' // Keccak-256 hash of "latestAnswer()" without the quotes
                        },
                        'latest'
                    ],
                    id: 1
                })
            ),
            transform_method_name: 'get_data_feed_latest_answer_transform'
        }).with_cycles(500_000_000n);

    return http_response_result;
}

export function get_data_feed_latest_answer_transform(
    http_response: HttpResponse
): Query<HttpResponse> {
    return {
        ...http_response,
        headers: []
    };
}
