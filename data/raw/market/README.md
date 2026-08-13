# 시장 일봉 Raw 보관

이 폴더는 공급처가 반환한 시장 데이터 원문을 보관하는 자리입니다. 원문은 다시 계산할 수 있어야 하므로 수동으로 열어 값을 고치거나 기존 파일을 덮어쓰지 않습니다.

현재 연결기는 Massive의 일별 OHLCV 응답을 다음 원칙으로 저장합니다.

- `adjusted=true` 요청 여부와 공급처 응답을 함께 보관합니다.
- API 키는 파일·로그·앱 코드에 쓰지 않고 `MASSIVE_API_KEY` 환경변수로만 전달합니다.
- 429/5xx는 제한된 횟수로 재시도하고, 끝내 실패한 ticker는 `requests[].error`에 남깁니다.
- 성공한 ticker와 실패한 ticker를 섞어 숨기지 않습니다. 실패가 있으면 Processed 스냅샷도 `quality.status: partial`입니다.
- 기본 파일명은 `massive-daily-bars-YYYY-MM-DD.json`이며 같은 이름이 이미 있으면 `--force` 없이는 교체하지 않습니다.

원문에서 값을 삭제하거나 보정하지 말고, 이상 행은 Processed 단계의 `quality.invalidCount`와 `invalidReasons`로 확인합니다.

## 요청 예시

```text
MASSIVE_API_KEY=... node scripts/quant-trend-pipeline.js \
  --provider massive \
  --benchmark I:SPX \
  --from 2024-01-01 \
  --to 2026-08-11
```

`--tickers`를 생략하면 현재 저PER 후보 풀을 자동 사용합니다. 키를 코드나 브라우저에 넣지 않는 것이 중요합니다.

공급처에서 받은 파일을 다시 계산할 때는 `--input`을 사용합니다. 이 모드에서는 네트워크를 호출하지 않습니다.
