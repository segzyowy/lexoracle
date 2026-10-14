# venv: glenv
"""
LexOracle - Autonomous, Oracle-Free Prediction Markets on GenLayer

Leverages GenLayer's native web access and in-contract LLM execution
to settle arbitrary prediction markets without third-party oracles (like UMA or Chainlink).
"""

from genlayer import *
import json

class LexOracle:
    def __init__(self):
        self.market_counter: u256 = 0
        # market_id -> Market data
        self.markets = DynArray[dict]()

    @view
    def get_market_count(self) -> u256:
        return self.market_counter

    @view
    def get_market(self, market_id: u256) -> dict:
        if market_id >= self.market_counter:
            raise Exception("Market does not exist")
        return self.markets[market_id]

    def create_market(
        self,
        question: str,
        resolution_url: str,
        resolution_criteria: str
    ) -> u256:
        """
        Creates a new prediction market.
        - question: The binary question (e.g., 'Did SpaceX Starship complete a soft splashdown?')
        - resolution_url: The primary URL or news feed to verify the result
        - resolution_criteria: Specific plain-text guidelines for LLM evaluation
        """
        market_id = self.market_counter
        self.market_counter += 1

        new_market = {
            "id": market_id,
            "creator": gl.message.sender.to_hex(),
            "question": question,
            "resolution_url": resolution_url,
            "resolution_criteria": resolution_criteria,
            "resolved": False,
            "outcome": "PENDING", # PENDING, YES, NO, INVALID
            "yes_pool": 0,
            "no_pool": 0,
            "bets": {}, # address -> {"choice": "YES"|"NO", "amount": int, "claimed": bool}
            "verdict_reasoning": ""
        }

        self.markets.append(new_market)
        return market_id

    def bet(self, market_id: u256, choice: str) -> None:
        """
        Place a bet on YES or NO. In a real GenLayer contract, gl.message.value represents deposited funds.
        """
        if market_id >= self.market_counter:
            raise Exception("Market not found")
        
        market = self.markets[market_id]
        if market["resolved"]:
            raise Exception("Market has already been resolved")
            
        choice = choice.upper()
        if choice not in ["YES", "NO"]:
            raise Exception("Choice must be YES or NO")

        # Amount staked with message
        amount = gl.message.value
        if amount <= 0:
            raise Exception("Bet amount must be greater than 0")

        sender = gl.message.sender.to_hex()
        
        if sender in market["bets"]:
            existing_bet = market["bets"][sender]
            if existing_bet["choice"] != choice:
                raise Exception("Cannot hedge bet against yourself in the same market")
            existing_bet["amount"] += amount
        else:
            market["bets"][sender] = {
                "choice": choice,
                "amount": amount,
                "claimed": False
            }

        if choice == "YES":
            market["yes_pool"] += amount
        else:
            market["no_pool"] += amount

        self.markets[market_id] = market

    def resolve_market(self, market_id: u256) -> str:
        """
        The Intelligent Contract core:
        Fetches the resolution URL via GenLayer validators and prompts the in-contract LLM
        to analyze the web content against the resolution criteria.
        """
        if market_id >= self.market_counter:
            raise Exception("Market not found")

        market = self.markets[market_id]
        if market["resolved"]:
            raise Exception("Market already resolved")

        # Step 1: GenLayer native web scraping
        # Validators independently fetch the webpage content
        try:
            page_content = gl.get_webpage(market["resolution_url"])
        except Exception as e:
            page_content = f"Error fetching URL: {str(e)}"

        # Step 2: In-contract prompt execution across validators
        prompt = f"""
You are an unbiased prediction market settlement judge running inside a GenLayer Intelligent Contract.
Analyze the provided web content to settle the market question accurately.

Question: {market["question"]}
Resolution Criteria: {market["resolution_criteria"]}
Source URL: {market["resolution_url"]}

Webpage Content Snippet:
{page_content[:4000]}

Respond strictly with a JSON object in this exact schema:
{{
  "outcome": "YES" | "NO" | "INVALID",
  "reasoning": "Clear concise explanation of the verdict based solely on the text provided."
}}
Return ONLY valid JSON, no backticks, no preamble.
"""
        
        # Execute prompt on GenLayer consensus
        response_text = gl.exec_prompt(prompt)
        
        # Step 3: Parse decision & record on-chain
        try:
            data = json.loads(response_text.strip())
            verdict = data.get("outcome", "INVALID").upper()
            reasoning = data.get("reasoning", "No detailed reasoning provided.")
            if verdict not in ["YES", "NO", "INVALID"]:
                verdict = "INVALID"
        except Exception:
            verdict = "INVALID"
            reasoning = "Failed to parse consensus JSON output."

        market["resolved"] = True
        market["outcome"] = verdict
        market["verdict_reasoning"] = reasoning
        self.markets[market_id] = market

        return verdict

    def claim(self, market_id: u256) -> u256:
        """
        Claim winning payouts based on pooled staking ratios.
        """
        if market_id >= self.market_counter:
            raise Exception("Market not found")

        market = self.markets[market_id]
        if not market["resolved"]:
            raise Exception("Market has not yet been resolved")

        sender = gl.message.sender.to_hex()
        if sender not in market["bets"]:
            raise Exception("No bets placed for this address")

        user_bet = market["bets"][sender]
        if user_bet["claimed"]:
            raise Exception("Payout already claimed")

        total_pool = market["yes_pool"] + market["no_pool"]
        payout = 0

        if market["outcome"] == "INVALID":
            # Refund original stake on invalid resolutions
            payout = user_bet["amount"]
        elif market["outcome"] == user_bet["choice"]:
            winning_pool = market["yes_pool"] if market["outcome"] == "YES" else market["no_pool"]
            if winning_pool > 0:
                # Pro-rata distribution of total pool
                payout = (user_bet["amount"] * total_pool) // winning_pool
        else:
            raise Exception("User bet did not win")

        user_bet["claimed"] = True
        self.markets[market_id] = market

        # Transfer funds to winner
        gl.send(gl.message.sender, payout)
        return payout
