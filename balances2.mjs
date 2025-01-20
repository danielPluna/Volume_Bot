import {
    Account,
    Address,
    Contract,
    rpc,
    scValToNative,
    TransactionBuilder,
} from '@stellar/stellar-sdk';

const CONTRACT_ID = "CAS3FL6TLZKDGGSISDBWGGPXT3NRR4DYTZD7YOD3HMYO6LTJUVGRVEAM";
const BLND_ADDRESS = "CD25MNVTZDL4Y3XBCPCJXGXATV5WUHHOWMYFF4YBEGU5FCPGMYTVG5JY";
const USDC_ADDRESS = "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75";
const SOROBAN_RPC_URL = "https://rpc-futurenet.stellar.org:443";
const NETWORK_PASSPHRASE = "Public Global Stellar Network ; September 2015";

class Network {
    constructor() {
        this.rpc = SOROBAN_RPC_URL;
        this.passphrase = NETWORK_PASSPHRASE;
        this.opts = {
            allowHttp: false,
            timeout: 30000
        };
    }
}

async function getTokenBalance(tokenAddress) {
    try {
        const network = new Network();
        
        // Using a dummy account since it's not validated during simulation
        const account = new Account('GANXGJV2RNOFMOSQ2DTI3RKDBAVERXUVFC27KW3RLVQCLB3RYNO3AAI4', '123');
        
        const tx_builder = new TransactionBuilder(account, {
            fee: '1000',
            timebounds: { minTime: 0, maxTime: 0 },
            networkPassphrase: network.passphrase,
        });

        const address = new Address(tokenAddress);
        tx_builder.addOperation(new Contract(CONTRACT_ID).call('balance', address.toScVal()));
        
        const stellarRpc = new rpc.Server(network.rpc, network.opts);
        const scval_result = await stellarRpc.simulateTransaction(tx_builder.build());
        
        if (!scval_result || !rpc.Api.isSimulationSuccess(scval_result)) {
            throw Error(`Unable to fetch balance for token: ${tokenAddress}`);
        }
        
        return scValToNative(scval_result.result.retval);
    } catch (error) {
        console.error(`Error fetching balance for token ${tokenAddress}:`, error);
        throw error;
    }
}

async function getCAS3Balances() {
    console.log("Fetching CAS3 token balances...");
    
    try {
        const blndBalance = await getTokenBalance(BLND_ADDRESS);
        const usdcBalance = await getTokenBalance(USDC_ADDRESS);
        
        return {
            BLND: blndBalance.toString(),
            USDC: usdcBalance.toString()
        };
    } catch (error) {
        console.error("Error fetching balances:", error);
        throw error;
    }
}

// Add type: module to package.json
const packageJson = {
    "type": "module"
};

// Fetch the balances
getCAS3Balances()
    .then(balances => {
        console.log("CAS3 Contract Balances:");
        console.log("BLND:", balances.BLND);
        console.log("USDC:", balances.USDC);
    })
    .catch(error => {
        console.error("Failed to fetch balances:", error);
    });