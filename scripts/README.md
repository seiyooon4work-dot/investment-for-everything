# 실행 스크립트

## Quant × Trend 일봉 연결

`quant-trend-pipeline.js`는 다음 네 단계를 한 번에 실행합니다.

1. 공급처 원문 응답을 `data/raw/market/`에 저장
2. ticker·날짜별 OHLCV를 정규화하고 중복·이상치를 기록
3. `data/processed/quant-trend/`에 Quant·Trend 스냅샷 생성
4. `data/app/quant-trend-snapshot.js`에 안전한 브라우저 어댑터 생성

외부 요청 없이 계산 경로만 확인하려면:

```text
node scripts/quant-trend-pipeline.js --self-test
node data/checks/validate-quant-trend.js --self-test
```

실제 수집은 키를 환경변수로만 주입합니다.

```text
MASSIVE_API_KEY=... node scripts/quant-trend-pipeline.js \
  --provider massive --benchmark I:SPX \
  --from 2024-01-01 --to 2026-08-11
```

`--tickers`를 생략하면 현재 보관된 저PER 후보 풀 62개를 자동으로 읽고, 여기에 `I:SPX` 기준선을 추가합니다. 일부 종목만 먼저 연결하려면 `--tickers AAPL,MSFT,NVDA`처럼 직접 지정하면 됩니다.

기존 Processed 파일은 자동으로 덮어쓰지 않습니다. 날짜별 새 스냅샷이 이미 있으면 명시적으로 `--force`를 사용합니다. 앱 placeholder(`window.QUANT_TREND_SNAPSHOT = null`)만큼은 최초 연결 시 자동 교체됩니다.

## 포트폴리오 추적 가격 자동 갱신

`refresh-portfolio-tracker-prices.js`는 Quant × Trend 포트폴리오 화면에서 이미 연결된 가격 열만 갱신합니다. 원본 Excel 파일과 과거 값은 수정하지 않고, Yahoo Finance의 일별 비조정 종가가 모든 연결 종목에서 확인된 거래일만 앱 어댑터에 추가합니다.

```text
node scripts/refresh-portfolio-tracker-prices.js --dry-run
node scripts/refresh-portfolio-tracker-prices.js
```

GitHub Actions의 `refresh-portfolio-prices.yml`은 평일 22:30 UTC(미국 장 마감 후)와 수동 실행에서 같은 작업을 수행하고, 새 거래일이 있을 때만 앱 데이터 변경을 커밋합니다.
