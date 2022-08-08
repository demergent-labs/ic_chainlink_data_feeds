import { ActorSubclass } from '@dfinity/agent';
import { createActor } from '../dfx_generated/data_feeds';
import { State as DataFeedsState, LatestAnswer, ProviderConfig } from '../../data_feeds/types';
import { _SERVICE } from '../dfx_generated/data_feeds/data_feeds.did';
import { html, render as lit_render, TemplateResult } from 'lit-html';
import { createObjectStore } from 'reduxular';
import '@spectrum-web-components/card/sp-card.js';
import '@spectrum-web-components/theme/sp-theme.js';
import '@spectrum-web-components/theme/src/themes.js';

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
        await this.set_and_log_data_feeds();
        setInterval(this.set_and_log_data_feeds.bind(this), 30000);
    }

    async set_and_log_data_feeds() {
        this.store.data_feeds_state = await this.fetch_data_feeds_state();

        console.log('eth_usd', this.store.data_feeds_state.latest_answers?.eth_usd);
        console.log('btc_usd', this.store.data_feeds_state.latest_answers?.btc_usd);
        console.log('icp_usd', this.store.data_feeds_state.latest_answers?.icp_usd);
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
        const heartbeat_interval_string = get_heartbeat_interval_string(state.data_feeds_state?.heartbeat_minutes);
        const last_heartbeat_time_string = get_time_string(state.data_feeds_state?.last_heartbeat);

        const eth_usd_price_template = get_price_template(state.data_feeds_state?.latest_answers?.eth_usd);
        const btc_usd_price_template = get_price_template(state.data_feeds_state?.latest_answers?.btc_usd);
        const icp_usd_price_template = get_price_template(state.data_feeds_state?.latest_answers?.icp_usd);

        const eth_usd_consensus_string = get_consensus_string(
            state.data_feeds_state?.provider_configs.ethereum,
            state.data_feeds_state?.latest_answers?.eth_usd
        );
        const btc_usd_consensus_string = get_consensus_string(
            state.data_feeds_state?.provider_configs.ethereum,
            state.data_feeds_state?.latest_answers?.btc_usd
        );
        const icp_usd_consensus_string = get_consensus_string(
            state.data_feeds_state?.provider_configs.bsc,
            state.data_feeds_state?.latest_answers?.icp_usd
        );

        return html`
            <style>
                .main-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding-top: 5rem;
                }

                .card-container {
                    padding: 1rem;
                }

                .data-feed-cards-container {
                    display: flex;
                }

                .footer-text {
                    color: white;
                }
            </style>

            <sp-theme scale="large" color="dark">
                <div class="main-container">
                    <div>
                        <div class="card-container">
                            <sp-card heading="Latest Heartbeat" subheading="${heartbeat_interval_string}" href="https://github.com/demergent-labs/ic_chainlink_data_feeds/blob/main/canisters/data_feeds/heartbeat.ts" target="_blank">
                                <div slot="footer" class="footer-text">${last_heartbeat_time_string}</div>
                            </sp-card>
                        </div>
                    </div>

                    <div class="data-feed-cards-container">
                        <div class="card-container">
                            <sp-card heading="ETH/USD" href="${get_href('eth-usd')}" target="_blank">
                                <div slot="subheading">
                                    <div>${eth_usd_consensus_string}</div>
                                </div>
                                <div slot="footer" class="footer-text">
                                    ${eth_usd_price_template}
                                </div>
                            </sp-card>
                        </div>

                        <div class="card-container">
                            <sp-card heading="BTC/USD" href="${get_href('btc-usd')}" target="_blank">
                                <div slot="subheading">
                                    <div>${btc_usd_consensus_string}</div>
                                </div>
                                <div slot="footer" class="footer-text">
                                    ${btc_usd_price_template}
                                </div>
                            </sp-card>
                        </div>

                        <div class="card-container">
                            <sp-card heading="ICP/USD" href="${get_href('icp-usd')}" target="_blank">
                                <div slot="subheading">
                                    <div>${icp_usd_consensus_string}</div>
                                </div>
                                <div slot="footer" class="footer-text">
                                    ${icp_usd_price_template}
                                </div>
                            </sp-card>
                        </div>
                    </div>
                </div>

                <a href="https://github.com/demergent-labs/ic_chainlink_data_feeds/blob/main/canisters/frontend/oss-attribution/attribution.txt" target="_blank" style="color: white; text-decoration: none; position: absolute; bottom: 0px; right: 0px; padding: 1rem">Open Source</a>
            </sp-theme>

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

function get_price_template(latest_answer: LatestAnswer | undefined): TemplateResult {
    if (
        latest_answer === undefined ||
        latest_answer.heaviest_answer === null
    ) {
        return html``;
    }

    const price_string = format_number_to_usd(Number((latest_answer.heaviest_answer) / BigInt(10 ** 6)) / 100);

    return html`<div style="${latest_answer.consensus === true ? '' : 'color: rgba(255, 255, 255, .25)'}">${price_string}</div>`;
}

function get_consensus_string(
    provider_config: ProviderConfig | undefined,
    latest_answer: LatestAnswer | undefined
): string {
    if (provider_config === undefined || latest_answer === undefined) {
        return '';
    }

    const num_answers = latest_answer.answers.length;
    const consensus = latest_answer.consensus;

    return `${num_answers}/${provider_config.urls.length} consensus ${consensus === true ? 'reached' : 'not reached'}`;
}

function get_time_string(time: bigint | undefined | null): string {
    if (time === undefined || time === null) {
        return '';
    }

    return convert_nanoseconds_to_date(time);
}

function get_href(suffix: string): string {
    return `https://data.chain.link/ethereum/mainnet/crypto-usd/${suffix}`;
}

function get_heartbeat_interval_string(heartbeat_minutes: bigint | undefined): string {
    if (heartbeat_minutes === undefined) {
        return '';
    }

    return `every ${heartbeat_minutes} minute${heartbeat_minutes === 1n ? '' : 's'}`;
}
