# Processed 스냅샷

이 폴더의 JSON이 현재 데이터셋별 기준값입니다.

- `etf-monthly.json`: `data` 아래에 월 목록과 시계열 배열을 보관합니다. `status: audit` 행도 유지합니다.
- `valuation-q1-2025.json`: `q1`, `q1MarketCap`, `recentMarketCap`을 분리해 보관합니다. 시가총액 지도는 배열이 아니라 ticker 키를 가진 객체입니다.
- `low-pe-q1-2025.json`: `data` 안에 후보 62개 전체를 보관하고, 선정 수는 `data.screen.selectedCount`로 기록합니다.

이 파일들은 계산 결과의 스냅샷이므로 원본(Raw)을 대체하지 않습니다. 원본을 확보하면 Raw를 먼저 추가하고, 새 Processed 파일을 별도 버전으로 생성합니다.

