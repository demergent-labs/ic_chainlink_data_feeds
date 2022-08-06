import { Heartbeat, ic, ok } from 'azle';
import { ONE_MINUTE_IN_NANOSECONDS } from './constants';
import { fetch_latest_answers } from './latest_answers';
import { state } from './state';
import { LatestAnswersResult } from './types';

export function* heartbeat(): Heartbeat {
    const heartbeat_interval_elapsed = state.last_heartbeat === null || ic.time() >= state.last_heartbeat + state.heartbeat_minutes * ONE_MINUTE_IN_NANOSECONDS;
    const should_fetch_data_feeds = state.fetching_data_feeds === false && heartbeat_interval_elapsed === true;

    if (should_fetch_data_feeds === false) {
        return;
    }

    state.last_heartbeat = ic.time();
    state.fetching_data_feeds = true;

    const latest_answers_result: LatestAnswersResult = yield fetch_latest_answers();

    if (!ok(latest_answers_result)) {
        state.fetching_data_feeds = false;
        return;
    }

    state.latest_answers = {
        eth_usd: latest_answers_result.ok.eth_usd,
        btc_usd: latest_answers_result.ok.btc_usd,
        icp_usd: latest_answers_result.ok.icp_usd
    };

    state.fetching_data_feeds = false;

    console.log(new Date().toISOString(), JSON.stringify(state, (_, value) => typeof value === 'bigint' ? value.toString() : value, 4));
}
