import {
    Account,
    Address,
    Contract,
    rpc,
    scValToNative,
    TransactionBuilder
} from '@stellar/stellar-sdk';

class PoolMonitor {
    constructor() {
        // Pool and token addresses
        this.poolId = "CAS3FL6TLZKDGGSISDBWGGPXT3NRR4DYTZD7YOD3HMYO6LTJUVGRVEAM";
        this.blndAddress = "CD25MNVTZDL4Y3XBCPCJXGXATV5WUHHOWMYFF4YBEGU5FCPGMYTVG5JY";
        this.usdcAddress = "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75";

        // Network configuration
        this.network = {
            rpc: "https://soroban-testnet.stellar.org",
            passphrase: "Test SDF Network ; September 2015",
            opts: { allowHttp: true }
        };

        this.lastLedgerSequence = null;
    }

    async getLatestLedger() {
        console.log("\nFetching latest ledger...");
        try {
            const response = await fetch(this.network.rpc, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: 8675309,
                    method: "getLatestLedger"
                })
            });

            const data = await response.json();
            console.log("Ledger Response:", JSON.stringify(data, null, 2));
            return data.result;
        } catch (error) {
            console.error("Error fetching ledger:", error);
            return null;
        }
    }

    async getTokenBalance(token_id, address) {
        try {
            // Using the provided getTokenBalance function logic
            const account = new Account('GANXGJV2RNOFMOSQ2DTI3RKDBAVERXUVFC27KW3RLVQCLB3RYNO3AAI4', '123');
            const tx_builder = new TransactionBuilder(account, {
                fee: '1000',
                timebounds: { minTime: 0, maxTime: 0 },
                networkPassphrase: this.network.passphrase,
            });
            
            tx_builder.addOperation(new Contract(token_id).call('balance', address.toScVal()));
            const stellarRpc = new rpc.Server(this.network.rpc, this.network.opts);
            const scval_result = await stellarRpc.simulateTransaction(tx_builder.build());
            
            if (scval_result == undefined) {
                throw Error(`unable to fetch balance for token: ${token_id}`);
            }
            
            if (rpc.Api.isSimulationSuccess(scval_result)) {
                return scValToNative(scval_result.result.retval);
            } else {
                throw Error(`unable to fetch balance for token: ${token_id}`);
            }
        } catch (error) {
            console.error(`Error getting balance for ${token_id}:`, error);
            throw error;
        }
    }

    async getPoolBalances() {
        console.log("\nFetching pool balances...");
        try {
            const poolAddress = Address.fromString(this.poolId);
            console.log("Pool Address:", this.poolId);

            console.log("Fetching BLND balance...");
            const blndBalance = await this.getTokenBalance(this.blndAddress, poolAddress);
            console.log("BLND Balance:", blndBalance.toString());

            console.log("\nFetching USDC balance...");
            const usdcBalance = await this.getTokenBalance(this.usdcAddress, poolAddress);
            console.log("USDC Balance:", usdcBalance.toString());

            return {
                blnd: blndBalance,
                usdc: usdcBalance,
                timestamp: new Date()
            };
        } catch (error) {
            console.error("Error fetching balances:", error);
            console.error("Full error:", JSON.stringify(error, null, 2));
            return null;
        }
    }

    async processLedgerUpdate(ledger) {
        console.log("\nProcessing ledger update...");
        console.log("Current ledger sequence:", ledger.sequence);
        console.log("Last processed sequence:", this.lastLedgerSequence);

        if (this.lastLedgerSequence !== ledger.sequence) {
            console.log(`New ledger detected: ${ledger.sequence}`);
            
            const balances = await this.getPoolBalances();
            if (balances) {
                const price = Number(balances.usdc) / Number(balances.blnd);
                
                console.log("\nPool State Update:");
                console.log("Timestamp:", balances.timestamp);
                console.log("Ledger Sequence:", ledger.sequence);
                console.log(`BLND Balance: ${balances.blnd.toString()}`);
                console.log(`USDC Balance: ${balances.usdc.toString()}`);
                console.log(`Price (USDC/BLND): ${price.toFixed(6)}`);

                this.lastLedgerSequence = ledger.sequence;
            } else {
                console.log("Failed to fetch balances");
            }
        } else {
            console.log("No new ledger detected");
        }
    }

    async startMonitoring(pollInterval = 5000) {
        console.log("\n=== Starting Pool Monitor ===");
        console.log("Network RPC:", this.network.rpc);
        console.log("Pool ID:", this.poolId);
        console.log("BLND Address:", this.blndAddress);
        console.log("USDC Address:", this.usdcAddress);
        console.log("Poll Interval:", pollInterval, "ms");
        
        const initialLedger = await this.getLatestLedger();
        if (initialLedger) {
            await this.processLedgerUpdate(initialLedger);
        } else {
            console.log("Failed to get initial ledger");
        }

        setInterval(async () => {
            console.log("\n--- Polling Update ---");
            const ledger = await this.getLatestLedger();
            if (ledger) {
                await this.processLedgerUpdate(ledger);
            } else {
                console.log("Failed to get ledger update");
            }
        }, pollInterval);
    }
}

// Create and start monitor
console.log("Initializing Pool Monitor...");
const monitor = new PoolMonitor();

// Start monitoring
monitor.startMonitoring(5000)
    .then(() => {
        console.log("\nMonitor started successfully");
    })
    .catch((error) => {
        console.error("\nError starting monitor:", error);
        console.error("Full error:", JSON.stringify(error, null, 2));
    });

// Keep process running
process.on('exit', () => {
    console.log('Monitor stopping...');
});
