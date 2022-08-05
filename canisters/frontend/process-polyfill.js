const production = window.location.hostname.endsWith('ic0.app') ? true : false;

window.process = {
    env: {
        DATA_FEEDS_CANISTER_ID:
            production === true
                ? ''
                : 'rrkah-fqaaa-aaaaa-aaaaq-cai'
    }
};
