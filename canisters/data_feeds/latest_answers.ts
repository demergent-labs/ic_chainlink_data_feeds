import { Async, blob, CanisterResult, ic, ok, Query } from 'azle';
import { HttpResponse, ManagementCanister } from 'azle/canisters/management';
import encodeUtf8 from 'encode-utf8';
import decodeUtf8 from 'decode-utf8';
import { state } from './state';
import { ConsensusInfo, DecodeUtf8SafelyResult, HttpResponseInfo, HttpResponseInfosWithErrors, HttpResponseResult, JsonRpcResponse, JsonRpcResponseResult, JsonRpcResponsesWithErrors, LatestAnswerResult, LatestAnswersResult, ParseJsonRpcResponseResult, ProviderConfig } from './types';

export function* fetch_latest_answers(): Async<LatestAnswersResult> {
    const eth_usd_latest_answer_result: LatestAnswerResult = yield fetch_latest_answer(state.chainlink_contract_addresses.eth_usd, state.provider_configs.ethereum);
    const btc_usd_latest_answer_result: LatestAnswerResult = yield fetch_latest_answer(state.chainlink_contract_addresses.btc_usd, state.provider_configs.ethereum);
    const icp_usd_latest_answer_result: LatestAnswerResult = yield fetch_latest_answer(state.chainlink_contract_addresses.icp_usd, state.provider_configs.bsc);

    if (!ok(eth_usd_latest_answer_result)) return { err: eth_usd_latest_answer_result.err };
    if (!ok(btc_usd_latest_answer_result)) return { err: btc_usd_latest_answer_result.err };
    if (!ok(icp_usd_latest_answer_result)) return { err: icp_usd_latest_answer_result.err };

    const data_feeds_result: LatestAnswersResult = {
        ok: {
            eth_usd: eth_usd_latest_answer_result.ok,
            btc_usd: btc_usd_latest_answer_result.ok,
            icp_usd: icp_usd_latest_answer_result.ok
        }
    };

    return data_feeds_result;
}

function* fetch_latest_answer(data_feed_address: string, provider_config: ProviderConfig): Async<LatestAnswerResult> {
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

    const data_feed_result: LatestAnswerResult = {
        ok: {
            answers,
            consensus,
            heaviest_answer,
            errors,
            time: ic.time()
        }
    };

    return data_feed_result;
}

function get_consensus_info(
    provider_config: ProviderConfig,
    json_rpc_responses: JsonRpcResponse[]
): ConsensusInfo {
    const answers = json_rpc_responses.map((json_rpc_response) => {
        return BigInt(parseInt(json_rpc_response.result));
    });

    const num_equals = answers.map((outer_answer) => {
        const num_equal = answers.filter((inner_answer) => outer_answer === inner_answer).length;

        return num_equal;
    });

    const max_num_equal = Math.max(...num_equals);
    const max_num_equal_index = num_equals.indexOf(max_num_equal);

    const consensus = max_num_equal >= provider_config.threshold;

    const heaviest_answer = answers[max_num_equal_index] ?? null;

    return {
        answers,
        consensus,
        heaviest_answer
    };
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