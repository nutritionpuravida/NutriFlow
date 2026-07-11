import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { makeSyntheticState } from './synthetic-client-state.mjs';
import { omitVolatile } from './normalize-output.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const phase0Root = path.resolve(__dirname, '..');
const appRoot = path.resolve(phase0Root, '..', '..');
const indexPath = path.join(appRoot, 'index.html');

function requirePlaywright() {
  const require = createRequire(import.meta.url);
  try {
    return require('playwright');
  } catch (_first) {
    const bundled = path.join(os.homedir(), '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules');
    const bundledRequire = createRequire(path.join(bundled, 'phase0-loader.js'));
    return bundledRequire('playwright');
  }
}

function supabaseStubScript() {
  return `
<script>
window.supabase = {
  createClient: function(){
    const emptyResult = { data: null, error: null };
    const chain = {
      select(){ return chain; }, insert(){ return chain; }, update(){ return chain; }, upsert(){ return chain; },
      delete(){ return chain; }, eq(){ return chain; }, order(){ return chain; }, limit(){ return chain; },
      maybeSingle(){ return Promise.resolve(emptyResult); }, single(){ return Promise.resolve(emptyResult); },
      then(resolve){ return Promise.resolve({ data: [], error: null }).then(resolve); }
    };
    return {
      auth: {
        onAuthStateChange(cb){ setTimeout(()=>cb('SIGNED_OUT', null), 0); return { data: { subscription: { unsubscribe(){} } } }; },
        getSession(){ return Promise.resolve({ data: { session: null }, error: null }); },
        getUser(){ return Promise.resolve({ data: { user: null }, error: null }); },
        signOut(){ return Promise.resolve({ error: null }); },
        signInWithPassword(){ return Promise.resolve({ data: { session: null }, error: null }); },
        signUp(){ return Promise.resolve({ data: {}, error: null }); },
        resetPasswordForEmail(){ return Promise.resolve({ data: {}, error: null }); },
        updateUser(){ return Promise.resolve({ data: {}, error: null }); }
      },
      from(){ return chain; },
      functions: { invoke(){ return Promise.resolve({ data: null, error: { message: 'Phase 0 stubbed function' } }); } }
    };
  }
};
window.Stripe = function(){ return { redirectToCheckout(){ return Promise.resolve({}); } }; };
</script>`;
}

function loadAppHtml() {
  const raw = fs.readFileSync(indexPath, 'utf8');
  return raw.replace(
    /<script\s+src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2\/dist\/umd\/supabase\.min\.js"><\/script>/,
    supabaseStubScript()
  );
}

function hashText(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function fingerprintIndex() {
  const html = fs.readFileSync(indexPath, 'utf8');
  const scriptText = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('');
  let hash = 5381;
  for (let i = 0; i < scriptText.length; i++) hash = ((hash * 33) ^ scriptText.charCodeAt(i)) >>> 0;
  return hash.toString(16).padStart(8, '0').toUpperCase();
}

export function readDuplicateBuildSevenDayAudit() {
  const html = fs.readFileSync(indexPath, 'utf8');
  const matches = [...html.matchAll(/function\s+buildSevenDay\s*\(/g)].map(match => {
    const before = html.slice(0, match.index);
    return { offset: match.index, line: before.split(/\r?\n/).length };
  });
  return {
    definitions: matches,
    runtimeRule: 'JavaScript function declarations with the same name are hoisted; the later definition is the active binding in the global scope.',
    phase0Action: 'Commit A records definition locations. Commit B will trace active runtime reachability without deduplicating.'
  };
}

async function preparePage(browser, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();
  await page.setContent(loadAppHtml(), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof getDayMealAllocation === 'function' && typeof calcDayTotalsForPlan === 'function', null, { timeout: 10000 });
  if (options.trace) {
    await page.evaluate(() => {
      window.NUTRESE_PHASE0_TRACE = true;
      window.NUTRESE_DECISION_TRACE = [];
    });
  }
  return { page, context };
}

export async function captureScenario(browser, scenario, options = {}) {
  const { page, context } = await preparePage(browser, options);
  const state = makeSyntheticState(scenario);
  const fixtureHash = hashText(JSON.stringify(scenario));
  const result = await page.evaluate(({ scenario, state }) => {
    function safeCall(fn, fallback) {
      try { return fn(); } catch (error) { return { error: String(error && error.message || error) } || fallback; }
    }
    resetForm();
    applyState(state);
    S.ex = { ...S.ex, ...(scenario.ex || {}) };
    S.exAuto = { starch: false, protein: false, fat: false };
    S.goalKcal = Number(scenario.targetKcal || S.goalKcal || 0);
    S.mealSel = { ...S.mealSel, ...state.mealSel };
    S.weekPlans = (typeof WEEK_PLANS !== 'undefined' ? WEEK_PLANS : []).map(p => ({ ...p }));
    S.mealLanguage = 'GR';
    calcAll();

    const dayPlans = S.weekPlans.map((plan, index) => ({ index, plan: { ...plan } }));
    const days = dayPlans.map(({ index, plan }) => {
      const gr = calcDayTotalsForPlan(plan, 'GR', index);
      const en = calcDayTotalsForPlan(plan, 'EN', index);
      const displayGr = calcDayTotalsForPlanDisplay(plan, 'GR', index);
      const displayEn = calcDayTotalsForPlanDisplay(plan, 'EN', index);
      return {
        index,
        day: weekDayLabel(plan, index, 'GR'),
        dayEn: weekDayLabel(plan, index, 'EN'),
        keys: { breakfast: plan.brk || plan.breakfast, lunch: plan.lun || plan.lunch, dinner: plan.din || plan.dinner },
        totals: {
          gr: { brk: gr.brkKcal, snk1: gr.snk1Kcal, lun: gr.lunKcal, snk2: gr.snk2Kcal, din: gr.dinKcal, sleep: gr.slpKcal, total: gr.total },
          en: { brk: en.brkKcal, snk1: en.snk1Kcal, lun: en.lunKcal, snk2: en.snk2Kcal, din: en.dinKcal, sleep: en.slpKcal, total: en.total },
          displayGr: { brk: displayGr.brkKcal, snk1: displayGr.snk1Kcal, lun: displayGr.lunKcal, snk2: displayGr.snk2Kcal, din: displayGr.dinKcal, sleep: displayGr.slpKcal, total: displayGr.total },
          displayEn: { brk: displayEn.brkKcal, snk1: displayEn.snk1Kcal, lun: displayEn.lunKcal, snk2: displayEn.snk2Kcal, din: displayEn.dinKcal, sleep: displayEn.slpKcal, total: displayEn.total }
        },
        text: {
          gr: {
            breakfast: displayGr.breakfast || '',
            snack1: displayGr.snack1 || '',
            lunch: displayGr.lunch || '',
            snack2: displayGr.snack2 || '',
            dinner: displayGr.dinner || '',
            sleep: displayGr.sleep || ''
          },
          en: {
            breakfast: displayEn.breakfast || '',
            snack1: displayEn.snack1 || '',
            lunch: displayEn.lunch || '',
            snack2: displayEn.snack2 || '',
            dinner: displayEn.dinner || '',
            sleep: displayEn.sleep || ''
          }
        },
        allocation: safeCall(() => getDayMealAllocation(plan, 'GR'), null),
        warnings: [...(gr.warnings || []), ...(displayGr.warnings || [])]
      };
    });

    const activeAllocation = getDayMealAllocation(S.mealSel, 'GR');
    const activeDayGr = calcDayTotals();
    const exchangeValues = { starch: 81, protein: 46, fat: 45, veg: 28, fruit: 60, dairy: 80 };

    return {
      scenario_id: scenario.id,
      description: scenario.description,
      condition: scenario.condition,
      targetKcal: Number(scenario.targetKcal || 0),
      exchangeValues,
      active: {
        mealSel: { ...S.mealSel },
        ex: { ...S.ex },
        allocation: activeAllocation,
        totals: activeDayGr
      },
      week: days,
      dom: {
        weekViewText: safeCall(() => {
          S.sevenDayView = 'week';
          buildSevenDay();
          return document.getElementById('page-sevenday')?.innerText || '';
        }, ''),
        reportText: safeCall(() => {
          buildReport();
          return document.getElementById('report-render')?.innerText || '';
        }, '')
      }
    };
  }, { scenario, state });
  const decisionTrace = options.trace ? await page.evaluate(() => window.NUTRESE_DECISION_TRACE || []) : undefined;
  await context.close();
  return omitVolatile({
    fixture_hash: fixtureHash,
    app_fingerprint: fingerprintIndex(),
    ...(options.trace ? {
      trace_summary: {
        enabled: true,
        event_count: decisionTrace.length,
        functions: [...new Set(decisionTrace.map(entry => entry.function))].sort()
      },
      decisionTrace
    } : {}),
    ...result
  });
}

export async function captureAiContract(browser, contract, options = {}) {
  const { page, context } = await preparePage(browser, options);
  const result = await page.evaluate(({ contract }) => {
    const before = JSON.stringify(S.weekPlans || []);
    let applyResult = null;
    let error = null;
    try {
      if (typeof applyAiSevenDayPlan === 'function') {
        applyResult = applyAiSevenDayPlan(contract.plan);
      }
    } catch (err) {
      error = String(err && err.message || err);
    }
    const after = JSON.stringify(S.weekPlans || []);
    return {
      contract_id: contract.id,
      description: contract.description,
      mockedOnly: true,
      note: 'Application-side AI-shaped output contract fixture; not an LLM or Edge Function integration test.',
      changedWeekPlans: before !== after,
      applyResult,
      error,
      aiPlanStatus: S.aiPlanStatus || '',
      weekPlansSample: (S.weekPlans || []).slice(0, 2)
    };
  }, { contract });
  const decisionTrace = options.trace ? await page.evaluate(() => window.NUTRESE_DECISION_TRACE || []) : undefined;
  await context.close();
  return omitVolatile({
    app_fingerprint: fingerprintIndex(),
    ...(options.trace ? {
      trace_summary: {
        enabled: true,
        event_count: decisionTrace.length,
        functions: [...new Set(decisionTrace.map(entry => entry.function))].sort()
      },
      decisionTrace
    } : {}),
    ...result
  });
}

export async function withBrowser(fn) {
  const { chromium } = requirePlaywright();
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    return await fn(browser);
  } finally {
    await browser.close();
  }
}

export { phase0Root, appRoot, indexPath, fingerprintIndex };
