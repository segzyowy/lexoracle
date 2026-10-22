# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import typing

class LexOracle(gl.Contract):
    markets_count: u32
    markets_store: str
    last_verdict: str

    def __init__(self):
        self.markets_count = u32(0)
        self.markets_store = "{}"
        self.last_verdict = "PENDING"

    @gl.public.write
    def create_market(self, question: str, resolution_url: str, resolution_criteria: str) -> u32:
        current_id: u32 = self.markets_count
        self.markets_count = current_id + u32(1)
        return current_id

    @gl.public.write
    def bet(self, market_id: u32, choice: str, amount: u32) -> None:
        pass

    @gl.public.write
    def resolve_market(self, resolution_url: str, criteria: str) -> typing.Any:
        def get_evidence() -> str:
            res = gl.nondet.web.get(resolution_url)
            return res.body.decode("utf-8")[:1500]

        salute = gl.eq_principle.prompt_non_comparative(
            get_evidence,
            task=f"Evaluate the web evidence against this criteria: {criteria}. State YES, NO, or INVALID with reason.",
            criteria="The response clearly determines whether the criteria is met based on the text.",
        )
        self.last_verdict = salute

    @gl.public.write
    def claim(self, market_id: u32) -> u32:
        return u32(0)

    @gl.public.view
    def get_market_count(self) -> u32:
        return self.markets_count

    @gl.public.view
    def get_last_verdict(self) -> str:
        return self.last_verdict
