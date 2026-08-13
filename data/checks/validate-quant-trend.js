#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  buildSnapshot,
  makeSelfTestPayload,
  normalizeMarketPayload,
  TREND_RULES,
} = require("../../scripts/quant-trend-pipeline.js");

const ROOT = path.resolve(__dirname, "../..");

function error(message) {
  throw new Error(message);
}

function readJson(file) {
  const target = path.resolve(ROOT, file);
  if (!fs.existsSync(target)) error(`파일이 없습니다: ${file}`);
  return JSON.parse(fs.readFileSync(target, "utf8"));
}

function isDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function validateNormalized(payload) {
  if (payload.schemaVersion !== 1 || payload.datasetId !== "market-daily-bars-normalized") error("정규화 데이터셋 식별자가 올바르지 않습니다.");
  if (!Array.isArray(payload.instruments) || !payload.instruments.length) error("정규화 데이터에 instruments가 없습니다.");
  const tickers = new Set();
  for (const instrument of payload.instruments) {
    if (!instrument.ticker || tickers.has(instrument.ticker)) error(`ticker 중복 또는 누락: ${instrument.ticker}`);
    tickers.add(instrument.ticker);
    if (!Array.isArray(instrument.bars)) error(`bars 배열이 없습니다: ${instrument.ticker}`);
    let previous = null;
    const dates = new Set();
    for (const bar of instrument.bars) {
      if (!isDate(bar.date)) error(`날짜 형식 오류: ${instrument.ticker} ${bar.date}`);
      if (dates.has(bar.date)) error(`중복 날짜가 정규화 단계에 남아 있습니다: ${instrument.ticker} ${bar.date}`);
      if (previous && previous >= bar.date) error(`일봉 정렬 오류: ${instrument.ticker}`);
      if (!(bar.low <= bar.open && bar.low <= bar.close && bar.open <= bar.high && bar.close <= bar.high)) error(`OHLC 범위 오류: ${instrument.ticker} ${bar.date}`);
      if (bar.volume !== null && bar.volume < 0) error(`거래량 오류: ${instrument.ticker} ${bar.date}`);
      dates.add(bar.date);
      previous = bar.date;
    }
  }
  return { type: "normalized", instrumentCount: payload.instruments.length, tickers: [...tickers] };
}

function validateSnapshot(snapshot) {
  if (snapshot.schemaVersion !== 1 || snapshot.datasetId !== "quant-trend-daily") error("Processed 스냅샷 식별자가 올바르지 않습니다.");
  if (!Array.isArray(snapshot.data)) error("스냅샷 data 배열이 없습니다.");
  const tickers = new Set();
  let evaluated = 0;
  for (const row of snapshot.data) {
    if (!row.ticker || tickers.has(row.ticker)) error(`스냅샷 ticker 중복 또는 누락: ${row.ticker}`);
    tickers.add(row.ticker);
    if (!row.trend || row.trend.totalCount !== TREND_RULES.length || !Array.isArray(row.trend.rules) || row.trend.rules.length !== TREND_RULES.length) {
      error(`Trend 8조건 구조 오류: ${row.ticker}`);
    }
    const statuses = row.trend.rules.map((rule) => rule.status);
    if (statuses.some((status) => !["pass", "fail", "unknown"].includes(status))) error(`Trend 상태값 오류: ${row.ticker}`);
    const passCount = statuses.filter((status) => status === "pass").length;
    const evaluatedCount = statuses.filter((status) => status !== "unknown").length;
    if (passCount !== row.trend.passCount || evaluatedCount !== row.trend.evaluatedCount) error(`Trend 집계 불일치: ${row.ticker}`);
    if (row.trend.status === "evaluated") evaluated += 1;
    if (row.trend.evaluatedCount && row.trend.scorePct !== Number(((passCount / evaluatedCount) * 100).toFixed(1))) error(`Trend 점수 불일치: ${row.ticker}`);
    if (row.trend.evaluatedCount === 0 && row.trend.scorePct !== null) error(`unknown만 있는 행에 점수가 있습니다: ${row.ticker}`);
  }
  return { type: "snapshot", instrumentCount: snapshot.data.length, evaluated };
}

function main(argv = process.argv.slice(2)) {
  if (argv.includes("--self-test")) {
    const normalized = normalizeMarketPayload(makeSelfTestPayload(), { provider: "self-test" });
    const snapshot = buildSnapshot(normalized, { tickers: ["TESTA", "TESTB"], benchmark: "I:SPX" });
    validateNormalized(normalized);
    const result = validateSnapshot(snapshot);
    console.log(JSON.stringify({ ok: true, ...result }, null, 2));
    return;
  }
  const inputIndex = argv.indexOf("--input");
  if (inputIndex === -1 || !argv[inputIndex + 1]) error("사용법: node data/checks/validate-quant-trend.js --input PATH");
  const payload = readJson(argv[inputIndex + 1]);
  const result = payload.datasetId === "quant-trend-daily" ? validateSnapshot(payload) : validateNormalized(payload);
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
}

try {
  main();
} catch (err) {
  console.error(`validate-quant-trend: ${err.message}`);
  process.exitCode = 1;
}

