#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const dataRoot = path.resolve(__dirname, '..');
const checkOnly = process.argv.includes('--check');
const allowSourceDrift = process.argv.includes('--allow-source-drift');

if (!checkOnly && !allowSourceDrift) {
  const guard = childProcess.spawnSync(process.execPath, [path.join(__dirname, 'check-source-drift.js')], { encoding: 'utf8' });
  if (guard.status !== 0) {
    console.error('active source와 processed snapshot이 달라 어댑터 생성을 중단했습니다.');
    console.error('먼저 차이를 확인하고, 의도적으로 processed를 기준으로 삼을 때만 --allow-source-drift를 사용하세요.');
    process.stdout.write(guard.stdout || '');
    process.stderr.write(guard.stderr || '');
    process.exit(1);
  }
}

const read = (relativePath) => JSON.parse(fs.readFileSync(path.join(dataRoot, relativePath), 'utf8'));
const outputs = {
  'app/etf-sector-data.js': `// Generated from data/processed/etf-monthly.json. Do not edit manually.\nwindow.ETF_SECTOR_DATA = ${JSON.stringify(read('processed/etf-monthly.json').data, null, 2)};\n`,
  'app/valuation-data.js': (() => {
    const data = read('processed/valuation-q1-2025.json');
    return `// Generated from data/processed/valuation-q1-2025.json. Do not edit manually.\nwindow.NDX_Q1_2025 = ${JSON.stringify(data.q1, null, 2)};\nwindow.NDX_Q1_2025_MARKET_CAP = ${JSON.stringify(data.q1MarketCap, null, 2)};\nwindow.NDX_RECENT_MARKET_CAP = ${JSON.stringify(data.recentMarketCap, null, 2)};\n`;
  })(),
  'app/low-pe-data.js': `// Generated from data/processed/low-pe-q1-2025.json. Do not edit manually.\nwindow.LOW_PE_Q1_2025 = ${JSON.stringify(read('processed/low-pe-q1-2025.json').data, null, 2)};\n`
};

const mismatches = [];
for (const [relativePath, content] of Object.entries(outputs)) {
  const target = path.join(dataRoot, relativePath);
  if (checkOnly) {
    const existing = fs.existsSync(target) ? fs.readFileSync(target, 'utf8').replace(/\n+$/, '\n') : null;
    if (existing !== content) mismatches.push(relativePath);
  } else {
    fs.writeFileSync(target, content);
  }
}

if (checkOnly) {
  console.log(JSON.stringify({ ok: mismatches.length === 0, mismatches }, null, 2));
  if (mismatches.length) process.exit(1);
} else {
  console.log(JSON.stringify({ ok: true, generated: Object.keys(outputs) }, null, 2));
}
