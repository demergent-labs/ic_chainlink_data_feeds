import { int, nat32, nat64, Opt, Variant } from 'azle';
import { HttpResponse } from 'azle/canisters/management';

export type ConsensusInfo = {
    answers: int[];
    consensus: boolean;
    heaviest_answer: int;
};

export type DecodeUtf8SafelyResult = Variant<{
    ok: string;
    err: string;
}>;

export type HttpResponseInfo = {
    http_response: HttpResponse;
    provider_url: string;
};

export type HttpResponseInfosWithErrors = {
    errors: string[];
    http_response_infos: HttpResponseInfo[];
};

export type HttpResponseResult = Variant<{
    ok: HttpResponse;
    err: string;
}>;

export type JsonRpcResponse = {
    jsonrpc: '2.0';
    id: string;
    result: string;
    error?: {
        code: number;
        message: string;
    };
};

export type JsonRpcResponsesWithErrors = {
    errors: string[];
    json_rpc_responses: JsonRpcResponse[];
};

export type JsonRpcResponseResult = Variant<{
    ok: JsonRpcResponse;
    err: string;
}>;

export type LatestAnswer = {
    answers: int[];
    consensus: boolean;
    errors: string[];
    heaviest_answer: Opt<int>;
    time: nat64;
};

export type LatestAnswers = {
    eth_usd: LatestAnswer;
    btc_usd: LatestAnswer;
    icp_usd: LatestAnswer;
};

export type ParseJsonRpcResponseResult = Variant<{
    ok: JsonRpcResponse;
    err: string;
}>;

export type ProviderConfig = {
    threshold: nat32;
    urls: string[];
};

export type ProviderConfigs = {
    bsc: ProviderConfig;
    ethereum: ProviderConfig;
};

export type State = {
    chainlink_contract_addresses: {
        eth_usd: string,
        btc_usd: string,
        icp_usd: string
    };
    fetching_data_feeds: boolean;
    heartbeat_minutes: nat64;
    last_heartbeat: Opt<nat64>;
    latest_answers: Opt<LatestAnswers>;
    provider_configs: ProviderConfigs;
};
