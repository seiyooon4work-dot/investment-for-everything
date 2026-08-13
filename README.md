# Investment for Everything

통합 주식 분석 아카이브입니다.

## 구성

- `index.html`: 분석 선택 화면과 통합 리포트
- `writer.js`: 개인 분석 작성·기록 화면
- `screen_low_pe_q1_2025.js`: 저PER 스크리너 데이터 화면
- `data/`: 원자료 등록부, 가공 데이터, 앱 어댑터, 검증 스크립트
- `scripts/quant-trend-pipeline.js`: Quant × Trend 일봉 데이터 파이프라인

현재 통합본은 다음 6개 경로를 포함합니다.

1. 커뮤니티 시장 서사
2. 2025 Q1 밸류에이션
3. PER 0–10 기업 비교
4. 섹터 흐름
5. 내 기업 분석 작성
6. Quant × Trend

## 기준본과 복구 방지

GitHub의 `main` 브랜치를 최신 기준본으로 사용합니다. 로컬 복구본이나 오래된 백업을 기준으로 덮어쓰지 말고, 변경 전 `main`의 최신 상태를 확인합니다. 기능 수정은 별도 브랜치에서 진행한 뒤 변경 내용을 확인하고 `main`에 반영합니다.

## 로컬 확인

```bash
python3 -m http.server 4174 --bind 127.0.0.1
```

브라우저에서 `http://127.0.0.1:4174/index.html`을 엽니다.

## Quant × Trend 데이터

일별 OHLCV와 API 키가 연결되지 않은 상태에서는 Trend 결과를 임의로 채우지 않고 `연결 대기`로 표시합니다. `MASSIVE_API_KEY`는 파일에 저장하지 않고 환경변수로만 전달합니다.
