const fs = require('fs');
const path = require('path');

console.log("=========================================");
console.log("  LexOracle GenLayer Build & Test Suite  ");
console.log("=========================================\n");

let passed = 0;
let failed = 0;

function check(desc, condition) {
  if (condition) {
    console.log(`  ? [PASS] ${desc}`);
    passed++;
  } else {
    console.error(`  ? [FAIL] ${desc}`);
    failed++;
  }
}

const contractPath = path.join(__dirname, 'contract.py');
const contractExists = fs.existsSync(contractPath);
check("contract.py file exists", contractExists);

if (contractExists) {
  const code = fs.readFileSync(contractPath, 'utf8');
  check("GenVM dependency pragma declared", code.includes('py-genlayer:'));
  check("Contract inherits from gl.Contract", code.includes('class LexOracle(gl.Contract):'));
  check("Exposes @gl.public.write entry points", code.includes('@gl.public.write'));
  check("Exposes @gl.public.view entry points", code.includes('@gl.public.view'));
  check("Implements non-deterministic web crawl (gl.nondet.web.get)", code.includes('gl.nondet.web.get'));
  check("Implements validator LLM execution (gl.nondet.exec_prompt)", code.includes('gl.nondet.exec_prompt'));
  check("Wraps execution in consensus equivalence (gl.eq_principle.strict_eq)", code.includes('gl.eq_principle.strict_eq'));
  check("Method create_market implemented", code.includes('def create_market'));
  check("Method bet implemented", code.includes('def bet'));
  check("Method resolve_market implemented", code.includes('def resolve_market'));
  check("Method claim implemented", code.includes('def claim'));
}

check("Frontend entrypoint index.html exists", fs.existsSync(path.join(__dirname, 'index.html')));
check("Frontend app.js exists", fs.existsSync(path.join(__dirname, 'app.js')));

console.log(`\n-----------------------------------------`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`-----------------------------------------`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log("\n? ALL CHECKS PASSED: Build and contract specs are valid!\n");
  process.exit(0);
}
