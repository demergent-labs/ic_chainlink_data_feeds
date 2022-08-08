import { Async, blob, CanisterResult, ic, ok, Query } from 'azle';
import { HttpResponse, ManagementCanister } from 'azle/canisters/management';
import decodeUtf8 from 'decode-utf8';
import encodeUtf8 from 'encode-utf8';
import { state } from './state';
import {
    ConsensusInfo,
    DecodeUtf8SafelyResult,
    HttpResponseInfo,
    HttpResponseInfosWithErrors,
    HttpResponseResult,
    JsonRpcResponse,
    JsonRpcResponseResult,
    JsonRpcResponsesWithErrors,
    LatestAnswer,
    LatestAnswers,
    ParseJsonRpcResponseResult,
    ProviderConfig,
    TotalNumAnswers
} from './types';

export function* fetch_latest_answers(): Async<LatestAnswers> {
    const eth_usd_latest_answer: LatestAnswer = yield fetch_latest_answer(state.chainlink_contract_addresses.eth_usd, state.provider_configs.ethereum);
    const btc_usd_latest_answer: LatestAnswer = yield fetch_latest_answer(state.chainlink_contract_addresses.btc_usd, state.provider_configs.ethereum);
    const icp_usd_latest_answer: LatestAnswer = yield fetch_latest_answer(state.chainlink_contract_addresses.icp_usd, state.provider_configs.bsc);

    const data_feeds_result: LatestAnswers = {
        eth_usd: eth_usd_latest_answer,
        btc_usd: btc_usd_latest_answer,
        icp_usd: icp_usd_latest_answer
    };

    return data_feeds_result;
}

function* fetch_latest_answer(data_feed_address: string, provider_config: ProviderConfig): Async<LatestAnswer> {
    const http_response_infos_with_errors: HttpResponseInfosWithErrors = yield get_http_response_infos_with_errors(data_feed_address, provider_config);
    const http_response_infos = http_response_infos_with_errors.http_response_infos;

    const json_rpc_responses_with_errors: JsonRpcResponsesWithErrors = get_json_rpc_responses_with_errors(http_response_infos);
    const json_rpc_responses = json_rpc_responses_with_errors.json_rpc_responses;

    const {
        answers,
        consensus,
        heaviest_answer
    } = get_consensus_info(provider_config, json_rpc_responses);

    const errors = [
        ...http_response_infos_with_errors.errors,
        ...json_rpc_responses_with_errors.errors
    ];

    const latest_answer: LatestAnswer = {
        answers,
        consensus,
        heaviest_answer,
        errors,
        time: ic.time()
    };

    return latest_answer;
}

function get_consensus_info(
    provider_config: ProviderConfig,
    json_rpc_responses: JsonRpcResponse[]
): ConsensusInfo {
    if (json_rpc_responses.length === 0) {
        return {
            answers: [],
            consensus: false,
            heaviest_answer: null
        };
    }

    const answers = json_rpc_responses.map((json_rpc_response) => {
        return BigInt(json_rpc_response.result);
    });

    const total_num_answers: TotalNumAnswers = answers.reduce((result: TotalNumAnswers, answer) => {
        return {
            ...result,
            [answer.toString()]: (result[answer.toString()] ?? 0) + 1
        };
    }, {});
    const total_num_answers_sorted_entries = Object.entries(total_num_answers).sort((entry_a, entry_b) => entry_a[1] > entry_b[1] ? -1 : entry_a[1] < entry_b[1] ? 1 : 0);

    const max_entry = total_num_answers_sorted_entries[0];
    const max_num_equal = max_entry[1];
    const consensus = max_num_equal >= provider_config.threshold;
    const heaviest_answer = get_heaviest_answer(total_num_answers_sorted_entries);

    return {
        answers,
        consensus,
        heaviest_answer
    };
}

function get_heaviest_answer(entries: [string, number][]): bigint | null {
    const first_entry = entries[0];
    const second_entry = entries[1];

    if (
        entries.length > 1 &&
        first_entry[1] === second_entry[1]
    ) {
        return null;
    }

    return BigInt(first_entry[0]);
}


function* get_http_response_infos_with_errors(data_feed_address: string, provider_config: ProviderConfig): Async<HttpResponseInfosWithErrors> {
    let errors: string[] = [];
    let http_response_infos: HttpResponseInfo[] = [];

    for (let i=0; i < provider_config.urls.length; i++) {
        const provider_url = provider_config.urls[i];
        const latest_answer_http_response_result: HttpResponseResult = yield get_latest_answer_http_response(data_feed_address, provider_url);

        if (ok(latest_answer_http_response_result)) {
            http_response_infos.push({
                http_response: latest_answer_http_response_result.ok,
                provider_url
            });
        }
        else {
            errors.push(`HttpRequest error (${provider_url}): ${latest_answer_http_response_result.err}`);
        }
    }

    return {
        errors,
        http_response_infos
    };
}

function get_json_rpc_responses_with_errors(http_response_infos: HttpResponseInfo[]): JsonRpcResponsesWithErrors {
    const json_rpc_responses_info: JsonRpcResponsesWithErrors = http_response_infos.reduce((result: JsonRpcResponsesWithErrors, http_response_info) => {
        const json_rpc_response_result = get_json_rpc_response(http_response_info);

        if (ok(json_rpc_response_result)) {
            return {
                ...result,
                json_rpc_responses: [
                    ...result.json_rpc_responses,
                    json_rpc_response_result.ok
                ]
            };
        }
        else {
            return {
                ...result,
                errors: [
                    ...result.errors,
                    json_rpc_response_result.err as string
                ]
            };
        }
    }, {
        errors: [],
        json_rpc_responses: []
    });

    return json_rpc_responses_info;
}

function get_json_rpc_response(http_response_info: HttpResponseInfo): JsonRpcResponseResult {
    const decode_utf8_safely_result: DecodeUtf8SafelyResult = decode_utf8_safely(http_response_info.http_response.body, http_response_info.provider_url);

    if (!ok(decode_utf8_safely_result)) return {
        err: decode_utf8_safely_result.err
    };

    const json_rpc_response_string = decode_utf8_safely_result.ok;

    const parse_json_rpc_response_result: ParseJsonRpcResponseResult = parse_json_rpc_response(json_rpc_response_string, http_response_info.provider_url);

    if (!ok(parse_json_rpc_response_result)) {
        return {
            err: parse_json_rpc_response_result.err as string
        };
    }

    const json_rpc_response = parse_json_rpc_response_result.ok;

    if (http_response_info.http_response.status !== 200n) {
        return {
            err: `HttpResponse error (${http_response_info.provider_url}): response has status ${http_response_info.http_response.status}`
        };
    }

    if (json_rpc_response.error !== undefined) {
        return {
            err: `JsonRpcResponse error (${http_response_info.provider_url}): code: ${json_rpc_response.error.code}, message: ${json_rpc_response.error.message}`
        };
    }

    return {
        ok: json_rpc_response
    };
}

function decode_utf8_safely(encoded: blob, provider_url: string): DecodeUtf8SafelyResult {
    try {
        const decoded_string = decodeUtf8(Uint8Array.from(encoded)); // TODO encoded is already a Uint8Array but Boa may have a bug requiring the extra Uint8Array.from

        return {
            ok: decoded_string
        };
    }
    catch(error) {
        return {
            err: `Decode utf8 error (${provider_url}): ${(error as any).toString()}`
        };
    }
}

function parse_json_rpc_response(json_rpc_response_string: string, provider_url: string): ParseJsonRpcResponseResult {
    try {
        const json_rpc_response: JsonRpcResponse = JSON.parse(json_rpc_response_string);

        return {
            ok: json_rpc_response
        };
    }
    catch(error) {
        return {
            err: `Parse JsonRpcResponse error (${provider_url}): ${(error as any).toString()}`
        };
    }
}

function* get_latest_answer_http_response(data_feed_address: string, provider_url: string): Async<HttpResponseResult> {
    const http_response_result: CanisterResult<HttpResponse> =
        yield ManagementCanister.http_request({
            url: provider_url,
            max_response_bytes: 200n,
            http_method: {
                POST: null
            },
            headers: [],
            body: new Uint8Array(encodeUtf8(
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
            )),
            transform_method_name: 'get_data_feed_latest_answer_transform'
        }).with_cycles(500_000_000n); // TODO consider breaking this out into costs

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
