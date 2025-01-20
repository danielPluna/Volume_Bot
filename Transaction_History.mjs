const CONTRACT_ID = "CAS3FL6TLZKDGGSISDBWGGPXT3NRR4DYTZD7YOD3HMYO6LTJUVGRVEAM";
const HORIZON_URL = "https://horizon.stellar.org";

async function getContractHistory() {
    console.log("Fetching contract history...");

    try {
        // Query the operations/transactions for this contract
        const response = await fetch(
            `${HORIZON_URL}/operations?` + 
            new URLSearchParams({
                limit: 10,
                order: 'desc',
                include_failed: false,
                // The exact parameters might need adjustment
                account: CONTRACT_ID
            })
        );

        if (!response.ok) {
            console.log("Response status:", response.status);
            console.log("Response headers:", Object.fromEntries(response.headers));
            const text = await response.text();
            console.log("Response text:", text.substring(0, 200));
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Contract history:", JSON.stringify(data, null, 2));

        return data;

    } catch (error) {
        console.error("Error fetching history:", error);
        console.log("Full error:", error);
    }
}

// Run the query
console.log("Starting history check...");
getContractHistory()
    .then(() => console.log("\nCheck complete"))
    .catch(error => console.log("\nCheck failed:", error));