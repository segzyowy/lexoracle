// LexOracle Frontend Application Logic
// Guaranteed Rabby Wallet Connection & Direct Signature Popup

let userAccount = null;
let selectedMarketId = null;
let currentChoice = "YES";

const CONTRACT_ADDRESS = "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7";

// Helper to convert string to 0x-prefixed hex for Rabby/MetaMask personal_sign
function toHex(str) {
  let hex = "";
  for (let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16).padStart(2, "0");
  }
  return "0x" + hex;
}

// Helper to detect Rabby or standard EVM provider
function getProvider() {
  if (window.rabby) return window.rabby;
  if (window.ethereum) {
    if (window.ethereum.providers?.length) {
      const r = window.ethereum.providers.find(p => p.isRabby);
      if (r) return r;
    }
    return window.ethereum;
  }
  return null;
}

// 1. DIRECT CONNECT FUNCTION
async function connectWalletNow() {
  const provider = getProvider();
  if (!provider) {
    alert("No Web3 wallet detected! Please install Rabby Wallet (https://rabby.io).");
    return;
  }

  try {
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    if (!accounts || accounts.length === 0) {
      alert("No accounts selected in Rabby.");
      return;
    }
    userAccount = accounts[0];
    updateUI();
    alert("Wallet Connected: " + userAccount);
  } catch (err) {
    console.error("Connect error:", err);
    alert("Connection error: " + (err.message || JSON.stringify(err)));
  }
}

// 2. GUARANTEED POPUP TEST SIGN
async function triggerDirectSign(customMsg) {
  const provider = getProvider();
  if (!provider) {
    alert("Please install Rabby Wallet first!");
    return;
  }

  try {
    // If not connected yet, request account immediately
    if (!userAccount) {
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      userAccount = accounts[0];
      updateUI();
    }

    const messageText = customMsg || `LexOracle Action\nAccount: ${userAccount}\nTimestamp: ${new Date().toISOString()}`;
    const hexMessage = toHex(messageText);

    // personal_sign expects [hexMessage, userAccount]
    const signature = await provider.request({
      method: "personal_sign",
      params: [hexMessage, userAccount]
    });

    alert("SUCCESS! Signature received from Rabby:\n\n" + signature);
    return signature;
  } catch (err) {
    console.error("Sign error:", err);
    alert("Rabby signature popup closed or rejected: " + (err.message || err));
    return null;
  }
}

function updateUI() {
  const btn = document.getElementById("walletText");
  const signBar = document.getElementById("testSignBtn");
  if (userAccount) {
    if (btn) btn.innerText = userAccount.slice(0, 6) + "..." + userAccount.slice(-4);
    if (signBar) signBar.classList.remove("hidden");
  } else {
    if (btn) btn.innerText = "Connect Rabby / Wallet";
    if (signBar) signBar.classList.add("hidden");
  }
}

// Seed markets
let markets = [
  {
    id: 0,
    creator: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    question: "Will the US Federal Reserve announce an interest rate cut at their next FOMC meeting?",
    resolution_url: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    resolution_criteria: "Resolve YES if official FOMC press statement confirms any reduction in the federal funds rate target range. Otherwise NO.",
    resolved: false,
    outcome: "PENDING",
    yes_pool: 6400,
    no_pool: 4100,
    verdict_reasoning: ""
  },
  {
    id: 1,
    creator: "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7",
    question: "Did SpaceX successfully recover the Super Heavy booster via the launch tower arms?",
    resolution_url: "https://spaceflightnow.com/2024/starship-flight-test",
    resolution_criteria: "Resolve YES if the booster was caught mid-air by the tower 'chopsticks' without structural failure.",
    resolved: true,
    outcome: "YES",
    yes_pool: 9800,
    no_pool: 1200,
    verdict_reasoning: "Validators independently fetched spaceflightnow article and confirmed booster was caught intact by tower arms."
  }
];

function renderMarkets() {
  const container = document.getElementById("marketsList");
  if (!container) return;
  container.innerHTML = "";

  markets.forEach(m => {
    const total = m.yes_pool + m.no_pool;
    const yesPct = total > 0 ? Math.round((m.yes_pool / total) * 100) : 50;
    const noPct = total > 0 ? (100 - yesPct) : 50;

    const card = document.createElement("div");
    card.className = "glass-card rounded-2xl p-5 flex flex-col justify-between border border-slate-800/80";
    card.innerHTML = `
      <div>
        <div class="flex justify-between items-center mb-3">
          <span class="text-xs mono text-s
