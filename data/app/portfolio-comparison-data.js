// User-entered and workbook-backed portfolio compositions for the Portfolio Comparison route.
// Keep weights as percentages; the view derives any unallocated remainder.
window.PORTFOLIO_COMPARISON_DATA = {
  version: "portfolio-comparison.v1",
  source: "사용자 입력 및 첨부 workbook",
  residualPolicy: "unallocated-cash",
  portfolios: [
    {
      id: "portfolio-1",
      name: "Portfolio 1",
      label: "균등 10종목",
      description: "지정한 10개 종목을 각각 10%로 배분",
      holdings: [
        { ticker: "XOM", company: "Exxon Mobil", sector: "에너지", weight: 10 },
        { ticker: "BLK", company: "BlackRock", sector: "금융", weight: 10 },
        { ticker: "MDLZ", company: "Mondelez International", sector: "필수소비재", weight: 10 },
        { ticker: "TRGP", company: "Targa Resources", sector: "에너지", weight: 10 },
        { ticker: "CMG", company: "Chipotle Mexican Grill", sector: "임의소비재", weight: 10 },
        { ticker: "GEHC", company: "GE HealthCare Technologies", sector: "헬스케어", weight: 10 },
        { ticker: "FCNCA", company: "First Citizens BancShares", sector: "금융", weight: 10 },
        { ticker: "PKG", company: "Packaging Corporation of America", sector: "소재", weight: 10 },
        { ticker: "CF", company: "CF Industries Holdings", sector: "소재", weight: 10 },
        { ticker: "HWM", company: "Howmet Aerospace", sector: "산업재", weight: 10 }
      ]
    },
    {
      id: "portfolio-2",
      name: "Terra Portfolio",
      label: "미국 Top 500 · 공격 70 / 수비 30",
      description: "첨부 모델의 22개 종목을 공격형 70%·수비형 30% 목표 비중으로 반영",
      sourceFile: "us_top_500_model_portfolio_70_30.xlsx",
      sourceSheet: "Portfolio",
      sourceRange: "A10:G32",
      asOf: "2026-08-17 KST",
      holdings: [
        { ticker: "NVDA", company: "NVIDIA", sector: "AI 인프라/반도체", weight: 10 },
        { ticker: "MSFT", company: "Microsoft", sector: "클라우드/AI 플랫폼", weight: 9 },
        { ticker: "GOOG", company: "Alphabet", sector: "검색/클라우드/AI", weight: 8 },
        { ticker: "AMZN", company: "Amazon", sector: "전자상거래/클라우드", weight: 7 },
        { ticker: "META", company: "Meta Platforms", sector: "광고/AI 플랫폼", weight: 6 },
        { ticker: "AVGO", company: "Broadcom", sector: "AI 인프라/반도체", weight: 6 },
        { ticker: "LLY", company: "Eli Lilly", sector: "비만/당뇨 치료", weight: 5 },
        { ticker: "ISRG", company: "Intuitive Surgical", sector: "수술 로보틱스", weight: 4 },
        { ticker: "PANW", company: "Palo Alto Networks", sector: "사이버보안", weight: 4 },
        { ticker: "GE", company: "GE Aerospace", sector: "항공우주/애프터마켓", weight: 4 },
        { ticker: "LRCX", company: "Lam Research", sector: "AI 인프라/반도체", weight: 3 },
        { ticker: "AAPL", company: "Apple", sector: "소비자 생태계/서비스", weight: 2 },
        { ticker: "PLTR", company: "Palantir", sector: "정부/기업 AI 소프트웨어", weight: 2 },
        { ticker: "BRK.B", company: "Berkshire Hathaway", sector: "복합사업/보험", weight: 6 },
        { ticker: "V", company: "Visa", sector: "결제 네트워크", weight: 4 },
        { ticker: "WMT", company: "Walmart", sector: "필수소비/옴니채널", weight: 4 },
        { ticker: "COST", company: "Costco", sector: "회원제 유통", weight: 4 },
        { ticker: "PG", company: "Procter & Gamble", sector: "생활용품", weight: 3 },
        { ticker: "JNJ", company: "Johnson & Johnson", sector: "제약/의료기기", weight: 3 },
        { ticker: "KO", company: "Coca-Cola", sector: "음료/소비재", weight: 2 },
        { ticker: "XOM", company: "Exxon Mobil", sector: "에너지/인플레이션", weight: 2 },
        { ticker: "WM", company: "Waste Management", sector: "폐기물/환경서비스", weight: 2 }
      ]
    },
    {
      id: "portfolio-3",
      name: "Sol Portfolio",
      label: "공격 70 / 방어 30",
      description: "지정한 16개 종목을 공격형 70%·방어형 30% 목표 비중으로 배분",
      holdings: [
        { ticker: "NVDA", company: "NVIDIA", sector: "AI 인프라/반도체", weight: 10 },
        { ticker: "MSFT", company: "Microsoft", sector: "클라우드/AI 플랫폼", weight: 10 },
        { ticker: "GOOG", company: "Alphabet", sector: "검색/클라우드/AI", weight: 9 },
        { ticker: "AMZN", company: "Amazon", sector: "전자상거래/클라우드", weight: 8 },
        { ticker: "META", company: "Meta Platforms", sector: "광고/AI 플랫폼", weight: 7 },
        { ticker: "AVGO", company: "Broadcom", sector: "AI 인프라/반도체", weight: 7 },
        { ticker: "LLY", company: "Eli Lilly", sector: "비만/당뇨 치료", weight: 6 },
        { ticker: "GEV", company: "GE Vernova", sector: "전력 인프라/발전", weight: 5 },
        { ticker: "PWR", company: "Quanta Services", sector: "전력 인프라/산업재", weight: 4 },
        { ticker: "V", company: "Visa", sector: "결제 네트워크", weight: 4 },
        { ticker: "BRK.B", company: "Berkshire Hathaway", sector: "복합사업/보험", weight: 8 },
        { ticker: "WMT", company: "Walmart", sector: "필수소비/옴니채널", weight: 6 },
        { ticker: "JNJ", company: "Johnson & Johnson", sector: "제약/의료기기", weight: 5 },
        { ticker: "KO", company: "Coca-Cola", sector: "음료/소비재", weight: 4 },
        { ticker: "WM", company: "Waste Management", sector: "폐기물/환경서비스", weight: 4 },
        { ticker: "DUK", company: "Duke Energy", sector: "전력·유틸리티", weight: 3 }
      ]
    },
    {
      id: "portfolio-4",
      name: "Luna Portfolio",
      label: "공격 70 / 수비 30",
      description: "첨부 모델의 17개 종목을 공격형 70%·수비형 30% 목표 비중으로 반영",
      sourceFile: "portfolio_70_30_model.xlsx",
      sourceSheet: "Portfolio",
      sourceRange: "A15:J31",
      asOf: "2026-08-17 KST",
      holdings: [
        { ticker: "NVDA", company: "NVIDIA", sector: "AI 인프라/반도체", weight: 11 },
        { ticker: "AVGO", company: "Broadcom", sector: "AI 인프라/반도체", weight: 8 },
        { ticker: "MSFT", company: "Microsoft", sector: "클라우드/AI 플랫폼", weight: 7 },
        { ticker: "AMZN", company: "Amazon", sector: "전자상거래/클라우드", weight: 7 },
        { ticker: "META", company: "Meta Platforms", sector: "광고/AI 플랫폼", weight: 6 },
        { ticker: "GOOG", company: "Alphabet", sector: "검색/클라우드/AI", weight: 5 },
        { ticker: "AMD", company: "Advanced Micro Devices", sector: "AI 인프라/반도체", weight: 5 },
        { ticker: "ANET", company: "Arista Networks", sector: "AI 인프라/네트워크", weight: 4 },
        { ticker: "GE", company: "GE Aerospace", sector: "항공우주/애프터마켓", weight: 5 },
        { ticker: "LLY", company: "Eli Lilly", sector: "비만/당뇨 치료", weight: 6 },
        { ticker: "PWR", company: "Quanta Services", sector: "전력 인프라/산업재", weight: 6 },
        { ticker: "BRK.B", company: "Berkshire Hathaway", sector: "복합사업/보험", weight: 8 },
        { ticker: "JNJ", company: "Johnson & Johnson", sector: "제약/의료기기", weight: 6 },
        { ticker: "PG", company: "Procter & Gamble", sector: "생활용품", weight: 5 },
        { ticker: "WMT", company: "Walmart", sector: "필수소비/옴니채널", weight: 5 },
        { ticker: "KO", company: "Coca-Cola", sector: "음료/소비재", weight: 3 },
        { ticker: "WM", company: "Waste Management", sector: "폐기물/환경서비스", weight: 3 }
      ]
    }
  ]
};
