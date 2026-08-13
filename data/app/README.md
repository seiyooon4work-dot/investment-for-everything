# App 어댑터

`processed/` 스냅샷을 정적 `file://` 페이지에서 읽을 수 있도록 `window.*` 전역으로 노출합니다. 현재 앱은 기존 사용자 편집을 보호하기 위해 이 파일들을 자동 로드하지 않습니다. Processed를 기준으로 앱 연결을 바꾸는 작업은 소스 드리프트 검증 후 별도로 진행해야 합니다.

예외적으로 `quant-trend-snapshot.js`는 새 Quant × Trend 화면의 선택적 연결 지점입니다. 기본 파일은 `window.QUANT_TREND_SNAPSHOT = null`인 안전한 placeholder이고, 파이프라인이 Processed 스냅샷을 만든 뒤 명시적으로 교체할 때만 화면에 Trend 결과가 나타납니다. 기존 ETF·밸류에이션·저PER 어댑터의 우선순위나 사용자 편집 데이터는 바꾸지 않습니다.
