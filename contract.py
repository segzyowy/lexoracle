# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json

class LexOracle(gl.Contract):
    """
    LexOracle: Zero-Oracle Prediction Market Intelligent Contract.
    Uses GenLayer non-deterministic web retrieval (gl.nondet.web.get) and
    LLM consensus (gl.nondet.exec_prompt) via gl.eq_principle.strict_eq.
    """

    markets_count: int
    markets_data: TreeMap[int, str]
    bets_data: TreeMap[str, str]

    def __init__(self):
        self.markets_count = 0

    @gl.public.write
    def create_market(self, question: str, resolution_url: str, resolution_criteria: str) -> int:
        market_id = self.markets_count
        self.markets_count += 1

        market_record = {
            "id": market_id,
            "creator": str(gl.message.sender),
            "question": question,
            "resolution_url": resolution_url,
            "resolution_criteria": resolution_criteria,
            "resolved": False,
            "outcome": "PENDING",
            "yes_pool": 0,
            "no_pool": 0,
            "verdict_reasoning": ""
        }

        self.markets_data[market_id] = json.dumps(market_record)
        return market_id

    @gl.public.write
    def bet(self, market_id: int, choice: str, amount: int) -> None:
        assert market_id < self.markets_count, "Market does not exist"
        assert choice in ["YES", "NO"], "Choice must be YES or NO"
        assert amount > 0, "Bet amount must be greater than 0"

        market = json.loads(self.markets_data[market_id])
        assert not market["resolved"], "Market already resolved"

        sender = str(gl.message.sender)
        user_key = f"{market_id}:{sender}"

        if user_key in self.bets_data:
            user_bet = json.loads(self.bets_data[user_key])
        else:
            user_bet = {"yes": 0, "no": 0, "claimed": False}

        if choice == "YES":
            market["yes_pool"] += amount
            user_bet["yes"] += amount
        else:
            market["no_pool"] += amount
            user_bet["no"] += amount

        self.markets_data[market_id] = json.dumps(market)
        self.bets_data[user_key] = json.dumps(user_bet)

    @gl.public.write
    def resolve_market(self, market_id: int) -> str:
        assert market_id < self.markets_count, "Market does not exist"

        market = json.loads(self.markets_data[market_id])
        assert not market["resolved"], "Market already resolved"

        url = market["resolution_url"]
        question = market["question"]
        criteria = market["resolution_criteria"]

        def evaluate_market_nondet() -> str:
            response = gl.nondet.web.get(url)
            webpage_text = response.body.decode("utf-8")[:3000]

            prompt = f"""
You are an impartial decentralized prediction market oracle.
Evaluate the outcome of the following market based strictly on the provided webpage content.

Market Question: {question}
Resolution Rule: {criteria}

Scraped Webpage Content:
\"\"\"{webpage_text}\"\"\"

Analyze the evidence and respond using ONLY this JSON format:
{{
  "verdict": "YES" | "NO" | "INVALID",
  "reasoning": "brief 1-2 sentence explanation"
}}
"""
            return gl.nondet.exec_prompt(prompt)

        raw_consensus_result = gl.eq_principle.strict_eq(evaluate_market_nondet)

        cleaned = raw_consensus_result.strip()
        if "```json" in cleaned:
            cleaned = cleaned.split("```json")[1].split("```")[0].strip()
        elif "```" in cleaned:
            cleaned = cleaned.split("```")[1].split("```")[0].strip()

        parsed = json.loads(cleaned)
        verdict = parsed.get("verdict", "INVALID")
        reasoning = parsed.get("reasoning", "Resolved by validator consensus.")

        market["resolved"] = True
        market["outcome"] = verdict
        market["verdict_reasoning"] = reasoning

        self.markets_data[market_id] = json.dumps(market)
        return verdict

    @gl.public.write
    def claim(self, market_id: int) -> int:
        assert market_id < self.markets_count, "Market does not exist"
        market = json.loads(self.markets_data[market_id])
        assert market["resolved"], "Market not resolved yet"

        sender = str(gl.message.sender)
        user_key = f"{market_id}:{sender}"
        assert user_key in self.bets_data, "No bet found for user"

        user_bet = json.loads(self.bets_data[user_key])
        assert not user_bet.get("claimed", False), "Already claimed"

        outcome = market["outcome"]
        total_pool = market["yes_pool"] + market["no_pool"]
        payout = 0

        if outcome == "YES" and market["yes_pool"] > 0:
            payout = int((user_bet["yes"] * total_pool) / market["yes_pool"])
        elif outcome == "NO" and market["no_pool"] > 0:
            payout = int((user_bet["no"] * total_pool) / market["no_pool"])
        elif outcome == "INVALID":
            payout = user_bet["yes"] + user_bet["no"]

        user_bet["claimed"] = True
        self.bets_data[user_key] = json.dumps(user_bet)
        return payout

    @gl.public.view
    def get_market(self, market_id: int) -> str:
        assert market_id < self.markets_count, "Market does not exist"
        return self.markets_data[market_id]

    @gl.public.view
    def get_market_count(self) -> int:
        return self.markets_count

    @gl.public.view
    def get_user_bet(self, market_id: int, user: str) -> str:
        key = f"{market_id}:{user}"
        if key in self.bets_data:
            return self.bets_data[key]
        return json.dumps({"yes": 0, "no": 0, "claimed": False})
