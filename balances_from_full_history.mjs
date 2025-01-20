const CONTRACT_ID = "CAS3FL6TLZKDGGSISDBWGGPXT3NRR4DYTZD7YOD3HMYO6LTJUVGRVEAM";
const HORIZON_URL = "https://horizon.stellar.org";
const BLND_ADDRESS = "CD25MNVTZDL4Y3XBCPCJXGXATV5WUHHOWMYFF4YBEGU5FCPGMYTVG5JY";
const USDC_ADDRESS = "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75";

async function getAllOperations(cursor = null) {
    const operations = [];
    let currentCursor = cursor;
    
    while (true) {
        const params = new URLSearchParams({
            limit: 200,
            order: 'desc',
            include_failed: false,
            account: CONTRACT_ID
        });
        
        if (currentCursor) {
            params.append('cursor', currentCursor);
        }
        
        const response = await fetch(`${HORIZON_URL}/operations?${params}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        operations.push(...data._embedded.records);
        
        // Check if we have more records
        if (!data._links.next.href) {
            break;
        }
        
        currentCursor = data._embedded.records[data._embedded.records.length - 1].paging_token;
    }
    
    return operations;
}

function getTokenType(address) {
    switch (address) {
        case BLND_ADDRESS:
            return 'BLND';
        case USDC_ADDRESS:
            return 'USDC';
        default:
            return null;
    }
}

function processOperations(operations) {
    // Group operations by day and token
    const dailyTokenAmounts = new Map();
    
    operations.forEach(op => {
        const date = new Date(op.created_at);
        const day = date.toISOString().split('T')[0];
        
        // Process deposits
        if (op.token_deposited_address) {
            const token = getTokenType(op.token_deposited_address);
            if (token && op.deposit_amount) {
                const key = `${day}-${token}`;
                if (!dailyTokenAmounts.has(key)) {
                    dailyTokenAmounts.set(key, { deposits: 0, withdrawals: 0 });
                }
                dailyTokenAmounts.get(key).deposits += parseFloat(op.deposit_amount);
            }
        }
        
        // Process withdrawals
        if (op.token_withdrawn_address) {
            const token = getTokenType(op.token_withdrawn_address);
            if (token && op.withdraw_amount) {
                const key = `${day}-${token}`;
                if (!dailyTokenAmounts.has(key)) {
                    dailyTokenAmounts.set(key, { deposits: 0, withdrawals: 0 });
                }
                dailyTokenAmounts.get(key).withdrawals += parseFloat(op.withdraw_amount);
            }
        }
    });
    
    return dailyTokenAmounts;
}

function calculateWeeklyFlows(dailyTokenAmounts) {
    const weeklyFlows = new Map();
    
    // Convert daily amounts to weekly
    for (const [key, amounts] of dailyTokenAmounts) {
        const [dateStr, token] = key.split('-');
        const date = new Date(dateStr);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Set to start of week
        const weekKey = `${weekStart.toISOString().split('T')[0]}-${token}`;
        
        if (!weeklyFlows.has(weekKey)) {
            weeklyFlows.set(weekKey, { delta: 0 });
        }
        
        weeklyFlows.get(weekKey).delta += amounts.deposits - amounts.withdrawals;
    }
    
    return weeklyFlows;
}

function calculateCumulativeFlows(weeklyFlows) {
    const cumulativeFlows = [];
    const tokens = ['BLND', 'USDC'];
    
    tokens.forEach(token => {
        let cumulative = 0;
        const tokenFlows = Array.from(weeklyFlows.entries())
            .filter(([key]) => key.endsWith(token))
            .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
        
        tokenFlows.forEach(([key, value]) => {
            cumulative += value.delta;
            cumulativeFlows.push({
                week_start_day: key.split('-')[0],
                token: token,
                cumulative_weekly_delta: cumulative
            });
        });
    });
    
    return cumulativeFlows.sort((a, b) => a.week_start_day.localeCompare(b.week_start_day));
}

async function getContractHistory() {
    console.log("Fetching contract history...");
    
    try {
        const operations = await getAllOperations();
        const dailyAmounts = processOperations(operations);
        const weeklyFlows = calculateWeeklyFlows(dailyAmounts);
        const cumulativeFlows = calculateCumulativeFlows(weeklyFlows);
        
        console.log("Cumulative weekly flows:", JSON.stringify(cumulativeFlows, null, 2));
        return cumulativeFlows;
        
    } catch (error) {
        console.error("Error processing contract history:", error);
        throw error;
    }
}

// Run the analysis
console.log("Starting history analysis...");
getContractHistory()
    .then(() => console.log("\nAnalysis complete"))
    .catch(error => console.log("\nAnalysis failed:", error));