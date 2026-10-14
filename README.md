# LexOracle: Zero-Oracle Arbitrary Prediction Markets

A complete, end-to-end GenLayer application built for the **Projects** category.

LexOracle enables decentralized prediction markets on arbitrary real-world events without relying on specialized oracles (such as UMA or Chainlink). Markets resolve autonomously through GenLayer's **native web-scraping** (`gl.get_webpage`) and **in-contract LLM subjective consensus** (`gl.exec_prompt`).

---

## 1. Project Architecture

### A. Intelligent Contract (`contract.py`)
- **Runtime:** GenLayer Python SDK.
- **State Management:**
  - `self.market_counter`: Unique incremental identifier for created markets.
  - `self.markets`: Persistent array of market structs storing question metadata, data source URLs, natural language resolution criteria, pools, and resolution status.
- **Core Methods:**
  - `create_market(question, resolution_url, resolution_criteria)`: Registers a new market with target data source and plain-English criteria.
  - `bet(market_id, choice)`: Accepts deposits in GEN tokens and manages liquidity ratios between `YES` and `NO` pools.
  - `resolve_market(market_id)`:
    1. Triggers validator web fetching via `gl.get_webpage(resolution_url)`.
    2. Runs an unbiased settlement prompt across validators via `gl.exec_prompt()`.
    3. Reaches consensus under GenLayer's Optimistic Democracy principle.
    4. Records the outcome (`YES`, `NO`, or `INVALID`) and reason on-chain.
  - `claim(market_id)`: Distributes pro-rata winnings or handles refunds if marked invalid.

### B. Application Frontend (`index.html` & `app.js`)
- Modern, responsive web interface built with Tailwind CSS.
- Real-time pool distribution visualization (YES/NO percentages).
- Market creation modal allowing users to supply custom URLs and LLM criteria.
- Bet placement interface.
- One-click trigger for contract settlement and validator reasoning display.

---

## 2. Why GenLayer is Central to LexOracle

Traditional smart contracts (like EVM or Solana) are fundamentally sandboxed from the outside internet:
- On Ethereum, settling a prediction market requires a specialized oracle feed or complex dispute escalation protocols that can take days.
- If a long-tail market (e.g. local municipal election or niche spaceflight test) has no dedicated price feed, it cannot exist.

With GenLayer:
1. **Any credible URL is an oracle:** Contracts scrape live web pages directly via `gl.get_webpage()`.
2. **Subjective understanding:** Natural language rules are evaluated via `gl.exec_prompt()` by consensus nodes, turning unstructured web pages into deterministic on-chain outcomes.

---

## 3. Running & Testing Locally

1. **Live Preview:**
   - Open `index.html` directly in the browser workspace preview.
   - You can create new markets, place bets, and click **Settle** to simulate GenLayer validator web crawling and LLM resolution.

2. **Deploying the Intelligent Contract:**
   - Deploy `contract.py` using the GenLayer CLI or the GenLayer Studio:
   ```bash
   genlayer deploy contract.py --args '[]'
   ```
