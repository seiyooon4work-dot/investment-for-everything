#!/usr/bin/env node
"use strict";

/**
 * Quant × Trend Template market-data pipeline.
 *
 * The pipeline deliberately keeps the layers separate:
 *   provider response -> raw snapshot -> normalized bars -> feature snapshot
 *
 * It never fills a missing value with zero and never turns an unavailable
 * Trend condition into a fail. A condition is either pass, fail, or unknown.
 * The browser app can consume the generated app adapter, while the raw and
 * processed files remain independently re-runnable and auditable.
 */

const fs = require("node:fs");
const path = require("node:path");
const { setTimeout: sleep } = require("node:timers/promises");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_PROVIDER = "massive";
const DEFAULT_BASE_URL = "https://api.massive.com";
const DEFAULT_BENCHMARK = "I:SPX";
const DEFAULT_FROM = "2024-01-01";
const DEFAULT_TO = new Date().toISOString().slice(0, 10);
const DEFAULT_MIN_BARS = 253;
const DEFAULT_RETRIES = 3;
const DEFAULT_CONCURRENCY = 4;

const TREND_RULES = [
  { id: "price-above-150-200", label: "가격 > 150/200 DMA" },
  { id: "dma150-above-dma200", label: "150DMA > 200DMA" },
  { id: "dma200-rising", label: "200DMA 상승" },
  { id: "dma50-above-long", label: "50DMA > 150/200DMA" },
  { id: "price-above-dma50", label: "가격 > 50DMA" },
  { id: "above-52w-low", label: "52주 저점 대비 +30% 이상" },
  { id: "near-52w-high", label: "52주 고점의 75% 이상" },
  { id: "relative-strength-70", label: "RS 백분위 ≥ 70" },
];

function fail(message) {
  const error = new Error(message);
  error.code = "PIPELINE_ERROR";
  throw error;
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeTicker(value) {
  const ticker = nonEmptyString(value);
  return ticker ? ticker.toUpperCase() : null;
}

function isDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function ensureDate(value, label) {
  if (!isDate(value)) fail(`${label} must be YYYY-MM-DD: ${value}`);
  return value;
}

function firstPresent(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

function dateFromTimestamp(value) {
  const number = finiteNumber(value);
  if (number === null) return null;
  let milliseconds = number;
  if (milliseconds > 1e17) milliseconds /= 1e6;
  else if (milliseconds > 1e14) milliseconds /= 1e3;
  else if (milliseconds < 1e11) milliseconds *= 1000;
  const date = new Date(milliseconds);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function normalizeBar(input) {
  const row = input && typeof input === "object" ? input : {};
  const date = isDate(row.date)
    ? row.date
    : isDate(row.session_end_date)
      ? row.session_end_date
      : dateFromTimestamp(firstPresent(row.timestamp, row.t, row.window_start, row.time));
  const open = finiteNumber(firstPresent(row.open, row.o));
  const high = finiteNumber(firstPresent(row.high, row.h));
  const low = finiteNumber(firstPresent(row.low, row.l));
  const close = finiteNumber(firstPresent(row.close, row.c));
  const volume = finiteNumber(firstPresent(row.volume, row.v));
  const vwap = finiteNumber(firstPresent(row.vwap, row.vw));

  if (!date || open === null || high === null || low === null || close === null) {
    return { ok: false, reason: "date/open/high/low/close가 모두 필요합니다." };
  }
  if (high < Math.max(open, close) || low > Math.min(open, close) || low > high || close <= 0) {
    return { ok: false, reason: `OHLC 범위가 유효하지 않습니다: ${date}` };
  }
  if (volume !== null && volume < 0) {
    return { ok: false, reason: `거래량이 음수입니다: ${date}` };
  }

  return {
    ok: true,
    bar: { date, open, high, low, close, volume, vwap },
  };
}

function normalizeBars(rawBars) {
  if (!Array.isArray(rawBars)) {
    return { bars: [], quality: { inputCount: 0, invalidCount: 0, duplicateCount: 0, invalidReasons: ["bars 배열이 없습니다."] } };
  }
  const byDate = new Map();
  const invalidReasons = [];
  let invalidCount = 0;
  let duplicateCount = 0;

  for (const rawBar of rawBars) {
    const normalized = normalizeBar(rawBar);
    if (!normalized.ok) {
      invalidCount += 1;
      if (invalidReasons.length < 10) invalidReasons.push(normalized.reason);
      continue;
    }
    if (byDate.has(normalized.bar.date)) duplicateCount += 1;
    byDate.set(normalized.bar.date, normalized.bar);
  }

  const bars = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  return {
    bars,
    quality: {
      inputCount: rawBars.length,
      validCount: bars.length,
      invalidCount,
      duplicateCount,
      invalidReasons,
      firstDate: bars[0]?.date || null,
      lastDate: bars.at(-1)?.date || null,
    },
  };
}

function extractInstrumentEntries(payload, tickerOverride = null) {
  if (Array.isArray(payload)) return payload.map((entry) => ({ entry, tickerOverride }));
  if (!payload || typeof payload !== "object") fail("입력 JSON은 객체 또는 배열이어야 합니다.");

  if (Array.isArray(payload.instruments)) {
    return payload.instruments.map((entry) => ({ entry, tickerOverride: null }));
  }
  if (payload.barsByTicker && typeof payload.barsByTicker === "object") {
    return Object.entries(payload.barsByTicker).map(([ticker, bars]) => ({ entry: { ticker, bars }, tickerOverride: null }));
  }
  if (Array.isArray(payload.requests)) {
    return payload.requests.map((request) => ({
      entry: {
        ticker: request.ticker,
        response: request.response,
        bars: request.response?.results || request.response?.bars || [],
      },
      tickerOverride: null,
    }));
  }
  if (payload.ticker || tickerOverride) return [{ entry: payload, tickerOverride }];
  if (Array.isArray(payload.results)) return [{ entry: payload, tickerOverride }];
  fail("입력 JSON에서 instruments, barsByTicker, requests 또는 ticker/results를 찾지 못했습니다.");
}

function normalizeMarketPayload(payload, options = {}) {
  const entries = extractInstrumentEntries(payload, options.ticker || null);
  const instruments = [];
  const seen = new Set();

  for (const { entry, tickerOverride } of entries) {
    const response = entry?.response && typeof entry.response === "object" ? entry.response : entry;
    const ticker = normalizeTicker(firstPresent(entry?.ticker, response?.ticker, tickerOverride));
    if (!ticker) continue;
    if (seen.has(ticker)) continue;
    const rawBars = firstPresent(entry?.bars, response?.results, response?.bars, response?.data);
    const normalized = normalizeBars(rawBars);
    instruments.push({
      ticker,
      bars: normalized.bars,
      quality: normalized.quality,
      provider: nonEmptyString(payload.provider) || nonEmptyString(entry?.provider) || options.provider || "input",
      adjusted: payload.adjusted ?? entry?.adjusted ?? null,
      sourceRequestId: response?.request_id || null,
    });
    seen.add(ticker);
  }

  if (!instruments.length) fail("유효한 ticker와 bars를 가진 종목이 없습니다.");
  return {
    schemaVersion: 1,
    datasetId: "market-daily-bars-normalized",
    provider: nonEmptyString(payload.provider) || options.provider || "input",
    retrievedAt: nonEmptyString(payload.retrievedAt) || new Date().toISOString(),
    adjusted: payload.adjusted ?? null,
    timezone: nonEmptyString(payload.timezone) || "America/New_York",
    instruments,
  };
}

function average(values) {
  const usable = values.filter((value) => Number.isFinite(value));
  return usable.length === values.length && usable.length ? usable.reduce((sum, value) => sum + value, 0) / usable.length : null;
}

function smaAt(closes, endIndex, window) {
  if (endIndex < window - 1) return null;
  return average(closes.slice(endIndex - window + 1, endIndex + 1));
}

function returnOverWindow(closes, window) {
  if (closes.length <= window) return null;
  const start = closes[closes.length - window - 1];
  const end = closes.at(-1);
  return start > 0 && Number.isFinite(end) ? ((end / start) - 1) * 100 : null;
}

function percentileRank(value, values) {
  if (!Number.isFinite(value) || values.length < 2) return null;
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length < 2) return null;
  const lower = sorted.filter((candidate) => candidate < value).length;
  const equal = sorted.filter((candidate) => candidate === value).length;
  return ((lower + (equal - 1) / 2) / (sorted.length - 1)) * 100;
}

function condition(id, status, value = null, detail = null) {
  return { id, status, value: Number.isFinite(value) ? Number(value.toFixed(4)) : null, detail };
}

function evaluateConditions(features) {
  const {
    close,
    sma50,
    sma150,
    sma200,
    sma200Prior,
    low52Week,
    high52Week,
    rsPercentile,
  } = features;
  const above = (left, right) => {
    if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
    return left > right;
  };
  const boolCondition = (id, value, detail) => value === null
    ? condition(id, "unknown", null, detail || "필요한 가격 이력이 부족합니다.")
    : condition(id, value ? "pass" : "fail", value ? 1 : 0, detail);

  const rules = [
    boolCondition("price-above-150-200", Number.isFinite(close) && Number.isFinite(sma150) && Number.isFinite(sma200) ? close > sma150 && close > sma200 : null, "현재가가 150·200DMA를 모두 상회하는지 확인합니다."),
    boolCondition("dma150-above-dma200", above(sma150, sma200), "150DMA와 200DMA의 순서를 확인합니다."),
    boolCondition("dma200-rising", above(sma200, sma200Prior), "현재 200DMA가 20거래일 전보다 높은지 확인합니다."),
    boolCondition("dma50-above-long", Number.isFinite(sma50) && Number.isFinite(sma150) && Number.isFinite(sma200) ? sma50 > sma150 && sma50 > sma200 : null, "50DMA가 장기 이동평균을 모두 상회하는지 확인합니다."),
    boolCondition("price-above-dma50", above(close, sma50), "현재가가 50DMA를 상회하는지 확인합니다."),
    boolCondition("above-52w-low", Number.isFinite(close) && Number.isFinite(low52Week) && low52Week > 0 ? close >= low52Week * 1.3 : null, "52주 저점 대비 30% 이상인지 확인합니다."),
    boolCondition("near-52w-high", Number.isFinite(close) && Number.isFinite(high52Week) && high52Week > 0 ? close >= high52Week * 0.75 : null, "52주 고점의 75% 이상인지 확인합니다."),
    boolCondition("relative-strength-70", Number.isFinite(rsPercentile) ? rsPercentile >= 70 : null, "현재 후보군 내 252일 수익률 백분위가 70 이상인지 확인합니다."),
  ];
  const evaluated = rules.filter((rule) => rule.status !== "unknown");
  const passCount = rules.filter((rule) => rule.status === "pass").length;
  return {
    status: evaluated.length === 0 ? "pending" : evaluated.length === rules.length ? "evaluated" : "partial",
    passCount,
    evaluatedCount: evaluated.length,
    totalCount: rules.length,
    scorePct: evaluated.length ? Number(((passCount / evaluated.length) * 100).toFixed(1)) : null,
    rules,
  };
}

function calculateBaseFeatures(instrument, benchmarkInstrument = null) {
  const bars = instrument.bars;
  const closes = bars.map((bar) => bar.close);
  const close = closes.at(-1) ?? null;
  const endIndex = closes.length - 1;
  const sma50 = smaAt(closes, endIndex, 50);
  const sma150 = smaAt(closes, endIndex, 150);
  const sma200 = smaAt(closes, endIndex, 200);
  const sma200Prior = smaAt(closes, endIndex - 20, 200);
  const trailing = closes.slice(-252);
  const low52Week = trailing.length ? Math.min(...trailing) : null;
  const high52Week = trailing.length ? Math.max(...trailing) : null;
  const return252Pct = returnOverWindow(closes, 252);
  const benchmarkReturn252Pct = benchmarkInstrument ? returnOverWindow(benchmarkInstrument.bars.map((bar) => bar.close), 252) : null;
  const relativeReturnToBenchmarkPct = Number.isFinite(return252Pct) && Number.isFinite(benchmarkReturn252Pct)
    ? return252Pct - benchmarkReturn252Pct
    : null;

  return {
    asOf: bars.at(-1)?.date || null,
    close,
    sma50,
    sma150,
    sma200,
    sma200Prior,
    low52Week,
    high52Week,
    return252Pct,
    benchmarkReturn252Pct,
    relativeReturnToBenchmarkPct,
    rsPercentile: null,
  };
}

function buildSnapshot(normalized, options = {}) {
  const benchmarkTicker = options.benchmark === false ? null : normalizeTicker(options.benchmark || DEFAULT_BENCHMARK);
  const benchmark = benchmarkTicker ? normalized.instruments.find((item) => item.ticker === benchmarkTicker) || null : null;
  const requestedTickers = (options.tickers || normalized.instruments.map((item) => item.ticker))
    .map(normalizeTicker)
    .filter(Boolean)
    .filter((ticker) => ticker !== benchmarkTicker);
  const candidates = normalized.instruments.filter((item) => item.ticker !== benchmarkTicker);
  const featureRows = candidates.map((instrument) => ({ instrument, features: calculateBaseFeatures(instrument, benchmark) }));
  const peerReturns = featureRows.map((row) => row.features.return252Pct).filter(Number.isFinite);
  for (const row of featureRows) row.features.rsPercentile = percentileRank(row.features.return252Pct, peerReturns);

  const data = featureRows.map(({ instrument, features }) => {
    const minimumBarsRequired = options.minBars || DEFAULT_MIN_BARS;
    const minimumBarsMet = instrument.bars.length >= minimumBarsRequired;
    const trend = minimumBarsMet
      ? evaluateConditions(features)
      : {
          status: "pending",
          passCount: 0,
          evaluatedCount: 0,
          totalCount: TREND_RULES.length,
          scorePct: null,
          rules: TREND_RULES.map((rule) => condition(rule.id, "unknown", null, `최소 ${minimumBarsRequired}개 일봉이 필요합니다.`)),
        };
    return {
      ticker: instrument.ticker,
      asOf: features.asOf,
      features,
      trend,
      quality: {
        ...instrument.quality,
        minimumBarsRequired,
        minimumBarsMet,
        status: instrument.quality.invalidCount || instrument.quality.duplicateCount ? "review" : minimumBarsMet ? "ready" : "insufficient_history",
      },
    };
  });
  const availableTickers = data.map((row) => row.ticker);
  const missingTickers = requestedTickers.filter((ticker) => !availableTickers.includes(ticker));
  const latestDates = data.map((row) => row.asOf).filter(Boolean).sort();
  const asOf = latestDates.at(-1) || null;
  const generatedAt = new Date().toISOString();
  const providerErrors = Array.isArray(options.errors) ? options.errors : [];
  const hasBenchmark = benchmark && benchmark.bars.length > 0;
  const qualityStatus = providerErrors.length || missingTickers.length ? "partial" : data.length ? "ready" : "empty";

  return {
    schemaVersion: 1,
    datasetId: "quant-trend-daily",
    generatedAt,
    asOf,
    provider: normalized.provider,
    source: {
      provider: normalized.provider,
      adjusted: normalized.adjusted,
      timezone: normalized.timezone,
      adjustmentNote: "가격 조정 여부와 corporate-action 처리 방식은 공급처 응답의 adjusted 정책을 그대로 기록합니다.",
      rawInput: options.rawInput || null,
    },
    benchmark: {
      ticker: benchmarkTicker,
      available: Boolean(hasBenchmark),
      asOf: benchmark?.bars.at(-1)?.date || null,
      barCount: benchmark?.bars.length || 0,
      return252Pct: benchmark ? returnOverWindow(benchmark.bars.map((bar) => bar.close), 252) : null,
    },
    coverage: {
      requestedTickers,
      availableTickers,
      missingTickers,
      instrumentCount: data.length,
      benchmarkIncluded: Boolean(hasBenchmark),
    minimumBarsRequired: options.minBars || DEFAULT_MIN_BARS,
    },
    quality: {
      status: qualityStatus,
      providerErrors,
      unknownTrendPolicy: "unknown은 fail로 계산하지 않음",
    },
    data,
  };
}

function parseArgs(argv) {
  const args = { flags: new Set() };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const raw = token.slice(2);
    if (!raw) continue;
    const equals = raw.indexOf("=");
    if (equals !== -1) {
      args[raw.slice(0, equals)] = raw.slice(equals + 1);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      args[raw] = next;
      index += 1;
    } else {
      args.flags.add(raw);
      args[raw] = true;
    }
  }
  return args;
}

function listArg(value) {
  if (!value || value === true) return [];
  return String(value).split(",").map(normalizeTicker).filter(Boolean);
}

function resolvePath(file, fallback) {
  return path.resolve(ROOT, file || fallback);
}

function defaultLowPeUniverseTickers() {
  const file = path.join(ROOT, "data/processed/low-pe-q1-2025.json");
  if (!fs.existsSync(file)) return [];
  const payload = JSON.parse(fs.readFileSync(file, "utf8"));
  const rows = Array.isArray(payload.data) ? payload.data : payload.data && payload.data.data;
  return Array.isArray(rows)
    ? rows.map((row) => normalizeTicker(row && row.ticker)).filter(Boolean)
    : [];
}

function writeJsonAtomic(file, value, { force = false } = {}) {
  const target = path.resolve(file);
  if (fs.existsSync(target) && !force) {
    fail(`출력 파일이 이미 있습니다. 덮어쓰려면 --force를 명시하세요: ${path.relative(ROOT, target)}`);
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temporary, target);
}

function writeAppAdapter(file, snapshot, { force = false } = {}) {
  const target = path.resolve(file);
  const existing = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
  const isPlaceholder = /window\.QUANT_TREND_SNAPSHOT\s*=\s*null\s*;?/.test(existing);
  if (fs.existsSync(target) && !force && !isPlaceholder) {
    fail(`앱 어댑터가 이미 있습니다. 덮어쓰려면 --force를 명시하세요: ${path.relative(ROOT, target)}`);
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.tmp-${process.pid}`;
  const body = [
    "/* Generated by scripts/quant-trend-pipeline.js. Do not edit by hand. */",
    `window.QUANT_TREND_SNAPSHOT = ${JSON.stringify(snapshot, null, 2)};`,
    "",
  ].join("\n");
  fs.writeFileSync(temporary, body, "utf8");
  fs.renameSync(temporary, target);
}

function buildMassiveUrl({ baseUrl, ticker, from, to, apiKey }) {
  const url = new URL(`/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/1/day/${from}/${to}`, baseUrl);
  url.searchParams.set("adjusted", "true");
  url.searchParams.set("sort", "asc");
  url.searchParams.set("limit", "50000");
  url.searchParams.set("apiKey", apiKey);
  return url;
}

async function fetchJsonWithRetry(url, { retries = DEFAULT_RETRIES, fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== "function") fail("Node 18 이상 또는 fetch 구현이 필요합니다.");
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchImpl(url, { headers: { accept: "application/json" } });
      const text = await response.text();
      let body = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = null;
      }
      if (response.ok && body && body.status !== "ERROR") return body;
      const status = body?.error || body?.message || body?.status || response.statusText || `HTTP ${response.status}`;
      const error = new Error(`${response.status} ${status}`);
      error.retryable = response.status === 429 || response.status >= 500 || (response.ok && body?.status === "ERROR");
      if (!error.retryable) throw error;
      lastError = error;
    } catch (error) {
      lastError = error;
      if (error.retryable === false) throw error;
      if (attempt >= retries) break;
    }
    const delay = Math.min(10000, 500 * (2 ** attempt));
    await sleep(delay);
  }
  throw lastError || new Error("데이터 요청에 실패했습니다.");
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length || 1)) }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

async function fetchMassivePayload(options) {
  const apiKey = nonEmptyString(process.env.MASSIVE_API_KEY);
  if (!apiKey) fail("MASSIVE_API_KEY 환경변수가 필요합니다. 키는 파일에 저장하지 않습니다.");
  const tickers = [...new Set([...options.tickers, options.benchmark].filter(Boolean).map(normalizeTicker))];
  if (!tickers.length) fail("--tickers에 최소 한 개의 ticker를 지정하세요.");
  const baseUrl = nonEmptyString(process.env.MASSIVE_BASE_URL) || DEFAULT_BASE_URL;
  const requests = await mapLimit(tickers, options.concurrency, async (ticker) => {
    const url = buildMassiveUrl({ baseUrl, ticker, from: options.from, to: options.to, apiKey });
    try {
      const response = await fetchJsonWithRetry(url, { retries: options.retries });
      return { ticker, response, error: null };
    } catch (error) {
      return { ticker, response: null, error: error.message };
    }
  });
  const rawPayload = {
    schemaVersion: 1,
    datasetId: "market-daily-bars-raw",
    provider: "massive",
    retrievedAt: new Date().toISOString(),
    adjusted: true,
    timezone: "America/New_York",
    request: {
      from: options.from,
      to: options.to,
      tickers,
      endpoint: `${baseUrl}/v2/aggs/ticker/{ticker}/range/1/day/{from}/{to}`,
    },
    requests: requests.map(({ ticker, response, error }) => ({ ticker, response, error })),
  };
  const normalized = normalizeMarketPayload(rawPayload, { provider: "massive" });
  return { rawPayload, normalized, errors: requests.filter((item) => item.error).map((item) => ({ ticker: item.ticker, message: item.error })) };
}

function makeSelfTestPayload() {
  const makeBars = (ticker, startPrice, drift) => {
    const cursor = new Date("2024-01-02T00:00:00Z");
    const bars = [];
    for (let index = 0; index < 320; index += 1) {
      while ([0, 6].includes(cursor.getUTCDay())) cursor.setUTCDate(cursor.getUTCDate() + 1);
      const date = new Date(cursor.getTime());
      const close = startPrice + index * drift + Math.sin(index / 8) * 1.5;
      bars.push({ date: date.toISOString().slice(0, 10), open: close - 0.5, high: close + 1, low: close - 1, close, volume: 1000000, ticker });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return bars;
  };
  return {
    provider: "self-test",
    adjusted: true,
    instruments: [
      { ticker: "TESTA", bars: makeBars("TESTA", 100, 0.7) },
      { ticker: "TESTB", bars: makeBars("TESTB", 100, 0.2) },
      { ticker: DEFAULT_BENCHMARK, bars: makeBars(DEFAULT_BENCHMARK, 100, 0.25) },
    ],
  };
}

function printHelp() {
  console.log(`
Quant × Trend Template pipeline

입력 파일로 재실행:
  node scripts/quant-trend-pipeline.js --input data/raw/market/provider-export.json --output data/processed/quant-trend/daily-snapshot.json --app-output data/app/quant-trend-snapshot.js

Massive에서 수집:
  MASSIVE_API_KEY=... node scripts/quant-trend-pipeline.js --provider massive --tickers AAPL,MSFT,NVDA --from 2024-01-01 --to 2026-08-11

주요 옵션:
  --tickers AAPL,MSFT   생략하면 현재 저PER 후보 풀 62개를 사용
  --benchmark I:SPX     S&P 기준선. --benchmark none 으로 비활성화
  --raw-output PATH     공급처 원문 JSON 저장 위치
  --output PATH         Processed Trend 스냅샷 위치
  --app-output PATH     file:// 앱용 window.QUANT_TREND_SNAPSHOT 어댑터
  --force               동일 경로의 기존 스냅샷을 명시적으로 교체
  --retries N           429/5xx 재시도 횟수 (기본 3)
  --concurrency N       동시 요청 수 (기본 4)
  --self-test           외부 데이터 없이 8개 조건 계산만 검증
`);
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help || args.flags.has("help")) {
    printHelp();
    return;
  }
  const force = Boolean(args.force || args.flags.has("force"));
  const selfTest = Boolean(args["self-test"] || args.flags.has("self-test"));
  const benchmarkArg = args.benchmark === "none" || args.benchmark === false ? false : args.benchmark || DEFAULT_BENCHMARK;
  const options = {
    provider: args.provider || DEFAULT_PROVIDER,
    tickers: listArg(args.tickers),
    benchmark: benchmarkArg,
    from: args.from || DEFAULT_FROM,
    to: args.to || DEFAULT_TO,
    minBars: Math.max(1, Number(args["min-bars"] || DEFAULT_MIN_BARS)),
    retries: Math.max(0, Number(args.retries || DEFAULT_RETRIES)),
    concurrency: Math.max(1, Number(args.concurrency || DEFAULT_CONCURRENCY)),
  };
  ensureDate(options.from, "--from");
  ensureDate(options.to, "--to");
  if (options.from > options.to) fail("--from은 --to보다 빠른 날짜여야 합니다.");
  if (!selfTest && !args.input && options.provider === "massive" && !options.tickers.length) {
    options.tickers = defaultLowPeUniverseTickers();
    if (!options.tickers.length) fail("현재 저PER 후보 풀에서 ticker를 읽지 못했습니다. --tickers를 직접 지정하세요.");
  }

  let rawPayload = null;
  let normalized;
  let errors = [];
  if (selfTest) {
    normalized = normalizeMarketPayload(makeSelfTestPayload(), { provider: "self-test" });
    options.tickers = ["TESTA", "TESTB"];
  } else if (args.input) {
    const inputPath = resolvePath(args.input);
    const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));
    normalized = normalizeMarketPayload(input, { provider: options.provider, ticker: args.ticker });
    options.rawInput = path.relative(ROOT, inputPath);
    options.tickers = options.tickers.length ? options.tickers : normalized.instruments.map((item) => item.ticker).filter((ticker) => ticker !== options.benchmark);
  } else {
    if (options.provider !== "massive") fail(`지원하는 온라인 공급처는 현재 massive뿐입니다: ${options.provider}`);
    if (!options.tickers.length) fail("온라인 수집에는 --tickers가 필요합니다.");
    const fetched = await fetchMassivePayload(options);
    rawPayload = fetched.rawPayload;
    normalized = fetched.normalized;
    errors = fetched.errors;
  }

  const snapshot = buildSnapshot(normalized, options);
  if (errors.length) snapshot.quality.providerErrors = errors;

  if (selfTest) {
    const checks = snapshot.data.flatMap((row) => row.trend.rules.map((rule) => rule.status));
    if (snapshot.data.length !== 2 || checks.length !== 16 || checks.every((status) => status === "unknown")) {
      fail("self-test에서 Trend 조건 계산 결과가 비어 있습니다.");
    }
    console.log(JSON.stringify({ ok: true, dataCount: snapshot.data.length, statuses: checks, benchmark: snapshot.benchmark }, null, 2));
    return snapshot;
  }

  const today = new Date().toISOString().slice(0, 10);
  const rawOutput = args["raw-output"] ? resolvePath(args["raw-output"]) : resolvePath(null, `data/raw/market/massive-daily-bars-${today}.json`);
  const output = args.output ? resolvePath(args.output) : resolvePath(null, `data/processed/quant-trend/daily-snapshot-${today}.json`);
  const appOutput = args["app-output"] ? resolvePath(args["app-output"]) : resolvePath(null, "data/app/quant-trend-snapshot.js");
  if (rawPayload) writeJsonAtomic(rawOutput, rawPayload, { force });
  writeJsonAtomic(output, snapshot, { force });
  writeAppAdapter(appOutput, snapshot, { force });
  console.log(JSON.stringify({
    ok: true,
    provider: snapshot.provider,
    asOf: snapshot.asOf,
    dataCount: snapshot.data.length,
    missingTickers: snapshot.coverage.missingTickers,
    trendEvaluated: snapshot.data.filter((row) => row.trend.status === "evaluated").length,
    files: {
      raw: rawPayload ? path.relative(ROOT, rawOutput) : null,
      processed: path.relative(ROOT, output),
      app: path.relative(ROOT, appOutput),
    },
  }, null, 2));
  return snapshot;
}

module.exports = {
  TREND_RULES,
  normalizeBar,
  normalizeBars,
  normalizeMarketPayload,
  calculateBaseFeatures,
  evaluateConditions,
  buildSnapshot,
  buildMassiveUrl,
  fetchJsonWithRetry,
  percentileRank,
  parseArgs,
  makeSelfTestPayload,
};

if (require.main === module) {
  main().catch((error) => {
    console.error(`quant-trend-pipeline: ${error.message}`);
    process.exitCode = 1;
  });
}
