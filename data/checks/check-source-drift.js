#!/usr/bin/env node

// Read-only guard: compare the source that the page actually loads with the
// separated snapshots. Never rewrite either side automatically.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const workspace = path.resolve(__dirname, '../..');
const dataRoot = path.join(workspace, 'data');
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(dataRoot, relativePath), 'utf8'));
const html = fs.readFileSync(path.join(workspace, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].map((match) => ({ attrs: match[1], code: match[2] }));
const mismatches = [];
const checks = {};

// Legacy ETF/valuation/low-PE adapters remain archives. Quant × Trend is an
// optional null-safe adapter, while the portfolio comparison and price-tracker
// adapters are active page inputs. Cache-busting query strings do not change
// the adapter identity.
const allowedAppAdapters = new Set([
  'data/app/quant-trend-snapshot.js',
  'data/app/portfolio-comparison-data.js',
  'data/app/portfolio-price-data.js',
  'data/app/portfolio-price-data-excel-update.js',
  'data/app/portfolio-tracker-2024.js',
  'data/app/portfolio-tracker-excel-raw.js'
]);
const unexpectedAppAdapter = [...html.matchAll(/\bsrc\s*=\s*["'](data\/app\/[^"']+)["']/g)]
  .map((match) => match[1])
  .filter((source) => !allowedAppAdapters.has(source.split('?')[0]));
if (unexpectedAppAdapter.length) {
  mismatches.push(`index.html이 승인되지 않은 data/app 어댑터를 자동 로드하고 있습니다: ${unexpectedAppAdapter.join(', ')}`);
}

const processedEtf = readJson('processed/etf-monthly.json').data;
const etfBlock = scripts.find((script) => script.attrs.includes('etf-dashboard-data'));
if (!etfBlock) {
  mismatches.push('ETF active source(index.html#etf-dashboard-data)를 찾을 수 없습니다.');
} else {
  const activeEtf = JSON.parse(etfBlock.code);
  checks.etf = { active: `${activeEtf.series.length} series / ${activeEtf.months.length} months`, processed: `${processedEtf.series.length} series / ${processedEtf.months.length} months`, equal: JSON.stringify(activeEtf) === JSON.stringify(processedEtf) };
  if (!checks.etf.equal) mismatches.push('ETF active source와 processed snapshot이 다릅니다. 덮어쓰지 말고 새 스냅샷으로 보관하세요.');
}

const lowPeContext = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(workspace, 'screen_low_pe_q1_2025.js'), 'utf8'), lowPeContext);
const activeLowPe = lowPeContext.window.LOW_PE_Q1_2025;
const processedLowPe = readJson('processed/low-pe-q1-2025.json').data;
checks.lowPe = { activeRows: activeLowPe.data.length, processedRows: processedLowPe.data.length, equal: JSON.stringify(activeLowPe) === JSON.stringify(processedLowPe) };
if (!checks.lowPe.equal) mismatches.push('저PER active source(screen_low_pe_q1_2025.js)와 processed snapshot이 다릅니다. 덮어쓰지 말고 새 스냅샷으로 보관하세요.');

const q1Script = scripts.find((script) => script.code.includes('window.NDX_Q1_2025 = {'));
const valuationScript = scripts.find((script) => script.code.includes('window.NDX_Q1_2025_MARKET_CAP ='));
const valuationContext = { window: {}, document: { getElementById: () => null } };
if (!q1Script || !valuationScript) {
  mismatches.push('밸류에이션 active source 블록을 찾을 수 없습니다.');
} else {
  vm.runInNewContext(q1Script.code, valuationContext);
  const setupEnd = valuationScript.code.indexOf('    const reports = {');
  vm.runInNewContext(setupEnd >= 0 ? valuationScript.code.slice(0, setupEnd) : valuationScript.code, valuationContext);
  const processedValuation = readJson('processed/valuation-q1-2025.json');
  checks.valuation = {
    activeRows: valuationContext.window.NDX_Q1_2025.data.length,
    processedRows: processedValuation.q1.data.length,
    equal: JSON.stringify(valuationContext.window.NDX_Q1_2025) === JSON.stringify(processedValuation.q1)
      && JSON.stringify(valuationContext.window.NDX_Q1_2025_MARKET_CAP) === JSON.stringify(processedValuation.q1MarketCap)
      && JSON.stringify(valuationContext.window.NDX_RECENT_MARKET_CAP) === JSON.stringify(processedValuation.recentMarketCap)
  };
  if (!checks.valuation.equal) mismatches.push('밸류에이션 active source(index.html)와 processed snapshot이 다릅니다. 덮어쓰지 말고 새 스냅샷으로 보관하세요.');
}

console.log(JSON.stringify({
  ok: mismatches.length === 0,
  policy: 'active legacy source wins; drift is reported, never overwritten',
  activeSources: {
    etf: 'index.html#etf-dashboard-data',
    valuation: 'index.html inline NDX blocks',
    lowPe: 'screen_low_pe_q1_2025.js'
  },
  checks,
  mismatches
}, null, 2));
if (mismatches.length) process.exit(1);
