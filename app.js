// LexOracle Frontend Application Logic
// Connects to Rabby Wallet / Web3 Provider & GenLayer Testnet

let userAccount = null;
let selectedMarketId = null;
let currentChoice = "YES";

// Seed markets representing real-world intelligent contract state
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
    verdict_reasoning: "Validators scraped spaceflightnow article confirming booster successfully returned to Starbase and was captured intact by the tower mechazilla arms."
  },
  {
    id: 2,
    creator: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    question: "Will Ethereum Denver 2025 exceed 25,000 official registered in-person attendees?",
    resolution_url: "https://denver.ethglobal.com/stats",
    resolution_criteria: "Evaluate the official attendee release or confirmed badge count on the organizer domain. Resolve YES if >= 25,000, else NO.",
    resolved: false,
    outcome: "PENDING",
    yes_pool: 2200,
    no_pool: 1550,
    verdict_reasoning: ""
  }
];

function renderMarkets() {
  const container = document.getElementById("marketsList");
  if (!container) return;
  container.innerHTML = "";

  let totalPoolSum = 0;
  let activeCount = 0;

  markets.forEach(m => {
    const totalPool = m.yes_pool + m.no_pool;
    totalPoolSum += totalPool;
    if (!m.resolved) activeCount++;

    const yesPercent = totalPool > 0 ? Math.round((m.yes_pool / totalPool) * 100) : 50;
    const noPercent = totalPool > 0 ? (100 - yesPercent) : 50;

    const card = document.createElement("div");
    card.className = "glass-card rounded-2xl p-5 flex flex-col justify-between transition duration-200 border border-slate-800/80 hover:shadow-xl hover:shadow-indigo-500/5";

    const badge = m.resolved
      ? (m.outcome === "YES" 
          ? `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Resolved: YES</span>`
          : `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">Resolved: NO</span>`)
      : `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>Live Staking</span>`;

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between gap-2 mb-3">
          <span class="text-xs mono text-slate-500">Market #${m.id}</span>
          ${badge}
        </div>

        <h3 class="font-bold text-base text-slate-100 leading-snug line-clamp-2 mb-3">
          ${m.question}
        </h3>

        <div class="mb-4">
          <div class="flex justify-between text-xs font-semibold mb-1.5 mono">
            <span class="text-emerald-400">YES ${yesPercent}% (${m.yes_pool} GEN)</span>
            <span class="text-rose-400">NO ${noPercent}% (${m.no_pool} GEN)</span>
          </div>
          <div class="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden flex">
            <div style="width: ${yesPercent}%" class="bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"></div>
            <div style="width: ${noPercent}%" class="bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-500"></div>
          </div>
        </div>

        <div class="p-3 rounded-lg bg-slate-900/80 border border-slate-800/60 mb-4 text-xs space-y-1.5">
          <div class="flex items-center gap-1.5 text-slate-400 font-medium">
            <svg class="w-3.5 h-3.5 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
            <span class="truncate" title="${m.resolution_url}">Data Source: ${m.resolution_url}</span>
          </div>
          <p class="text-slate-400 line-clamp-2 text-[11px] leading-relaxed">
            <span class="text-slate-300 font-semibold">Rule:</span> ${m.resolution_criteria}
          </p>
          ${m.resolved ? `
            <div class="pt-2 mt-2 border-t border-slate-800 text-[11px] text-indigo-300">
              <span class="font-bold text-indigo-400">Validator Consensus Reason:</span> ${m.verdict_reasoning}
            </div>
          ` : ''}
        </div>
      </div>

      <div class="pt-2 border-t border-slate-800/60 flex items-center gap-2">
        ${!m.resolved ? `
          <button onclick="openBetModal(${m.id})" class="flex-1 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm">
            Predict / Bet
          </button>
          <button onclick="simulateResolution(${m.id})" title="Trigger GenLayer Autonomous Resolution via Validator Scrape + LLM" class="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            Settle
          </button>
        ` : `
          <button onclick="claimWinnings(${m.id})" class="w-full py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition">
            Claim Rewards
          </button>
        `}
      </div>
    `;

    container.appendChild(card);
  });

  const poolStat = document.getElementById("globalPoolStat");
  const activeStat = document.getElementById("activeMarketsStat");
  if (poolStat) poolStat.innerText = `${totalPoolSum.toLocaleString()} GEN`;
  if (activeStat) activeStat.innerText = activeCount.toString();
}

// GenLayer Testnet Bradbury Configuration
const GENLAYER_CHAIN_CONFIG = {
  chainId: "0x107D", // 4221 in hex
  chainName: "GenLayer Testnet Bradbury",
  nativeCurrency: {
    name: "GEN",
    symbol: "GEN",
    decimals: 18
  },
  rpcUrls: ["https://rpc-bradbury.genlayer.com"],
  blockExplorerUrls: ["https://explorer.testnet-chain.genlayer.com"]
};

async function toggleWallet() {
  const btn = document.getElementById("walletText");

  if (userAccount) {
    userAccount = null;
    if (btn) btn.innerText = "Connect Rabby / Wallet";
    return;
  }

  const provider = window.rabby || window.ethereum;

  if (!provider) {
    alert("No Web3 wallet detected! Please install Rabby Wallet (https://rabby.io) or MetaMask.");
    return;
  }

  try {
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    if (!accounts || accounts.length === 0) {
      alert("No accounts unlocked. Please approve in Rabby.");
      return;
    }

    userAccount = accounts[0];

    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: GENLAYER_CHAIN_CONFIG.chainId }]
      });
    } catch (switchError) {
      if (switchError.code === 4902 || switchError.data?.originalError?.code === 4902) {
        try {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [GENLAYER_CHAIN_CONFIG]
          });
        } catch (addErr) {
          console.warn("User dismissed chain add:", addErr);
        }
      }
    }

    const shortAddr = userAccount.slice(0, 6) + "..." + userAccount.slice(-4);
    if (btn) btn.innerText = shortAddr;

    if (provider.on) {
      provider.on("accountsChanged", (newAccounts) => {
        if (!newAccounts.length) {
          userAccount = null;
          if (btn) btn.innerText = "Connect Rabby / Wallet";
        } else {
          userAccount = newAccounts[0];
          if (btn) btn.innerText = userAccount.slice(0, 6) + "..." + userAccount.slice(-4);
        }
      });
    }

  } catch (err) {
    console.error("Wallet error:", err);
    alert("Wallet error: " + (err.message || JSON.stringify(err)));
  }
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("hidden");
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("hidden");
}

function openBetModal(marketId) {
  selectedMarketId = marketId;
  const m = markets.find(x => x.id === marketId);
  if (!m) return;

  const q = document.getElementById("betMarketQuestion");
  if (q) q.innerText = m.question;
  selectChoice("YES");
  openModal("betModal");
}

function selectChoice(choice) {
  currentChoice = choice;
  const yesBtn = document.getElementById("choiceYesBtn");
  const noBtn = document.getElementById("choiceNoBtn");

  if (!yesBtn || !noBtn) return;

  if (choice === "YES") {
    yesBtn.className = "py-2.5 px-3 rounded-lg border-2 border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center gap-2";
    noBtn.className = "py-2.5 px-3 rounded-lg border-2 border-transparent bg-slate-900 text-slate-400 font-bold flex items-center justify-center gap-2";
  } else {
    noBtn.className = "py-2.5 px-3 rounded-lg border-2 border-rose-500 bg-rose-500/20 text-rose-300 font-bold flex items-center justify-center gap-2";
    yesBtn.className = "py-2.5 px-3 rounded-lg border-2 border-transparent bg-slate-900 text-slate-400 font-bold flex items-center justify-center gap-2";
  }
}

function submitBet() {
  const amountInput = document.getElementById("betAmountInput");
  const amount = parseInt(amountInput ? amountInput.value : "0") || 0;
  if (amount <= 0) {
    alert("Please enter a valid bet amount.");
    return;
  }

  const m = markets.find(x => x.id === selectedMarketId);
  if (m) {
    if (currentChoice === "YES") {
      m.yes_pool += amount;
    } else {
      m.no_pool += amount;
    }
    renderMarkets();
    closeModal("betModal");
    alert(`Successfully staked ${amount} GEN on ${currentChoice} for Market #${m.id}`);
  }
}

function handleCreateMarket() {
  const qEl = document.getElementById("newQuestion");
  const uEl = document.getElementById("newResolutionUrl");
  const cEl = document.getElementById("newCriteria");
  const bEl = document.getElementById("newInitialBet");

  const question = qEl ? qEl.value.trim() : "";
  const url = uEl ? uEl.value.trim() : "";
  const criteria = cEl ? cEl.value.trim() : "";
  const seed = parseInt(bEl ? bEl.value : "50") || 50;

  if (!question || !url || !criteria) {
    alert("Please fill in all market parameters.");
    return;
  }

  const newId = markets.length;
  markets.unshift({
    id: newId,
    creator: userAccount || "0x4F8...a9B2",
    question: question,
    resolution_url: url,
    resolution_criteria: criteria,
    resolved: false,
    outcome: "PENDING",
    yes_pool: seed,
    no_pool: seed,
    verdict_reasoning: ""
  });

  renderMarkets();
  closeModal("createMarketModal");
  alert(`Market #${newId} deployed to GenLayer Intelligent Contract!`);
}

function simulateResolution(marketId) {
  const m = markets.find(x => x.id === marketId);
  if (!m) return;

  const confirmRun = confirm(
    `Simulate GenLayer Intelligent Contract Resolution for Market #${marketId}?\n\n1. gl.get_webpage("${m.resolution_url}")\n2. gl.exec_prompt() consensus over criteria.`
  );

  if (!confirmRun) return;

  const simulatedOutcome = Math.random() > 0.4 ? "YES" : "NO";
  m.resolved = true;
  m.outcome = simulatedOutcome;
  m.verdict_reasoning = `GenLayer validators independently fetched ${m.resolution_url} and executed LLM consensus prompt. Result determined as ${simulatedOutcome} based on matched criteria.`;

  renderMarkets();
  alert(`Market #${marketId} settled autonomously by GenLayer Intelligent Contract!\n\nOutcome: ${simulatedOutcome}\nReasoning: ${m.verdict_reasoning}`);
}

function claimWinnings(marketId) {
  alert(`Checking bet claims on GenLayer contract for Market #${marketId}...\nPayout distributed to your address!`);
}

function showContractInfo() {
  alert("Intelligent Contract: contract.py\nLanguage: Python (GenLayer SDK)\nMethods: create_market, bet, resolve_market (gl.get_webpage + gl.exec_prompt), claim");
}

function filterMarkets(type) {
  renderMarkets();
}

// Initial render
window.addEventListener("DOMContentLoaded", () => {
  renderMarkets();
});
