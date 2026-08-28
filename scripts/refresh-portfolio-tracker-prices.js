#!/usr/bin/env node

/*
 * Extends the browser adapter used by the Quant × Trend portfolio tracker.
 * The original Excel workbook is intentionally never touched: it remains the
 * initial-history source, while this script appends only fully covered U.S.
 * trading days to the app adapter.
 */
const fs = require('fs');
const path = require('path');

const workspace = path.resolve(__dirname, '..');
const adapterPath = path.join(workspace, 'data/app/portfolio-tracker-excel-raw.js');
const dryRun = process.argv.includes('--dry-run');
const maxAttempts = 3;
const requestConcurrency = 2;
const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function formatNewYorkDate(timestamp) {
  const parts = Object.fromEntries(formatter.formatToParts(new Date(timestamp * 1000))
    .filter((part) => part.type !== 'literal')
    .map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function loadRawAdapter() {
  const source = fs.readFileSync(adapterPath, 'utf8');
  const prefix = '  const raw = ';
  const start = source.indexOf(prefix);
  const end = source.indexOf(';\n  const portfolios', start);
  if (start < 0 || end < 0) throw new Error('가격 어댑터의 raw 데이터 블록을 찾을 수 없습니다.');
  return {
    source,
    start: start + prefix.length,
    end,
    raw: JSON.parse(source.slice(start + prefix.length, end))
  };
}

function yahooSymbol(ticker) {
  return String(ticker).trim().toUpperCase().replace(/\./g, '-');
}

function nextUtcMidnight(date) {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / 1000) + 86400;
}

async function fetchJson(url) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; InvestmentArchivePriceRefresh/1.0)'
        }
      });
      if (response.ok) return response.json();
      const retryable = response.status === 429 || response.status >= 500;
      lastError = new Error(`Yahoo Finance 요청 실패 (${response.status})`);
      if (!retryable || attempt === maxAttempts) break;
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) break;
    }
    await sleep(750 * attempt);
  }
  throw lastError || new Error('Yahoo Finance 요청에 실패했습니다.');
}

async function fetchCloseByDate(ticker, period1, period2) {
  const symbol = yahooSymbol(ticker);
  const endpoint = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
  endpoint.searchParams.set('period1', String(period1));
  endpoint.searchParams.set('period2', String(period2));
  endpoint.searchParams.set('interval', '1d');
  endpoint.searchParams.set('includePrePost', 'false');
  endpoint.searchParams.set('events', 'div,splits');
  const payload = await fetchJson(endpoint);
  const result = payload?.chart?.result?.[0];
  const timestamps = Array.isArray(result?.timestamp) ? result.timestamp : [];
  const closes = result?.indicators?.quote?.[0]?.close || [];
  if (!timestamps.length || timestamps.length !== closes.length) {
    throw new Error(`${ticker}: 일별 종가 응답이 비어 있거나 길이가 맞지 않습니다.`);
  }
  const values = new Map();
  timestamps.forEach((timestamp, index) => {
    const close = Number(closes[index]);
    if (Number.isFinite(close) && close > 0) values.set(formatNewYorkDate(timestamp), close);
  });
  return values;
}

async function mapWithConcurrency(items, callback) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await callback(items[index], index);
      await sleep(180);
    }
  }
  await Promise.all(Array.from({ length: Math.min(requestConcurrency, items.length) }, worker));
  return results;
}

function serialiseAdapter(source, start, end, raw) {
  return `${source.slice(0, start)}${JSON.stringify(raw)}${source.slice(end)}`;
}

async function main() {
  const { source, start, end, raw } = loadRawAdapter();
  const tickers = Object.keys(raw.prices || {});
  if (!tickers.length || !Array.isArray(raw.dates) || !raw.lastTradingDate) {
    throw new Error('자동 갱신에 필요한 기존 가격 이력이 없습니다.');
  }
  const period1 = nextUtcMidnight(raw.lastTradingDate);
  const period2 = Math.floor(Date.now() / 1000) + 86400;
  const previousDate = raw.lastTradingDate;
  const entries = await mapWithConcurrency(tickers, async (ticker) => [
    ticker,
    await fetchCloseByDate(ticker, period1, period2)
  ]);
  const closes = Object.fromEntries(entries);
  const candidateDates = [...new Set(entries.flatMap(([, values]) => [...values.keys()]))]
    .filter((date) => date > previousDate)
    .sort();
  const completeDates = candidateDates.filter((date) => tickers.every((ticker) => Number.isFinite(closes[ticker].get(date))));

  if (!completeDates.length) {
    console.log(JSON.stringify({
      changed: false,
      lastTradingDate: previousDate,
      tickers: tickers.length,
      reason: '모든 현재 가격 열의 종가가 확인된 새 거래일이 없습니다.'
    }, null, 2));
    return;
  }

  completeDates.forEach((date) => {
    raw.dates.push(date);
    tickers.forEach((ticker) => raw.prices[ticker].push(closes[ticker].get(date)));
  });
  raw.initialPriceSource = raw.initialPriceSource || raw.priceSource;
  raw.initialSourceSheetNote = raw.initialSourceSheetNote || raw.sourceSheetNote;
  raw.sourceSheetNote = `${raw.initialSourceSheetNote} | 이후 일자는 GitHub Actions가 Yahoo Finance 일별 비조정 종가로 추가`;
  raw.lastTradingDate = completeDates.at(-1);
  raw.priceSource = '초기 이력: 연결 Excel Sheet1 · 이후: Yahoo Finance chart endpoint · 일별 비조정 종가';
  raw.refreshPolicy = 'GitHub Actions가 미국 장 마감 후 평일마다 모든 현재 가격 열이 확인된 거래일만 추가';
  raw.lastRefreshAt = new Date().toISOString();
  raw.refreshStatus = 'complete';

  if (!dryRun) fs.writeFileSync(adapterPath, serialiseAdapter(source, start, end, raw));
  console.log(JSON.stringify({
    changed: true,
    dryRun,
    previousLastTradingDate: previousDate,
    lastTradingDate: raw.lastTradingDate,
    appendedTradingDates: completeDates,
    tickers: tickers.length
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
