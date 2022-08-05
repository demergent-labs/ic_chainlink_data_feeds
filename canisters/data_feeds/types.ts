import { int, nat64, Opt, Stable, Variant } from 'azle';
import { HttpResponse } from 'azle/canisters/management';

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

export type LatestAnswer = {
    answer: int;
    time: nat64;
};

export type LatestAnswers = {
    eth_usd: LatestAnswer;
    btc_usd: LatestAnswer;
    link_usd: LatestAnswer;
    aave_usd: LatestAnswer;
    bnb_usd: LatestAnswer;
    uni_usd: LatestAnswer;
};

export type LatestAnswerResult = Variant<{
    ok: LatestAnswer;
    err: string;
}>;

export type LatestAnswersResult = Variant<{
    ok: LatestAnswers;
    err: string;
}>;

export type StableStorage = Stable<{
    ethereum_url: string;
}>;

export type State = {
    chainlink_contract_addresses: {
        eth_usd: string,
        btc_usd: string,
        link_usd: string,
        aave_usd: string,
        bnb_usd: string,
        uni_usd: string
    };
    fetching_data_feeds: boolean;
    heartbeat_minutes: nat64;
    last_heartbeat: nat64;
    latest_answers: Opt<LatestAnswers>;
};
