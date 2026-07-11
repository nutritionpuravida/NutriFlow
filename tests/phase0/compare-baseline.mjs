import fs from 'node:fs/promises';
import path from 'node:path';
import { captureAiContract, captureScenario, fingerprintIndex, phase0Root, withBrowser } from './helpers/browser-harness.mjs';
import { normalizeBehavior } from './helpers/normalize-output.mjs';

const fixturesDir = path.join(phase0Root, 'fixtures');
const baselineDir = path.join(phase0Root, 'baselines', 'current');
const traceDir = path.join(phase0Root, 'traces', 'current');

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

function deepEqualJson(a, b) {
  return JSON.stringify(normalizeBehavior(a)) === JSON.stringify(normalizeBehavior(b));
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

async function main() {
  const summary = await readJson(path.join(baselineDir, 'summary.json'));
  const currentFingerprint = fingerprintIndex();
  const scenarios = await readJson(path.join(fixturesDir, 'scenarios.json'));
  const aiContracts = await readJson(path.join(fixturesDir, 'ai-contracts.json'));
  const failures = [];
  await fs.rm(traceDir, { recursive: true, force: true });
  await fs.mkdir(traceDir, { recursive: true });

  await withBrowser(async browser => {
    for (const scenario of scenarios) {
      const expected = await readJson(path.join(baselineDir, 'scenarios', `${scenario.id}.json`));
      const actual = await captureScenario(browser, scenario);
      if (!deepEqualJson(expected, actual)) failures.push(`Scenario drift: ${scenario.id}`);
      const traced = await captureScenario(browser, scenario, { trace: true });
      if (!deepEqualJson(expected, traced)) failures.push(`Scenario trace-mode drift: ${scenario.id}`);
      await writeJson(path.join(traceDir, `${scenario.id}.trace.json`), {
        scenario_id: scenario.id,
        baseline_fingerprint: summary.app_fingerprint,
        current_fingerprint: currentFingerprint,
        behavior_matches_baseline: deepEqualJson(expected, traced),
        trace_summary: traced.trace_summary,
        decisionTrace: traced.decisionTrace || []
      });
    }

    for (const contract of aiContracts) {
      const expected = await readJson(path.join(baselineDir, 'ai-contracts', `${contract.id}.json`));
      const actual = await captureAiContract(browser, contract);
      if (!deepEqualJson(expected, actual)) failures.push(`AI contract drift: ${contract.id}`);
      const traced = await captureAiContract(browser, contract, { trace: true });
      if (!deepEqualJson(expected, traced)) failures.push(`AI contract trace-mode drift: ${contract.id}`);
    }
  });

  if (failures.length) {
    console.error('Phase 0 baseline comparison failed:');
    failures.forEach(f => console.error(`- ${f}`));
    process.exit(1);
  }

  console.log(`Phase 0 baseline comparison passed.`);
  console.log(`Baseline fingerprint: ${summary.app_fingerprint}`);
  console.log(`Current fingerprint: ${currentFingerprint}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
