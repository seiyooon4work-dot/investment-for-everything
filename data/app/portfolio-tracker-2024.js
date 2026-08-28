// Section 06 only: five requested portfolios built from the attached 2024 universe.
// The selections are stored explicitly so the result remains reproducible in the UI.
(() => {
  const source = {
    file: "nasdaq in 2024.csv",
    portfolioFile: "five_portfolios_from_nasdaq_2024.xlsx",
    portfolioFilePath: "/Users/seiyoonchang/.codex/.chatgpt-projects/g-p-6a774c1dfe5c8191a34c1d83061f1504/outputs/five-portfolios-20260819/five_portfolios_from_nasdaq_2024.xlsx",
    index: "NQUS500LC",
    asOf: "2024-01-01",
    lastTradingDay: "2023-12-29",
    universeCount: 499,
    universeRule: "CSV 종목만 사용 · source_order는 시장가치 순위로 사용하지 않음"
  };

  const csvHolding = (ticker, company, sector, weight, sourceRank) => ({
    ticker,
    company,
    sector,
    weight,
    sourceRank
  });

  const equalRandom10 = [
    csvHolding("CNP", "CenterPoint Energy", "유틸리티", 10, 104),
    csvHolding("ICE", "Intercontinental Exchange", "금융", 10, 234),
    csvHolding("ZTS", "Zoetis", "헬스케어", 10, 499),
    csvHolding("GIS", "General Mills", "필수소비재", 10, 205),
    csvHolding("ZS", "Zscaler", "기술", 10, 498),
    csvHolding("FTV", "Fortive", "산업재", 10, 198),
    csvHolding("MNST", "Monster Beverage", "필수소비재", 10, 308),
    csvHolding("LYB", "LyondellBasell", "소재", 10, 287),
    csvHolding("ECL", "Ecolab", "소재", 10, 155),
    csvHolding("MOS", "Mosaic", "소재", 10, 311)
  ];

  const randomWeighted10 = [
    csvHolding("IPG", "Interpublic Group", "커뮤니케이션 서비스", 18, 243),
    csvHolding("BSX", "Boston Scientific", "헬스케어", 23, 72),
    csvHolding("KO", "Coca-Cola", "필수소비재", 8, 265),
    csvHolding("PNC", "PNC Financial Services", "금융", 1, 370),
    csvHolding("FLT", "Fleetcor", "금융", 11, 194),
    csvHolding("MET", "MetLife", "금융", 6, 300),
    csvHolding("FTNT", "Fortinet", "기술", 8, 197),
    csvHolding("MRK", "Merck", "헬스케어", 4, 314),
    csvHolding("ELS", "Equity LifeStyle Properties", "부동산", 14, 161),
    csvHolding("SBAC", "SBA Communications", "부동산", 7, 399)
  ];

  const marketCapTop10 = [
    csvHolding("AAPL", "Apple", "기술", 10, 2),
    csvHolding("MSFT", "Microsoft", "기술", 10, 320),
    csvHolding("GOOGL", "Alphabet Class A", "커뮤니케이션 서비스", 10, 208),
    csvHolding("AMZN", "Amazon", "임의소비재", 10, 31),
    csvHolding("NVDA", "NVIDIA", "기술", 10, 339),
    csvHolding("META", "Meta Platforms", "커뮤니케이션 서비스", 10, 301),
    csvHolding("TSLA", "Tesla", "임의소비재", 10, 445),
    csvHolding("BRK.B", "Berkshire Hathaway Class B", "금융", 10, 70),
    csvHolding("LLY", "Eli Lilly", "헬스케어", 10, 277),
    csvHolding("AVGO", "Broadcom", "기술", 10, 43)
  ];

  const equalRandom20 = [
    csvHolding("STT", "State Street", "금융", 5, 418),
    csvHolding("LRCX", "Lam Research", "기술", 5, 283),
    csvHolding("GM", "General Motors", "임의소비재", 5, 207),
    csvHolding("CTSH", "Cognizant", "기술", 5, 122),
    csvHolding("VMC", "Vulcan Materials", "소재", 5, 467),
    csvHolding("ZTS", "Zoetis", "헬스케어", 5, 499),
    csvHolding("WBA", "Walgreens Boots Alliance", "필수소비재", 5, 475),
    csvHolding("DGX", "Quest Diagnostics", "헬스케어", 5, 137),
    csvHolding("GIS", "General Mills", "필수소비재", 5, 205),
    csvHolding("IEX", "IDEX", "산업재", 5, 236),
    csvHolding("ZM", "Zoom Video", "기술", 5, 497),
    csvHolding("TJX", "TJX Companies", "임의소비재", 5, 436),
    csvHolding("HOLX", "Hologic", "헬스케어", 5, 222),
    csvHolding("PG", "Procter & Gamble", "필수소비재", 5, 361),
    csvHolding("CRM", "Salesforce", "기술", 5, 114),
    csvHolding("PEP", "PepsiCo", "필수소비재", 5, 358),
    csvHolding("JBL", "Jabil", "기술", 5, 252),
    csvHolding("WPC", "W. P. Carey", "부동산", 5, 486),
    csvHolding("ZBRA", "Zebra Technologies", "기술", 5, 496),
    csvHolding("AEE", "Ameren", "유틸리티", 5, 13)
  ];

  const portfolios = [
    {
      id: "tracker-1",
      name: "S&P 500 지수",
      label: "지수 100% · SPY 프록시",
      description: "S&P 500 지수는 SPY 추적 ETF를 투자 가능한 프록시로 표시",
      sourceFile: "S&P 500 지수",
      sourceSheet: "benchmark",
      sourceRange: "SPY",
      asOf: source.asOf,
      rule: "S&P 500 지수 자체를 직접 매수할 수 없어 SPY를 추적 프록시로 사용",
      holdings: [{ ticker: "SPY", company: "SPDR S&P 500 ETF Trust", sector: "지수", weight: 100 }]
    },
    {
      id: "tracker-2",
      name: "무작위 10종목 · 균등",
      label: "무작위 10종목 · 각 10%",
      description: "첨부 CSV 499개 종목에서 시드 20240101로 10개를 추출하고 각 10% 배분",
      sourceFile: source.file,
      sourceSheet: "CSV",
      sourceRange: "전체 499개",
      asOf: source.asOf,
      randomSeed: 20240101,
      rule: "재현 가능한 의사난수 표본 10개 · 각 10%",
      holdings: equalRandom10
    },
    {
      id: "tracker-3",
      name: "무작위 10종목 · 난수 비중",
      label: "무작위 10종목 · 난수 비중",
      description: "같은 CSV에서 시드 20240102로 10개를 추출하고 시드 기반 난수 비중을 배분",
      sourceFile: source.file,
      sourceSheet: "CSV",
      sourceRange: "전체 499개",
      asOf: source.asOf,
      randomSeed: 20240102,
      weightSeed: 20240102,
      rule: "재현 가능한 의사난수 표본 10개 · 난수 정수 비중 합계 100%",
      holdings: randomWeighted10
    },
    {
      id: "tracker-4",
      name: "시가총액 상위 10종목",
      label: "시가총액 상위 10종목 · 각 10%",
      description: "2023-12-29 시가총액 상위권을 첨부 CSV와 교집합한 10개 종목을 각 10% 보유",
      sourceFile: source.file,
      sourceSheet: "CSV",
      sourceRange: "시가총액 상위 10 교집합",
      asOf: source.asOf,
      marketCapAsOf: "2023-12-29",
      marketCapSource: "AssetMarketCap historical US companies · 2023-12-29",
      marketCapSourceUrl: "https://assetmarketcap.com/2023-12-29/companies/",
      rule: "시장가치 기준 상위 10개 · 각 10% · CSV에 존재하는 티커와 1개 share class만 유지",
      holdings: marketCapTop10
    },
    {
      id: "tracker-5",
      name: "무작위 20종목 · 균등",
      label: "무작위 20종목 · 각 5%",
      description: "첨부 CSV 499개 종목에서 시드 20240103으로 20개를 추출하고 각 5% 배분",
      sourceFile: source.file,
      sourceSheet: "CSV",
      sourceRange: "전체 499개",
      asOf: source.asOf,
      randomSeed: 20240103,
      rule: "재현 가능한 의사난수 표본 20개 · 각 5%",
      holdings: equalRandom20
    }
  ];

  window.PORTFOLIO_TRACKER_DATA = {
    version: "portfolio-tracker-2024.v1",
    source,
    benchmarkException: "S&P 500 요청은 SPY 프록시로 표시하며, 나머지 주식 구성은 첨부 CSV 유니버스만 사용",
    portfolios
  };

  window.PORTFOLIO_TRACKER_PRICE_DATA = {
    status: "pending",
    sourceWorkbook: source.file,
    sourceSheets: { raw: "CSV", portfolioPaths: "가격 이력 연결 대기" },
    requestedAsOf: source.asOf,
    startDate: source.lastTradingDay,
    lastTradingDate: null,
    priceSource: "2024 일별 종가 원자료 연결 대기",
    dates: [],
    prices: {},
    portfolioPaths: {}
  };
})();
