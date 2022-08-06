import { Opt, Query } from 'azle';
import { state } from './state';
import { LatestAnswer, State } from './types';

export function get_state(): Query<State> {
    return state;
}

export function get_latest_answer_eth_usd(): Query<Opt<LatestAnswer>> {
    return state.latest_answers?.eth_usd ?? null;
}

export function get_latest_answer_btc_usd(): Query<Opt<LatestAnswer>> {
    return state.latest_answers?.btc_usd ?? null;
}

export function get_latest_answer_icp_usd(): Query<Opt<LatestAnswer>> {
    return state.latest_answers?.icp_usd ?? null;
}
