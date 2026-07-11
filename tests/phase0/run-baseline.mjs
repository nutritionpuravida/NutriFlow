import fs from 'node:fs/promises';
import path from 'node:path';
import { captureAiContract, captureScenario, fingerprintIndex, phase0Root, readDuplicateBuildSevenDayAudit, withBrowser } from './helpers/browser-harness.mjs';
import { normalizeBaseline } from './helpers/normalize-output.mjs';

const fixturesDir = path.join(phase0Root, 'fixtures');
const baselineDir = path.join(phase0Root, 'baselines', 'current');
const scenarioOutDir = path.join(baselineDir, 'scenarios');
const aiOutDir = path.join(baselineDir, 'ai-contracts');
const traceDir = path.join(phase0Root, 'traces', 'current');

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(normalizeBaseline(value), null, 2) + '\n', 'utf8');
}

async function main() {
  const scenarios = await readJson(path.join(fixturesDir, 'scenarios.json'));
  const aiContracts = await readJson(path.join(fixturesDir, 'ai-contracts.json'));
  await fs.rm(baselineDir, { recursive: true, force: true });
  await fs.rm(traceDir, { recursive: true, force: true });
  await fs.mkdir(scenarioOutDir, { recursive: true });
  await fs.mkdir(aiOutDir, { recursive: true });
  await fs.mkdir(traceDir, { recursive: true });

  const summary = {
    phase: 'Phase 0 current behavior capture',
    app_fingerprint: fingerprintIndex(),
    fixturePolicy: 'synthetic only; no real or identifiable client data',
    browserAuthority: true,
    duplicateBuildSevenDay: readDuplicateBuildSevenDayAudit(),
    scenarios: [],
    aiContracts: []
  };

  await withBrowser(async browser => {
    for (const scenario of scenarios) {
      const captured = await captureScenario(browser, scenario);
      await writeJson(path.join(scenarioOutDir, `${scenario.id}.json`), captured);
      await writeJson(path.join(traceDir, `${scenario.id}.trace.json`), {
        scenario_id: scenario.id,
        phase: 'Commit A',
        decisionTraceEnabled: false,
        decisionTrace: [],
        note: 'Trace files are placeholders until compare-baseline.mjs runs with Decision Trace enabled.'
      });
      summary.scenarios.push({
        id: scenario.id,
        targetKcal: scenario.targetKcal,
        condition: scenario.condition,
        baseline: `scenarios/${scenario.id}.json`
      });
    }

    for (const contract of aiContracts) {
      const captured = await captureAiContract(browser, contract);
      await writeJson(path.join(aiOutDir, `${contract.id}.json`), captured);
      summary.aiContracts.push({
        id: contract.id,
        mockedOnly: true,
        baseline: `ai-contracts/${contract.id}.json`
      });
    }
  });

  await writeJson(path.join(baselineDir, 'summary.json'), summary);
  await fs.writeFile(path.join(baselineDir, 'fingerprint.txt'), `${summary.app_fingerprint}\n`, 'utf8');
  console.log(`Phase 0 baseline captured: ${summary.app_fingerprint}`);
  console.log(`Scenarios: ${summary.scenarios.length}; AI contract fixtures: ${summary.aiContracts.length}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
