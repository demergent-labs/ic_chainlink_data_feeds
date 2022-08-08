import { Heartbeat, ic, ok } from 'azle';
import { ONE_MINUTE_IN_NANOSECONDS } from './constants';
import { fetch_latest_answers } from './latest_answers';
import { state } from './state';
import { LatestAnswers } from './types';

export function* heartbeat(): Heartbeat {
    const heartbeat_interval_elapsed = state.last_heartbeat === null || ic.time() >= state.last_heartbeat + state.heartbeat_minutes * ONE_MINUTE_IN_NANOSECONDS;
    const should_fetch_data_feeds = state.fetching_data_feeds === false && heartbeat_interval_elapsed === true;

    if (should_fetch_data_feeds === false) {
        return;
    }

    state.last_heartbeat = ic.time();
    state.fetching_data_feeds = true;

    const latest_answers: LatestAnswers = yield fetch_latest_answers();

    state.latest_answers = {
        eth_usd: latest_answers.eth_usd,
        btc_usd: latest_answers.btc_usd,
        icp_usd: latest_answers.icp_usd
    };

    state.fetching_data_feeds = false;
}
