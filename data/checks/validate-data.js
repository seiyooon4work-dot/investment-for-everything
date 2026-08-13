#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
const failures = [];
const summary = {};
const loadAdapter = (relativePath) => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, relativePath), 'utf8'), context, { filename: relativePath });
  return context.window;
};

const etf = readJson('processed/etf-monthly.json');
const etfData = etf.data;
if (!etfData || !Array.isArray(etfData.months) || !Array.isArray(etfData.series)) failures.push('ETF 스냅샷 구조가 없습니다.');
if (etfData && etfData.dataQuality) {
  if (etfData.dataQuality.totalSeries !== etfData.series.length) failures.push('ETF totalSeries와 series 길이가 다릅니다.');
  if (etfData.dataQuality.monthlyPoints !== etfData.months.length) failures.push('ETF monthlyPoints와 months 길이가 다릅니다.');
}
if (etfData) {
  const tickers = etfData.series.map((row) => row.ticker);
  if (new Set(tickers).size !== tickers.length) failures.push('ETF ticker 중복이 있습니다.');
  for (const row of etfData.series) {
    if (!Array.isArray(row.values) || row.values.length !== etfData.months.length) {
      failures.push(`ETF ${row.ticker || '(unknown)'}의 값 길이가 months와 다릅니다.`);
    }
  }
  summary.etf = { series: etfData.series.length, months: etfData.months.length, auditSeries: etfData.dataQuality.auditSeries };
}
const etfApp = loadAdapter('app/etf-sector-data.js');
if (JSON.stringify(etfApp.ETF_SECTOR_DATA) !== JSON.stringify(etfData)) failures.push('ETF Processed와 App 어댑터가 다릅니다.');

const valuation = readJson('processed/valuation-q1-2025.json');
if (!valuation.q1 || !Array.isArray(valuation.q1.data)) failures.push('밸류에이션 q1 데이터 구조가 없습니다.');
if (valuation.q1 && valuation.q1.data.length !== 100) failures.push(`밸류에이션 행 수가 100이 아닙니다: ${valuation.q1.data.length}`);
for (const field of ['q1MarketCap', 'recentMarketCap']) {
  if (!valuation[field] || !valuation[field].data || typeof valuation[field].data !== 'object' || Array.isArray(valuation[field].data)) failures.push(`밸류에이션 ${field} 구조가 없습니다.`);
}
summary.valuation = {
  rows: valuation.q1?.data?.length || 0,
  q1MarketCapRows: Object.keys(valuation.q1MarketCap?.data || {}).length,
  recentMarketCapRows: Object.keys(valuation.recentMarketCap?.data || {}).length
};
const valuationApp = loadAdapter('app/valuation-data.js');
if (JSON.stringify(valuationApp.NDX_Q1_2025) !== JSON.stringify(valuation.q1)) failures.push('밸류에이션 q1 Processed와 App 어댑터가 다릅니다.');
if (JSON.stringify(valuationApp.NDX_Q1_2025_MARKET_CAP) !== JSON.stringify(valuation.q1MarketCap)) failures.push('Q1 시가총액 Processed와 App 어댑터가 다릅니다.');
if (JSON.stringify(valuationApp.NDX_RECENT_MARKET_CAP) !== JSON.stringify(valuation.recentMarketCap)) failures.push('최근 시가총액 Processed와 App 어댑터가 다릅니다.');

const lowPe = readJson('processed/low-pe-q1-2025.json').data;
const candidateCount = lowPe.screen?.candidatePoolCount;
const selectedCount = lowPe.screen?.selectedCount;
if (!Array.isArray(lowPe.data)) failures.push('저PER 데이터 배열이 없습니다.');
if (candidateCount !== 62) failures.push(`저PER 후보 풀 수가 62가 아닙니다: ${candidateCount}`);
if (selectedCount !== 19) failures.push(`저PER 선택 수가 19가 아닙니다: ${selectedCount}`);
if (Array.isArray(lowPe.data) && lowPe.data.length !== candidateCount) failures.push('저PER 후보 행 수와 candidatePoolCount가 다릅니다.');
summary.lowPe = { candidates: candidateCount || 0, selected: selectedCount || 0, rows: lowPe.data?.length || 0 };
const lowPeApp = loadAdapter('app/low-pe-data.js');
if (JSON.stringify(lowPeApp.LOW_PE_Q1_2025) !== JSON.stringify(lowPe)) failures.push('저PER Processed와 App 어댑터가 다릅니다.');

// 앱 파일에 남겨 둔 fallback 임베드 값과 legacy low-PE 파일도 기준 스냅샷과 대조합니다.
const indexHtml = fs.readFileSync(path.join(root, '..', 'index.html'), 'utf8');
const indexScripts = [...indexHtml.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].map((match) => ({ attrs: match[1], code: match[2] }));
const embeddedEtfScript = indexScripts.find((script) => script.attrs.includes('etf-dashboard-data'));
if (!embeddedEtfScript) {
  failures.push('index.html의 ETF fallback 데이터 블록을 찾을 수 없습니다.');
} else if (JSON.stringify(JSON.parse(embeddedEtfScript.code)) !== JSON.stringify(etfData)) {
  failures.push('ETF Processed와 index.html fallback이 다릅니다.');
}
try {
  const q1Script = indexScripts.find((script) => script.code.includes('window.NDX_Q1_2025 = {'));
  const valuationScript = indexScripts.find((script) => script.code.includes('window.NDX_Q1_2025_MARKET_CAP ='));
  const fallbackContext = {
    window: {
      __CANONICAL_NDX_Q1_2025: null,
      __CANONICAL_NDX_Q1_2025_MARKET_CAP: null,
      __CANONICAL_NDX_RECENT_MARKET_CAP: null
    },
    document: { getElementById: () => ({ textContent: JSON.stringify(etfData) }) }
  };
  vm.runInNewContext(q1Script.code, fallbackContext);
  vm.runInNewContext(valuationScript.code.slice(0, valuationScript.code.indexOf('    const reports = {')), fallbackContext);
  if (JSON.stringify(fallbackContext.window.NDX_Q1_2025) !== JSON.stringify(valuation.q1)) failures.push('밸류에이션 Processed와 index.html fallback q1이 다릅니다.');
  if (JSON.stringify(fallbackContext.window.NDX_Q1_2025_MARKET_CAP) !== JSON.stringify(valuation.q1MarketCap)) failures.push('밸류에이션 Processed와 index.html fallback Q1 시가총액이 다릅니다.');
  if (JSON.stringify(fallbackContext.window.NDX_RECENT_MARKET_CAP) !== JSON.stringify(valuation.recentMarketCap)) failures.push('밸류에이션 Processed와 index.html fallback 최근 시가총액이 다릅니다.');
} catch (error) {
  failures.push(`index.html fallback 밸류에이션 검증 실패: ${error.message}`);
}
const legacyLowPe = loadAdapter('../screen_low_pe_q1_2025.js');
if (JSON.stringify(legacyLowPe.LOW_PE_Q1_2025) !== JSON.stringify(lowPe)) failures.push('저PER Processed와 legacy 파일이 다릅니다.');

console.log(JSON.stringify({ ok: failures.length === 0, summary, failures }, null, 2));
if (failures.length) process.exit(1);
