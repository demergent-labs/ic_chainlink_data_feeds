import { Opt, Query } from 'azle';
import { state } from './index';
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

export function get_latest_answer_link_usd(): Query<Opt<LatestAnswer>> {
    return state.latest_answers?.link_usd ?? null;
}

export function get_latest_answer_aave_usd(): Query<Opt<LatestAnswer>> {
    return state.latest_answers?.aave_usd ?? null;
}

export function get_latest_answer_bnb_usd(): Query<Opt<LatestAnswer>> {
    return state.latest_answers?.bnb_usd ?? null;
}

export function get_latest_answer_uni_usd(): Query<Opt<LatestAnswer>> {
    return state.latest_answers?.uni_usd ?? null;
}
