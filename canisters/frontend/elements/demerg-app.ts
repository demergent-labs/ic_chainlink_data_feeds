// TODO let's add nice looking web components and then prepare to launch the initial version
// TODO show consensus, heaviest answer, and the other answers as well. Give the user all of the info they need

import { ActorSubclass } from '@dfinity/agent';
import { createActor } from '../dfx_generated/data_feeds';
import { _SERVICE } from '../dfx_generated/data_feeds/data_feeds.did';
import { html, render as lit_render } from 'lit-html';
import { createObjectStore } from 'reduxular';
import { State as DataFeedsState, LatestAnswer } from '../../data_feeds/types';

type State = {
    data_feeds_canister: ActorSubclass<_SERVICE>;
    data_feeds_state: DataFeedsState | null;
};

const initial_state: State = {
    data_feeds_canister: createActor(window.process.env.DATA_FEEDS_CANISTER_ID as string),
    data_feeds_state: null
};

class DemergApp extends HTMLElement {
    shadow = this.attachShadow({
        mode: 'closed'
    });
    store = createObjectStore(
        initial_state,
        (state: State) => lit_render(this.render(state), this.shadow),
        this
    );

    async connectedCallback() {
        this.store.data_feeds_state = await this.fetch_data_feeds_state();

        console.log('eth_usd', this.store.data_feeds_state.latest_answers?.eth_usd);
        console.log('btc_usd', this.store.data_feeds_state.latest_answers?.btc_usd);
        console.log('icp_usd', this.store.data_feeds_state.latest_answers?.icp_usd);

        setInterval(async () => {
            this.store.data_feeds_state = await this.fetch_data_feeds_state();

            console.log('eth_usd', this.store.data_feeds_state.latest_answers?.eth_usd);
            console.log('btc_usd', this.store.data_feeds_state.latest_answers?.btc_usd);
            console.log('icp_usd', this.store.data_feeds_state.latest_answers?.icp_usd);
        }, 30000);
    }

    async fetch_data_feeds_state(): Promise<DataFeedsState> {
        const data_feeds_state = await this.store.data_feeds_canister.get_state();

        return {
            ...data_feeds_state,
            last_heartbeat: data_feeds_state.last_heartbeat.length === 0 ? null : data_feeds_state.last_heartbeat[0],
            latest_answers: data_feeds_state.latest_answers.length === 0 ? null : {
                ...data_feeds_state.latest_answers[0],
                eth_usd: {
                    ...data_feeds_state.latest_answers[0].eth_usd,
                    heaviest_answer: data_feeds_state.latest_answers[0].eth_usd.heaviest_answer.length === 0 ? null : data_feeds_state.latest_answers[0].eth_usd.heaviest_answer[0]
                },
                btc_usd: {
                    ...data_feeds_state.latest_answers[0].btc_usd,
                    heaviest_answer: data_feeds_state.latest_answers[0].btc_usd.heaviest_answer.length === 0 ? null : data_feeds_state.latest_answers[0].btc_usd.heaviest_answer[0]
                },
                icp_usd: {
                    ...data_feeds_state.latest_answers[0].icp_usd,
                    heaviest_answer: data_feeds_state.latest_answers[0].icp_usd.heaviest_answer.length === 0 ? null : data_feeds_state.latest_answers[0].icp_usd.heaviest_answer[0]
                }
            }
        };
    }

    render(state: State) {
        const {
            price: eth_usd_price,
            updated_at: eth_usd_updated_at
        } = get_price_display_info(state.data_feeds_state?.latest_answers?.eth_usd);

        const {
            price: btc_usd_price,
            updated_at: btc_usd_updated_at
        } = get_price_display_info(state.data_feeds_state?.latest_answers?.btc_usd);

        const {
            price: icp_usd_price,
            updated_at: icp_usd_updated_at
        } = get_price_display_info(state.data_feeds_state?.latest_answers?.icp_usd);

        return html`
            <style>

            </style>

            <div>Heartbeat every: ${state.data_feeds_state === null ? 'Loading...' : `${state.data_feeds_state.heartbeat_minutes} minute${state.data_feeds_state.heartbeat_minutes === 1n ? '' : 's'}`}</div>
            <div>Last Heartbeat at: ${state.data_feeds_state === null || state.data_feeds_state.last_heartbeat === null ? 'Loading...' : convert_nanoseconds_to_date(state.data_feeds_state.last_heartbeat)}</div>

            <br>

            <div>ETH/USD: ${eth_usd_price}, ${eth_usd_updated_at}, consensus: ${state.data_feeds_state?.latest_answers?.eth_usd.consensus}, number of answers: ${state.data_feeds_state?.latest_answers?.eth_usd.answers.length}, threshold required: ${state.data_feeds_state?.provider_configs.ethereum.threshold}</div>
            <br>

            <div>BTC/USD: ${btc_usd_price}, ${btc_usd_updated_at}, consensus: ${state.data_feeds_state?.latest_answers?.btc_usd.consensus}, number of answers: ${state.data_feeds_state?.latest_answers?.btc_usd.answers.length}, threshold required: ${state.data_feeds_state?.provider_configs.ethereum.threshold}</div>
            <br>

            <div>ICP/USD: ${icp_usd_price}, ${icp_usd_updated_at}, consensus: ${state.data_feeds_state?.latest_answers?.icp_usd.consensus}, number of answers: ${state.data_feeds_state?.latest_answers?.icp_usd.answers.length}, threshold required: ${state.data_feeds_state?.provider_configs.bsc.threshold}</div>
            <br>
        `;
    }
}

window.customElements.define('demerg-app', DemergApp);

function format_number_to_usd(number: number): string {
    return number.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    });
}

function convert_nanoseconds_to_date(nanoseconds: bigint): string {
    return new Date(
        Number(
            nanoseconds / 1_000_000n
        )
    ).toLocaleString();
}

function get_price_display_info(latest_answer: LatestAnswer | undefined): {
    price: string;
    updated_at: string;
} {
    const price = latest_answer === undefined ? 'price is loading' : format_number_to_usd(Number((latest_answer.heaviest_answer ?? 0n) / BigInt(10 ** 6)) / 100);
    const updated_at = latest_answer === undefined ? 'updated at time is loading' : `updated at ${convert_nanoseconds_to_date(latest_answer.time)}`;

    return {
        price,
        updated_at
    };
}
