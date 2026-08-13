# Quant × Trend Template Processed 스냅샷

`daily-snapshot-YYYY-MM-DD.json`은 Raw 일봉을 정규화한 뒤 Quant 후보와 Trend Template 8개 조건을 계산한 결과입니다. Raw를 대체하지 않으며, 같은 날짜의 스냅샷을 교체하려면 명시적으로 `--force`를 사용해야 합니다.

## 계산 경계

- 50/150/200일 단순이동평균과 200DMA의 20거래일 전 대비 방향을 계산합니다.
- 52주 저점·고점은 최근 252개 관측 종가로 계산합니다.
- 252거래일 수익률은 시작값을 포함해 253개 종가가 필요하므로 기본 최소 일봉 수는 253개입니다.
- RS는 전체 후보군의 252일 수익률 백분위로 계산하며, 후보가 한 개뿐이면 의미 있는 백분위를 만들지 않고 `unknown`으로 둡니다.
- S&P는 `benchmark`에 별도 보관하고, 후보의 `relativeReturnToBenchmarkPct`는 후보 수익률에서 S&P 수익률을 뺀 값입니다.
- 데이터가 부족하면 `unknown`/`pending`으로 유지합니다. `unknown`을 `fail`로 바꾸어 점수를 부풀리거나 낮추지 않습니다.

스냅샷의 구조는 [`data/schemas/quant-trend-snapshot.schema.json`](../../schemas/quant-trend-snapshot.schema.json)에 기록되어 있습니다.

