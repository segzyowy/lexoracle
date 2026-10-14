import { readFileSync } from "fs";
import path from "path";
import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

export default async function deploy() {
  console.log("Reading contract.py...");
  const contractCode = readFileSync(path.resolve(__dirname, "./contract.py"), "utf-8");

  const client = createClient({
    chain: testnetBradbury,
  });

  console.log("Submitting deployment to GenLayer Testnet Bradbury...");
  const txHash = await client.deployContract({
    code: contractCode,
    args: [],
  });

  console.log(`Deployment transaction submitted: ${txHash}`);
  const receipt = await client.waitForTransactionReceipt({ hash: txHash });
  console.log(`LexOracle deployed successfully at address: ${receipt.contractAddress}`);
  return receipt.contractAddress;
}
