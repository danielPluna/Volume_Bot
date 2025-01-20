async function fetchLatestLedger() {
    const requestBody = {
        "jsonrpc": "2.0",
        "id": 8675309,
        "method": "getLatestLedger"
    };

    try {
        const res = await fetch('https://soroban-testnet.stellar.org', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        const json = await res.json();
        console.log('Latest Ledger:', json);
        return json;
    } catch (error) {
        console.error('Error fetching latest ledger:', error);
    }
}

function startLedgerPolling() {
    // Initial fetch immediately
    fetchLatestLedger();

    // Set up interval to fetch every 5 seconds
    const intervalId = setInterval(fetchLatestLedger, 5000);

    // Optional: Return a function to stop polling if needed
    return () => clearInterval(intervalId);
}

// Start polling
const stopPolling = startLedgerPolling();

// If you want to stop polling after some time (optional)
// setTimeout(() => {
//     stopPolling();
//     console.log('Ledger polling stopped');
// }, 60000); // Stop after 1 minute, for example