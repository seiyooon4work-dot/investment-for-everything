(function () {
  "use strict";

  var STORAGE_KEY = "equity-fieldnote-authored-v1";
  var BACKUP_STORAGE_KEY = "equity-fieldnote-authored-v1-last-good";
  var KRX_CACHE_KEY = "equity-fieldnote-krx-chart-cache-v1";
  var KRX_CACHE_TTL = 10 * 60 * 1000;
  var homeView = document.getElementById("home-view");
  var detailView = document.getElementById("detail-view");
  var writerView = document.getElementById("writer-view");
  var writerDashboard = document.getElementById("writer-dashboard");
  var writerEditor = document.getElementById("writer-editor");
  var writerEntryView = document.getElementById("writer-entry-view");
  var writerStatus = document.getElementById("writer-status");
  var analysisForm = document.getElementById("analysis-form");
  var footnoteList = document.getElementById("footnote-list");
  var entryList = document.getElementById("entry-list");
  var storageRecoveryNotice = "";
  var entries = readEntries();
  var NOW_HISTORY = [
    { date: "2026-05-28", open: 107.00, high: 110.16, low: 104.60, close: 108.73, volume: 37670359 },
    { date: "2026-05-29", open: 118.48, high: 124.74, low: 116.29, close: 124.37, volume: 65633304 },
    { date: "2026-06-01", open: 135.77, high: 139.20, low: 131.61, close: 135.86, volume: 67726136 },
    { date: "2026-06-02", open: 129.90, high: 132.74, low: 124.12, close: 127.65, volume: 40020731 },
    { date: "2026-06-03", open: 127.99, high: 128.08, low: 117.34, close: 117.90, volume: 32916880 },
    { date: "2026-06-04", open: 121.94, high: 124.80, low: 119.36, close: 119.36, volume: 27222812 },
    { date: "2026-06-05", open: 119.19, high: 121.20, low: 111.56, close: 112.45, volume: 31043786 },
    { date: "2026-06-08", open: 111.69, high: 115.36, low: 111.20, close: 114.19, volume: 19514127 },
    { date: "2026-06-09", open: 110.31, high: 112.39, low: 103.08, close: 106.97, volume: 35259368 },
    { date: "2026-06-10", open: 105.28, high: 109.80, low: 104.73, close: 106.06, volume: 19724424 },
    { date: "2026-06-11", open: 103.03, high: 105.12, low: 101.33, close: 103.08, volume: 27835539 },
    { date: "2026-06-12", open: 103.38, high: 103.45, low: 98.42, close: 102.15, volume: 25810279 },
    { date: "2026-06-15", open: 104.80, high: 107.18, low: 103.35, close: 104.15, volume: 22623696 },
    { date: "2026-06-16", open: 102.90, high: 105.66, low: 101.20, close: 101.33, volume: 17020711 },
    { date: "2026-06-17", open: 100.68, high: 102.89, low: 95.09, close: 95.48, volume: 31630936 },
    { date: "2026-06-18", open: 95.31, high: 96.24, low: 92.45, close: 95.04, volume: 34980109 },
    { date: "2026-06-22", open: 93.30, high: 97.44, low: 91.48, close: 93.01, volume: 24780226 },
    { date: "2026-06-23", open: 95.14, high: 97.50, low: 94.61, close: 95.94, volume: 31505971 },
    { date: "2026-06-24", open: 94.00, high: 96.99, low: 93.42, close: 93.80, volume: 16836558 },
    { date: "2026-06-25", open: 91.70, high: 92.06, low: 89.39, close: 89.52, volume: 20717163 },
    { date: "2026-06-26", open: 90.44, high: 98.92, low: 90.00, close: 98.34, volume: 26866587 },
    { date: "2026-06-29", open: 100.48, high: 103.21, low: 99.47, close: 99.97, volume: 24775772 },
    { date: "2026-06-30", open: 97.31, high: 99.64, low: 96.95, close: 99.28, volume: 17772445 },
    { date: "2026-07-01", open: 103.60, high: 106.69, low: 101.77, close: 105.80, volume: 26067342 },
    { date: "2026-07-02", open: 106.22, high: 107.68, low: 103.84, close: 106.32, volume: 19328990 },
    { date: "2026-07-06", open: 104.10, high: 110.64, low: 103.34, close: 107.93, volume: 16159311 },
    { date: "2026-07-07", open: 111.55, high: 113.79, low: 109.04, close: 110.73, volume: 21419017 },
    { date: "2026-07-08", open: 106.21, high: 108.44, low: 105.40, close: 107.78, volume: 13935657 },
    { date: "2026-07-09", open: 102.03, high: 109.25, low: 101.51, close: 108.84, volume: 14107097 },
    { date: "2026-07-10", open: 111.27, high: 111.50, low: 105.71, close: 107.71, volume: 9672521 },
    { date: "2026-07-13", open: 109.50, high: 113.03, low: 107.65, close: 111.26, volume: 16524782 },
    { date: "2026-07-14", open: 103.74, high: 107.96, low: 102.61, close: 104.85, volume: 22822568 },
    { date: "2026-07-15", open: 106.50, high: 108.75, low: 104.33, close: 104.73, volume: 13682244 },
    { date: "2026-07-16", open: 104.94, high: 105.86, low: 99.31, close: 104.01, volume: 20098600 },
    { date: "2026-07-17", open: 102.88, high: 105.83, low: 102.64, close: 103.24, volume: 16112854 },
    { date: "2026-07-20", open: 100.52, high: 105.33, low: 98.43, close: 104.70, volume: 20414631 },
    { date: "2026-07-21", open: 101.65, high: 104.58, low: 101.05, close: 102.06, volume: 18268624 },
    { date: "2026-07-22", open: 100.87, high: 101.16, low: 94.74, close: 95.46, volume: 36404836 },
    { date: "2026-07-23", open: 100.01, high: 100.25, low: 91.53, close: 91.94, volume: 47536556 },
    { date: "2026-07-24", open: 94.92, high: 98.93, low: 94.87, close: 98.78, volume: 29448877 },
    { date: "2026-07-27", open: 101.87, high: 108.15, low: 100.35, close: 105.56, volume: 32347711 },
    { date: "2026-07-28", open: 106.88, high: 112.28, low: 106.50, close: 110.62, volume: 32937353 },
    { date: "2026-07-29", open: 110.42, high: 118.36, low: 109.50, close: 115.76, volume: 39855586 },
    { date: "2026-07-30", open: 110.50, high: 113.12, low: 106.38, close: 110.07, volume: 29199972 },
    { date: "2026-07-31", open: 108.50, high: 112.39, low: 106.05, close: 111.23, volume: 18895457 },
    { date: "2026-08-03", open: 114.51, high: 119.64, low: 113.70, close: 114.19, volume: 24182559 },
    { date: "2026-08-04", open: 112.59, high: 118.33, low: 112.00, close: 118.14, volume: 18694348 },
    { date: "2026-08-05", open: 119.90, high: 120.00, low: 115.71, close: 117.22, volume: 14350731 },
    { date: "2026-08-06", open: 113.00, high: 117.42, low: 111.80, close: 117.35, volume: 14677040 },
    { date: "2026-08-07", open: 121.67, high: 126.15, low: 120.96, close: 124.88, volume: 25105417 }
  ];

  function parseStoredEntries(raw) {
    if (!raw) return null;
    try {
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function readEntries() {
    try {
      var primaryRaw = window.localStorage.getItem(STORAGE_KEY);
      var primary = parseStoredEntries(primaryRaw);
      if (primary) return primary;
      var backup = parseStoredEntries(window.localStorage.getItem(BACKUP_STORAGE_KEY));
      if (backup) {
        storageRecoveryNotice = primaryRaw ? "저장된 분석을 최근 안전 백업에서 복구했어. 다음 저장 전에 기록 백업하기를 눌러줘." : "최근 안전 백업에서 분석을 복구했어. 기록 백업하기로 파일도 남겨줘.";
        try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(backup)); } catch (restoreError) {}
        return backup;
      }
      if (primaryRaw) storageRecoveryNotice = "저장된 분석 형식을 읽지 못했어. 기록 백업 파일을 확인해줘.";
      return [];
    } catch (error) {
      storageRecoveryNotice = "브라우저 저장소에 접근할 수 없어. 기록 백업 파일을 별도로 보관해줘.";
      return [];
    }
  }

  function saveEntries() {
    var serialized = JSON.stringify(entries);
    try {
      // 백업을 먼저 남긴 뒤 본 저장소를 갱신한다. 본 저장이 실패해도
      // 다음 로드에서 최근 상태를 복구할 수 있도록 한다.
      window.localStorage.setItem(BACKUP_STORAGE_KEY, serialized);
      window.localStorage.setItem(STORAGE_KEY, serialized);
      storageRecoveryNotice = "";
    } catch (error) {
      setStatus("브라우저 저장이 제한되어 현재 화면에서만 유지될 수 있어. 기록 백업하기로 파일을 남겨줘.");
    }
  }

  function makeId() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return "fieldnote-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  function today() {
    var date = new Date();
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
  }

  function displayDate(value, compact) {
    if (!value) return "—";
    var parts = String(value).split("-");
    if (parts.length !== 3) return value;
    return compact ? parts[0] + "." + parts[1] : parts[0] + "." + parts[1] + "." + parts[2];
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safeUrl(value) {
    var url = String(value || "").trim();
    return /^https?:\/\//i.test(url) ? url : "";
  }

  function setStatus(message) {
    writerStatus.textContent = message || "";
  }

  function setVisibleView(view) {
    var active = view === "home" ? homeView : view === "detail" ? detailView : writerView;
    [homeView, detailView, writerView].forEach(function (element) {
      var selected = element === active;
      element.classList.toggle("is-active", selected);
      element.hidden = !selected;
    });
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function showMode(mode) {
    writerDashboard.hidden = mode !== "dashboard";
    writerEditor.hidden = mode !== "editor";
    writerEntryView.hidden = mode !== "entry";
    document.querySelectorAll("[data-writer-mode]").forEach(function (button) {
      var selected = button.dataset.writerMode === mode || (mode === "entry" && button.dataset.writerMode === "dashboard");
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-selected", String(selected));
    });
    if (mode === "dashboard") renderDashboard();
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function openWriter(mode) {
    setVisibleView("writer");
    window.history.replaceState({ view: "write" }, "", window.location.pathname + "#write");
    setStatus(storageRecoveryNotice || "");
    if (mode === "editor") startNew();
    else showMode("dashboard");
  }

  function renumberFootnotes() {
    footnoteList.querySelectorAll(".footnote-row").forEach(function (row, index) {
      row.querySelector(".footnote-number").textContent = index + 1;
    });
  }

  function addFootnote(note) {
    var data = note || {};
    var row = document.createElement("div");
    row.className = "footnote-row";
    row.dataset.footnoteRow = "true";
    row.innerHTML =
      "<span class=\"footnote-number\"></span>" +
      "<input type=\"text\" data-footnote-source placeholder=\"출처명\" value=\"" + escapeHtml(data.source || "") + "\">" +
      "<input type=\"text\" data-footnote-note placeholder=\"각주 메모\" value=\"" + escapeHtml(data.note || "") + "\">" +
      "<input type=\"url\" data-footnote-url placeholder=\"https:// 출처 URL (선택)\" value=\"" + escapeHtml(data.url || "") + "\">" +
      "<button class=\"remove-footnote\" type=\"button\" aria-label=\"각주 삭제\">×</button>";
    row.querySelector(".remove-footnote").addEventListener("click", function () {
      row.remove();
      renumberFootnotes();
    });
    footnoteList.appendChild(row);
    renumberFootnotes();
  }

  function collectFootnotes() {
    return Array.from(footnoteList.querySelectorAll(".footnote-row")).map(function (row) {
      return {
        source: row.querySelector("[data-footnote-source]").value.trim(),
        note: row.querySelector("[data-footnote-note]").value.trim(),
        url: row.querySelector("[data-footnote-url]").value.trim()
      };
    }).filter(function (note) {
      return note.source || note.note || note.url;
    });
  }

  function resetForm() {
    analysisForm.reset();
    document.getElementById("analysis-id").value = "";
    document.getElementById("analysis-date").value = today();
    document.getElementById("analysis-type").value = "기업 분석";
    document.getElementById("analysis-chart-source").value = "auto";
    document.getElementById("editor-heading").textContent = "새 기업 분석 작성";
    footnoteList.innerHTML = "";
    addFootnote();
  }

  function startNew() {
    setVisibleView("writer");
    showMode("editor");
    resetForm();
    setStatus("");
    document.getElementById("analysis-company").focus();
  }

  function editEntry(id) {
    var entry = entries.find(function (item) { return item.id === id; });
    if (!entry) return;
    setVisibleView("writer");
    showMode("editor");
    document.getElementById("analysis-id").value = entry.id;
    document.getElementById("analysis-company").value = entry.company || "";
    document.getElementById("analysis-ticker").value = entry.ticker || "";
    document.getElementById("analysis-date").value = entry.date || today();
    document.getElementById("analysis-type").value = entry.type || "기업 분석";
    document.getElementById("analysis-chart-source").value = chartSourceForEntry(entry);
    document.getElementById("analysis-title-input").value = entry.title || "";
    document.getElementById("analysis-body").value = entry.body || "";
    document.getElementById("editor-heading").textContent = "기업 분석 수정";
    footnoteList.innerHTML = "";
    (entry.footnotes || []).forEach(addFootnote);
    if (!(entry.footnotes || []).length) addFootnote();
    setStatus("");
  }

  function renderChart() {
    var chart = document.getElementById("activity-chart");
    if (!entries.length) {
      chart.innerHTML = "<div class=\"chart-empty\"><span>아직 저장된 분석이 없습니다.<br>첫 분석을 작성하면 날짜별 막대가 나타납니다.</span></div>";
      return;
    }
    var countByMonth = {};
    entries.forEach(function (entry) {
      var month = String(entry.date || "").slice(0, 7) || "날짜 없음";
      countByMonth[month] = (countByMonth[month] || 0) + 1;
    });
    var months = Object.keys(countByMonth).sort().slice(-8);
    var max = Math.max.apply(null, months.map(function (month) { return countByMonth[month]; }).concat([1]));
    chart.innerHTML = "<div class=\"activity-bars\" role=\"img\" aria-label=\"날짜별 작성 분석 수 막대 차트\">" +
      months.map(function (month) {
        var count = countByMonth[month];
        var height = Math.max(5, Math.round((count / max) * 100));
        return "<div class=\"activity-bar-item\"><span class=\"activity-bar-value\">" + count + "</span><span class=\"activity-bar-track\"><span class=\"activity-bar-fill\" style=\"height:" + height + "%\"></span></span><span class=\"activity-bar-label\">" + escapeHtml(month.replace("-", ".")) + "</span></div>";
      }).join("") + "</div>";
  }

  function renderDashboard() {
    var sorted = entries.slice().sort(function (a, b) {
      return String(b.date || "").localeCompare(String(a.date || "")) || String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
    });
    var companies = {};
    sorted.forEach(function (entry) {
      var name = String(entry.company || "").trim().toUpperCase();
      if (name) companies[name] = true;
    });
    document.getElementById("writer-entry-count").textContent = sorted.length;
    document.getElementById("writer-company-count").textContent = Object.keys(companies).length;
    document.getElementById("writer-latest-date").textContent = sorted[0] ? displayDate(sorted[0].date, true) : "—";
    renderChart();

    if (!sorted.length) {
      entryList.innerHTML = "<div class=\"empty-state\"><strong>아직 작성한 분석이 없습니다.</strong><p>기업과 날짜를 먼저 적고, 네 방식대로 분석을 쌓아보세요.</p><button class=\"writer-action primary-action\" type=\"button\" id=\"empty-new-analysis\">＋ 첫 분석 작성</button></div>";
      document.getElementById("empty-new-analysis").addEventListener("click", startNew);
      return;
    }

    entryList.innerHTML = sorted.map(function (entry) {
      var excerpt = String(entry.body || "").replace(/\s+/g, " ").trim();
      var footnoteText = (entry.footnotes || []).length + "개 각주";
      return "<article class=\"entry-card\" data-entry-id=\"" + escapeHtml(entry.id) + "\">" +
        "<div class=\"entry-main\" data-open-entry=\"" + escapeHtml(entry.id) + "\" tabindex=\"0\" role=\"button\" aria-label=\"" + escapeHtml(entry.title || "분석 보기") + "\">" +
        "<div class=\"entry-kicker\"><span class=\"entry-company\">" + escapeHtml(entry.company || "기업 미입력") + (entry.ticker ? " · " + escapeHtml(entry.ticker) : "") + "</span><span>" + displayDate(entry.date) + "</span><span>" + escapeHtml(entry.type || "기업 분석") + "</span><span>차트 · " + escapeHtml(chartSourceLabel(entry)) + "</span><span>" + footnoteText + "</span></div>" +
        "<h3>" + escapeHtml(entry.title || "제목 없음") + "</h3><p class=\"entry-excerpt\">" + escapeHtml(excerpt || "작성된 본문이 없습니다.") + "</p></div>" +
        "<div class=\"entry-actions\"><button type=\"button\" data-edit-entry=\"" + escapeHtml(entry.id) + "\">수정</button><button class=\"delete-entry\" type=\"button\" data-delete-entry=\"" + escapeHtml(entry.id) + "\">삭제</button></div>" +
        "</article>";
    }).join("");
  }

  function renderBody(body, footnotes) {
    var html = escapeHtml(body || "");
    html = html.replace(/\[(\d+)\]/g, function (match, number) {
      return footnotes[Number(number) - 1] ? "<sup class=\"footnote-marker\"><a href=\"#saved-footnote-" + number + "\">[" + number + "]</a></sup>" : match;
    });
    return html.replace(/\n/g, "<br>");
  }

  function tradingViewSymbol(entry) {
    var ticker = String(entry.ticker || "").trim().toUpperCase().replace(/\s+/g, "");
    var company = String(entry.company || "").toLowerCase();
    if (!ticker && (company.indexOf("servicenow") >= 0 || company.indexOf("서비스나우") >= 0)) ticker = "NOW";
    if (!ticker) return "";
    var koreanSuffix = ticker.match(/^(.+)\.(KS|KQ)$/);
    if (koreanSuffix) return "KRX:" + koreanSuffix[1];
    return ticker.indexOf(":") >= 0 ? ticker : (ticker === "NOW" ? "NYSE:NOW" : "NASDAQ:" + ticker);
  }

  function chartSourceForEntry(entry) {
    var source = String(entry && entry.chartSource || "auto").toLowerCase();
    return ["auto", "tradingview", "krx", "both"].indexOf(source) >= 0 ? source : "auto";
  }

  function chartSourceLabel(entry) {
    var source = chartSourceForEntry(entry);
    return source === "both" ? "TradingView + KRX" : source === "tradingview" ? "TradingView" : source === "krx" ? "KRX" : "자동";
  }

  function isKrxSymbol(symbol) {
    return String(symbol || "").indexOf("KRX:") === 0;
  }

  function tradingViewUrl(symbol) {
    var slug = String(symbol || "").replace(/:/g, "-").replace(/[^A-Z0-9._-]/gi, "");
    return "https://www.tradingview.com/symbols/" + encodeURIComponent(slug) + "/";
  }

  function yahooKrxSymbol(entry) {
    var ticker = String(entry.ticker || "").trim().toUpperCase().replace(/\s+/g, "");
    if (/\.K[QS]$/.test(ticker)) return ticker;
    var code = ticker.replace(/^KRX:/, "");
    return code ? code + ".KS" : "";
  }

  function renderKrxChart(entry, symbol) {
    var code = symbol.replace(/^KRX:/, "");
    var symbolUrl = tradingViewUrl(symbol);
    return "<section class=\"price-chart-shell\" id=\"authored-price-chart-section\">" +
      "<div class=\"price-chart-head\"><div><p class=\"eyebrow\">Fieldnote market view · " + escapeHtml(symbol) + "</p><h2>시장 가격 흐름</h2><p>TradingView 위젯에서 제공되지 않는 KRX 종목은 이 화면의 데이터 차트로 보여줘.</p></div></div>" +
      "<div class=\"chart-context-strip\"><span><b>기업</b> " + escapeHtml(entry.company || code) + "</span><span><b>기록일</b> " + displayDate(entry.date) + "</span><span><b>분석 유형</b> " + escapeHtml(entry.type || "기업 분석") + "</span><span class=\"chart-context-note\">한국 종목용 Fieldnote 차트</span></div>" +
      "<div class=\"trading-chart krx-chart-frame\" data-krx-chart data-krx-symbol=\"" + escapeHtml(yahooKrxSymbol(entry)) + "\"><div class=\"chart-toolbar\"><div class=\"chart-symbol\"><strong>KRX:" + escapeHtml(code) + "</strong><span>1D · KRW · Fieldnote</span></div><div class=\"chart-controls\"><div class=\"chart-range-buttons\"><button type=\"button\" data-chart-range=\"20\">1M</button><button type=\"button\" class=\"is-selected\" data-chart-range=\"50\">3M</button><button type=\"button\" data-chart-range=\"all\">ALL</button></div><div class=\"chart-zoom-buttons\" aria-label=\"차트 확대 축소\"><button type=\"button\" data-chart-zoom=\"out\" aria-label=\"차트 축소\" title=\"축소\">−</button><span data-chart-zoom-label aria-live=\"polite\">전체</span><button type=\"button\" data-chart-zoom=\"in\" aria-label=\"차트 확대\" title=\"확대\">＋</button><button type=\"button\" data-chart-zoom=\"reset\" title=\"확대 축소 초기화\">초기화</button></div></div></div><div class=\"chart-readout\" id=\"chart-readout\">데이터를 불러오는 중…</div><div class=\"krx-chart-viewport\"><svg class=\"price-chart-svg\" id=\"authored-price-chart\" viewBox=\"0 0 920 500\" role=\"img\" aria-label=\"KRX " + escapeHtml(code) + " 최근 실제 일별 캔들 차트\"></svg><div class=\"krx-chart-loading\" data-krx-loading><strong>한국 종목 차트를 준비하는 중…</strong><small>시장 데이터를 불러오고 있어.</small></div></div></div>" +
      "<div class=\"price-chart-source\"><span>KRX 데이터 · Yahoo Finance chart endpoint</span><span><a href=\"" + escapeHtml(symbolUrl) + "\" target=\"_blank\" rel=\"noopener\">TradingView 원본 페이지 열기 ↗</a></span></div>" +
      "</section>";
  }

  function money(value) {
    return "$" + Number(value).toFixed(2);
  }

  function compactVolume(value) {
    if (value >= 1000000) return (value / 1000000).toFixed(1) + "M";
    if (value >= 1000) return (value / 1000).toFixed(0) + "K";
    return String(value);
  }

  function candleReadout(point) {
    return point.date + "  O " + money(point.open) + "  H " + money(point.high) + "  L " + money(point.low) + "  C " + money(point.close) + "  Vol " + compactVolume(point.volume);
  }

  function renderTradingViewChart(entry, symbol) {
    var symbolUrl = tradingViewUrl(symbol);
    var company = entry.company || symbol;
    return "<section class=\"price-chart-shell\" id=\"authored-price-chart-section\">" +
      "<div class=\"price-chart-head\"><div><p class=\"eyebrow\">Fieldnote market view · " + escapeHtml(symbol) + "</p><h2>시장 가격 흐름</h2><p>이 기록의 기업을 기준으로 보는 시장 화면이야. 차트 안에서 시간봉·유형·지표를 바꿀 수 있어.</p></div></div>" +
      "<div class=\"chart-context-strip\"><span><b>기업</b> " + escapeHtml(company) + "</span><span><b>기록일</b> " + displayDate(entry.date) + "</span><span><b>분석 유형</b> " + escapeHtml(entry.type || "기업 분석") + "</span><span class=\"chart-context-note\">내 분석과 시장 흐름을 한 화면에서 확인</span></div>" +
      "<div class=\"tradingview-widget-container tradingview-widget-frame\" data-tradingview-frame data-tradingview-symbol=\"" + escapeHtml(symbol) + "\"><div class=\"tradingview-widget-container__widget\"></div><div class=\"tradingview-widget-loading\" data-tradingview-loading><strong>시장 차트를 준비하는 중…</strong><small>외부 시세 화면을 불러오고 있어.</small></div><div class=\"tradingview-widget-copyright\"><a href=\"" + escapeHtml(symbolUrl) + "\" target=\"_blank\" rel=\"noopener nofollow\">" + escapeHtml(symbol) + " chart</a><span> by TradingView</span></div></div>" +
      "<div class=\"price-chart-source\"><span>이 화면의 시장 차트는 TradingView 데이터 위젯으로 연결돼.</span><span><a href=\"" + escapeHtml(symbolUrl) + "\" target=\"_blank\" rel=\"noopener\">원본 차트 열기 ↗</a></span></div>" +
      "</section>";
  }

  function renderSourceNotice(entry, requestedSource, symbol) {
    var isTradingView = requestedSource === "tradingview";
    var title = isTradingView ? "TradingView 원본 연결" : "KRX 데이터 차트";
    var eyebrow = isTradingView ? "Source note · TradingView" : "Source note · KRX";
    var description;
    var action = "";
    if (isTradingView && isKrxSymbol(symbol)) {
      description = "KRX 종목은 TradingView 위젯에 직접 넣을 수 없어서, 이 기록에서는 KRX 데이터 차트를 사용하고 원본 페이지 링크를 함께 남겼어.";
      action = "<a class=\"chart-source-notice-link\" href=\"" + escapeHtml(tradingViewUrl(symbol)) + "\" target=\"_blank\" rel=\"noopener\">TradingView 원본 페이지 열기 ↗</a>";
    } else if (!isTradingView) {
      description = "KRX 차트는 한국 종목 티커가 필요해. 티커를 005930.KS, 035720.KQ 또는 KRX:005930 형식으로 입력하면 이곳에 실제 일별 데이터가 표시돼.";
    } else {
      description = "이 기록에는 TradingView 차트를 표시하고 있어.";
    }
    return "<section class=\"chart-source-notice\"><div><p class=\"eyebrow\">" + eyebrow + "</p><h3>" + title + "</h3><p>" + description + "</p></div>" + action + "</section>";
  }

  function renderPriceChart(entry) {
    var symbol = tradingViewSymbol(entry);
    var source = chartSourceForEntry(entry);
    if (!symbol) {
      return "<section class=\"price-chart-shell\"><div class=\"price-chart-empty\"><span>티커를 입력하면 선택한 소스에 맞는 차트가 바로 표시돼.<br>예: 005930.KS / NYSE:NOW / NASDAQ:NVDA</span></div></section>";
    }
    var korean = isKrxSymbol(symbol);
    if (source === "tradingview") return korean ? renderSourceNotice(entry, "tradingview", symbol) : renderTradingViewChart(entry, symbol);
    if (source === "krx") return korean ? renderKrxChart(entry, symbol) : renderSourceNotice(entry, "krx", symbol);
    if (source === "both") {
      return korean ? renderKrxChart(entry, symbol) + renderSourceNotice(entry, "tradingview", symbol) : renderTradingViewChart(entry, symbol) + renderSourceNotice(entry, "krx", symbol);
    }
    return korean ? renderKrxChart(entry, symbol) : renderTradingViewChart(entry, symbol);
  }

  function drawPriceChart(data) {
    var svg = document.getElementById("authored-price-chart");
    if (!svg || !data || !data.length) return;
    var width = 920;
    var height = 500;
    var margin = { top: 24, right: 72, bottom: 54, left: 54 };
    var plotWidth = width - margin.left - margin.right;
    var priceTop = margin.top;
    var priceHeight = 315;
    var volumeTop = 366;
    var volumeHeight = 72;
    var priceBottom = priceTop + priceHeight;
    var volumeBottom = volumeTop + volumeHeight;
    var rawMin = Math.min.apply(null, data.map(function (point) { return point.low; }));
    var rawMax = Math.max.apply(null, data.map(function (point) { return point.high; }));
    var yMin = Math.floor(rawMin - 4);
    var yMax = Math.ceil(rawMax + 4);
    var yRange = yMax - yMin || 1;
    var maxVolume = Math.max.apply(null, data.map(function (point) { return point.volume; }));
    var slot = plotWidth / data.length;
    var candleWidth = Math.max(4, Math.min(13, slot * .62));
    var x = function (index) { return margin.left + (index + .5) * slot; };
    var y = function (value) { return priceTop + ((yMax - value) / yRange) * priceHeight; };
    var volumeY = function (value) { return volumeBottom - (value / maxVolume) * volumeHeight; };
    var midValue = yMin + yRange / 2;
    var gridValues = [yMax, yMax - yRange / 3, yMax - (yRange * 2 / 3), yMin];
    var grid = gridValues.map(function (value) {
      var yPos = y(value).toFixed(2);
      return "<line class=\"price-chart-grid-line\" x1=\"" + margin.left + "\" x2=\"" + (width - margin.right) + "\" y1=\"" + yPos + "\" y2=\"" + yPos + "\"></line><text x=\"" + (width - margin.right + 10) + "\" y=\"" + (Number(yPos) + 4) + "\">" + money(value) + "</text>";
    }).join("");
    var xLabels = [0, Math.floor((data.length - 1) / 2), data.length - 1].map(function (index) {
      return "<text x=\"" + x(index).toFixed(2) + "\" y=\"" + (height - 16) + "\" text-anchor=\"middle\">" + escapeHtml(data[index].date.slice(5).replace("-", ".")) + "</text>";
    }).join("");
    var candles = data.map(function (point, index) {
      var up = point.close >= point.open;
      var colorClass = up ? "chart-candle-up" : "chart-candle-down";
      var bodyTop = Math.min(y(point.open), y(point.close));
      var bodyHeight = Math.max(2, Math.abs(y(point.open) - y(point.close)));
      var volumeHeightValue = Math.max(2, volumeBottom - volumeY(point.volume));
      return "<line class=\"chart-wick " + colorClass + "\" x1=\"" + x(index).toFixed(2) + "\" x2=\"" + x(index).toFixed(2) + "\" y1=\"" + y(point.high).toFixed(2) + "\" y2=\"" + y(point.low).toFixed(2) + "\"></line>" +
        "<rect class=\"chart-candle-body " + colorClass + "\" x=\"" + (x(index) - candleWidth / 2).toFixed(2) + "\" y=\"" + bodyTop.toFixed(2) + "\" width=\"" + candleWidth.toFixed(2) + "\" height=\"" + bodyHeight.toFixed(2) + "\"><title>" + escapeHtml(candleReadout(point)) + "</title></rect>" +
        "<rect class=\"chart-volume-bar " + colorClass + "\" x=\"" + (x(index) - candleWidth / 2).toFixed(2) + "\" y=\"" + volumeY(point.volume).toFixed(2) + "\" width=\"" + candleWidth.toFixed(2) + "\" height=\"" + volumeHeightValue.toFixed(2) + "\"></rect>";
    }).join("");
    var latestY = y(data[data.length - 1].close);
    svg.innerHTML = "<title>ServiceNow NOW 실제 일별 캔들 차트</title><desc>" + escapeHtml(displayDate(data[0].date)) + "부터 " + escapeHtml(displayDate(data[data.length - 1].date)) + "까지의 ServiceNow 일별 OHLC와 거래량 차트입니다.</desc>" +
      grid + "<line class=\"price-chart-axis-line\" x1=\"" + margin.left + "\" x2=\"" + (width - margin.right) + "\" y1=\"" + volumeTop + "\" y2=\"" + volumeTop + "\"></line>" +
      "<line class=\"chart-last-line\" x1=\"" + margin.left + "\" x2=\"" + (width - margin.right) + "\" y1=\"" + latestY.toFixed(2) + "\" y2=\"" + latestY.toFixed(2) + "\"></line>" +
      "<text class=\"chart-pane-label\" x=\"" + margin.left + "\" y=\"" + (volumeTop - 12) + "\">PRICE · USD</text><text class=\"chart-pane-label\" x=\"" + margin.left + "\" y=\"" + (volumeTop + 18) + "\">VOLUME</text>" +
      candles + xLabels +
      "<g class=\"chart-crosshair\" data-crosshair=\"true\" display=\"none\"><line class=\"chart-crosshair-line chart-crosshair-v\" x1=\"0\" x2=\"0\" y1=\"" + priceTop + "\" y2=\"" + volumeBottom + "\"></line><line class=\"chart-crosshair-line chart-crosshair-h\" x1=\"" + margin.left + "\" x2=\"" + (width - margin.right) + "\" y1=\"0\" y2=\"0\"></line><circle class=\"chart-crosshair-dot\" cx=\"0\" cy=\"0\" r=\"4\"></circle><rect class=\"chart-crosshair-price-bg\" x=\"" + (width - margin.right + 3) + "\" y=\"0\" width=\"66\" height=\"22\" rx=\"3\"></rect><text class=\"chart-crosshair-price\" x=\"" + (width - margin.right + 8) + "\" y=\"15\"></text><rect class=\"chart-crosshair-date-bg\" x=\"0\" y=\"" + (height - 34) + "\" width=\"70\" height=\"22\" rx=\"3\"></rect><text class=\"chart-crosshair-date\" x=\"0\" y=\"" + (height - 19) + "\"></text></g>" +
      "<rect class=\"chart-interaction-layer\" x=\"" + margin.left + "\" y=\"" + priceTop + "\" width=\"" + plotWidth + "\" height=\"" + (volumeBottom - priceTop) + "\" fill=\"transparent\"></rect>";
    bindCrosshair(data, { width: width, height: height, margin: margin, priceTop: priceTop, priceBottom: priceBottom, volumeBottom: volumeBottom, plotWidth: plotWidth, yMin: yMin, yMax: yMax, yRange: yRange, slot: slot, x: x, y: y });
  }

  function bindCrosshair(data, geometry) {
    var svg = document.getElementById("authored-price-chart");
    var hit = svg && svg.querySelector(".chart-interaction-layer");
    var group = svg && svg.querySelector("[data-crosshair]");
    var readout = document.getElementById("chart-readout");
    if (!svg || !hit || !group) return;
    var vertical = group.querySelector(".chart-crosshair-v");
    var horizontal = group.querySelector(".chart-crosshair-h");
    var dot = group.querySelector(".chart-crosshair-dot");
    var priceBg = group.querySelector(".chart-crosshair-price-bg");
    var priceText = group.querySelector(".chart-crosshair-price");
    var dateBg = group.querySelector(".chart-crosshair-date-bg");
    var dateText = group.querySelector(".chart-crosshair-date");
    function move(event) {
      var rect = svg.getBoundingClientRect();
      var svgX = ((event.clientX - rect.left) / rect.width) * geometry.width;
      var index = Math.max(0, Math.min(data.length - 1, Math.floor((svgX - geometry.margin.left) / geometry.slot)));
      var point = data[index];
      var pointX = geometry.x(index);
      var pointY = geometry.y(point.close);
      var cursorY = ((event.clientY - rect.top) / rect.height) * geometry.height;
      var horizontalY = cursorY >= geometry.priceTop && cursorY <= geometry.priceBottom ? cursorY : pointY;
      var cursorPrice = geometry.yMin + ((geometry.priceBottom - horizontalY) / (geometry.priceBottom - geometry.priceTop)) * geometry.yRange;
      group.setAttribute("display", "block");
      vertical.setAttribute("x1", pointX);
      vertical.setAttribute("x2", pointX);
      horizontal.setAttribute("y1", horizontalY);
      horizontal.setAttribute("y2", horizontalY);
      dot.setAttribute("cx", pointX);
      dot.setAttribute("cy", pointY);
      priceBg.setAttribute("y", Math.max(2, Math.min(geometry.priceBottom - 22, horizontalY - 11)));
      priceText.setAttribute("y", Math.max(17, Math.min(geometry.priceBottom - 5, horizontalY + 4)));
      priceText.textContent = money(cursorPrice);
      var dateX = Math.max(geometry.margin.left, Math.min(geometry.width - geometry.margin.right - 70, pointX - 35));
      dateBg.setAttribute("x", dateX);
      dateText.setAttribute("x", dateX + 6);
      dateText.textContent = point.date.slice(5).replace("-", ".");
      readout.textContent = candleReadout(point);
    }
    hit.addEventListener("mousemove", move);
    hit.addEventListener("mouseenter", move);
    hit.addEventListener("mouseleave", function () {
      group.setAttribute("display", "none");
      readout.textContent = candleReadout(data[data.length - 1]);
    });
  }

  function bindKrxChart(data) {
    if (!data || !data.length) return;
    var rangeButtons = writerEntryView.querySelectorAll("[data-chart-range]");
    var zoomButtons = writerEntryView.querySelectorAll("[data-chart-zoom]");
    var zoomLabel = writerEntryView.querySelector("[data-chart-zoom-label]");
    var activeData = data.slice(-50);
    var viewStart = 0;
    var viewEnd = activeData.length;
    var minSpan = Math.min(8, activeData.length);

    function updateZoomLabel() {
      var span = viewEnd - viewStart;
      if (zoomLabel) zoomLabel.textContent = span === activeData.length ? "전체" : span + "/" + activeData.length;
      zoomButtons.forEach(function (button) {
        var action = button.dataset.chartZoom;
        button.disabled = (action === "in" && span <= minSpan) || (action === "out" && span >= activeData.length);
      });
    }

    function renderView() {
      drawPriceChart(activeData.slice(viewStart, viewEnd));
      updateZoomLabel();
    }

    function zoom(direction, anchorRatio) {
      var total = activeData.length;
      var span = viewEnd - viewStart;
      if (!total || !span) return;
      if (direction === 0) {
        viewStart = 0;
        viewEnd = total;
        renderView();
        return;
      }
      var nextSpan = direction > 0 ? Math.floor(span * 0.75) : Math.ceil(span / 0.75);
      nextSpan = Math.max(minSpan, Math.min(total, nextSpan));
      if (nextSpan === span) return;
      var ratio = Math.max(0, Math.min(1, anchorRatio == null ? 1 : anchorRatio));
      var anchor = viewStart + ratio * span;
      var nextStart = Math.round(anchor - ratio * nextSpan);
      nextStart = Math.max(0, Math.min(total - nextSpan, nextStart));
      viewStart = nextStart;
      viewEnd = nextStart + nextSpan;
      renderView();
    }

    rangeButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        rangeButtons.forEach(function (item) { item.classList.remove("is-selected"); });
        button.classList.add("is-selected");
        var range = button.dataset.chartRange === "all" ? data.length : Number(button.dataset.chartRange);
        activeData = data.slice(-range);
        viewStart = 0;
        viewEnd = activeData.length;
        minSpan = Math.min(8, activeData.length);
        renderView();
      });
    });

    zoomButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        var action = button.dataset.chartZoom;
        zoom(action === "in" ? 1 : action === "out" ? -1 : 0, 1);
      });
    });

    renderView();
    var svg = document.getElementById("authored-price-chart");
    if (svg && !svg.dataset.zoomBound) {
      svg.dataset.zoomBound = "true";
      svg.addEventListener("wheel", function (event) {
        event.preventDefault();
        var rect = svg.getBoundingClientRect();
        var anchorRatio = rect.width ? (event.clientX - rect.left) / rect.width : 1;
        zoom(event.deltaY < 0 ? 1 : -1, anchorRatio);
      }, { passive: false });
    }
  }

  function parseYahooChart(payload) {
    var result = payload && payload.chart && payload.chart.result && payload.chart.result[0];
    var quote = result && result.indicators && result.indicators.quote && result.indicators.quote[0];
    var timestamps = result && result.timestamp;
    if (!result || !quote || !timestamps) return [];
    return timestamps.map(function (timestamp, index) {
      return {
        date: new Date(timestamp * 1000).toISOString().slice(0, 10),
        open: Number(quote.open[index]),
        high: Number(quote.high[index]),
        low: Number(quote.low[index]),
        close: Number(quote.close[index]),
        volume: Number(quote.volume[index]) || 0
      };
    }).filter(function (point) {
      return Number.isFinite(point.open) && Number.isFinite(point.high) && Number.isFinite(point.low) && Number.isFinite(point.close);
    });
  }

  function readKrxCache(symbol) {
    try {
      var cache = JSON.parse(window.localStorage.getItem(KRX_CACHE_KEY) || "{}");
      var item = cache[symbol];
      if (item && Array.isArray(item.data) && item.data.length > 1 && Date.now() - item.savedAt < KRX_CACHE_TTL) return item.data;
    } catch (error) {
      return null;
    }
    return null;
  }

  function writeKrxCache(symbol, data) {
    try {
      var cache = JSON.parse(window.localStorage.getItem(KRX_CACHE_KEY) || "{}");
      cache[symbol] = { savedAt: Date.now(), data: data };
      window.localStorage.setItem(KRX_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      return;
    }
  }

  function mountKrxChart(entry) {
    var frame = writerEntryView.querySelector("[data-krx-chart]");
    if (!frame || frame.dataset.loaded === "true") return;
    var loading = frame.querySelector("[data-krx-loading]");
    var symbol = frame.dataset.krxSymbol || yahooKrxSymbol(entry);
    if (!symbol) return;
    frame.dataset.loaded = "true";
    var cachedData = readKrxCache(symbol);
    if (cachedData) {
      if (loading) loading.setAttribute("hidden", "hidden");
      bindKrxChart(cachedData);
      return;
    }
    var period2 = Math.floor(Date.now() / 1000) + 86400;
    var period1 = period2 - (365 * 86400);
    var endpoint = "https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(symbol) + "?period1=" + period1 + "&period2=" + period2 + "&interval=1d&includePrePost=false&events=div%2Csplits";
    var proxyEndpoint = "https://api.allorigins.win/get?url=" + encodeURIComponent(endpoint);
    function requestJson(url) {
      return fetch(url, { cache: "no-store" }).then(function (response) {
        if (!response.ok) throw new Error("KRX data request failed: " + response.status);
        return response.json();
      });
    }
    function firstSuccessful(urls) {
      return new Promise(function (resolve, reject) {
        var pending = urls.length;
        var errors = [];
        urls.forEach(function (url) {
          requestJson(url).then(resolve).catch(function (error) {
            errors.push(error);
            pending -= 1;
            if (!pending) reject(errors[0]);
          });
        });
      });
    }
    firstSuccessful([endpoint, proxyEndpoint])
      .then(function (payload) {
        if (payload && typeof payload.contents === "string") payload = JSON.parse(payload.contents);
        var data = parseYahooChart(payload);
        if (data.length < 2) throw new Error("No KRX chart data");
        writeKrxCache(symbol, data);
        if (loading) loading.setAttribute("hidden", "hidden");
        bindKrxChart(data);
      })
      .catch(function (error) {
        console.error(error);
        if (loading) {
          loading.removeAttribute("hidden");
          loading.innerHTML = "<strong>한국 종목 차트를 불러오지 못했어.</strong><small>인터넷 연결을 확인한 뒤 페이지를 새로고침해줘.</small>";
        }
      });
  }

  function mountTradingViewChart(entry) {
    var frame = writerEntryView.querySelector("[data-tradingview-frame]");
    if (!frame || frame.dataset.loaded === "true") return;
    var widget = frame.querySelector(".tradingview-widget-container__widget");
    var loading = frame.querySelector("[data-tradingview-loading]");
    var symbol = frame.dataset.tradingviewSymbol || tradingViewSymbol(entry);
    if (!widget || !symbol) return;
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.textContent = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: "D",
      timezone: "Asia/Seoul",
      theme: "light",
      toolbar_bg: "#eeeae1",
      style: "1",
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: true,
      calendar: false,
      hide_side_toolbar: false,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_volume: false,
      hotlist: false,
      save_image: true,
      withdateranges: true,
      details: false,
      studies: [],
      watchlist: [],
      compareSymbols: [],
      backgroundColor: "#f7f4ec",
      gridColor: "rgba(23, 54, 73, 0.08)",
      overrides: {
        "paneProperties.background": "#f7f4ec",
        "paneProperties.backgroundType": "solid",
        "paneProperties.vertGridProperties.color": "rgba(23, 54, 73, 0.07)",
        "paneProperties.horzGridProperties.color": "rgba(23, 54, 73, 0.07)",
        "paneProperties.crossHairProperties.color": "#167d7a",
        "scalesProperties.textColor": "#5d7380",
        "mainSeriesProperties.candleStyle.upColor": "#167d7a",
        "mainSeriesProperties.candleStyle.downColor": "#b85e63",
        "mainSeriesProperties.candleStyle.borderUpColor": "#167d7a",
        "mainSeriesProperties.candleStyle.borderDownColor": "#b85e63",
        "mainSeriesProperties.candleStyle.wickUpColor": "#167d7a",
        "mainSeriesProperties.candleStyle.wickDownColor": "#b85e63"
      },
      support_host: "https://www.tradingview.com"
    });
    script.onload = function () {
      if (loading) loading.setAttribute("hidden", "hidden");
    };
    script.onerror = function () {
      if (loading) {
        loading.removeAttribute("hidden");
        loading.innerHTML = "<strong>TradingView 차트를 불러오지 못했어.</strong><small>인터넷 연결을 확인하거나 아래 링크로 열어줘.</small>";
      }
    };
    frame.dataset.loaded = "true";
    widget.appendChild(script);
  }

  function renderEntry(id) {
    var entry = entries.find(function (item) { return item.id === id; });
    if (!entry) return;
    var footnotes = entry.footnotes || [];
    var footnoteHtml = "";
    if (footnotes.length) {
      footnoteHtml = "<section class=\"saved-footnotes\"><h2>각주</h2><ol>" +
        footnotes.map(function (note, index) {
          var url = safeUrl(note.url);
          var source = note.source ? "<strong>" + escapeHtml(note.source) + "</strong>" : "";
          var link = url ? " <a href=\"" + escapeHtml(url) + "\" target=\"_blank\" rel=\"noopener\">원문 열기 ↗</a>" : "";
          return "<li id=\"saved-footnote-" + (index + 1) + "\">" + source + (source && note.note ? " · " : "") + escapeHtml(note.note || "출처 메모 없음") + link + "</li>";
        }).join("") + "</ol></section>";
    }
    writerEntryView.innerHTML =
      "<div class=\"entry-view-hero\"><p class=\"eyebrow\">" + escapeHtml(entry.type || "기업 분석") + " · " + escapeHtml(entry.company || "기업") + "</p>" +
      "<h1>" + escapeHtml(entry.title || "제목 없음") + "</h1>" +
      "<div class=\"entry-view-meta\"><span class=\"meta-chip\">" + escapeHtml(entry.company || "기업 미입력") + (entry.ticker ? " · " + escapeHtml(entry.ticker) : "") + "</span><span class=\"meta-chip\">" + displayDate(entry.date) + "</span><span class=\"meta-chip\">차트 · " + escapeHtml(chartSourceLabel(entry)) + "</span><span class=\"meta-chip\">" + footnotes.length + "개 각주</span></div></div>" +
      "<div class=\"report-nav\"><button type=\"button\" data-entry-back=\"true\">← 기록으로 돌아가기</button><button type=\"button\" data-entry-edit=\"" + escapeHtml(entry.id) + "\">수정하기</button></div>" +
      renderPriceChart(entry) +
      "<article class=\"authored-body\">" + renderBody(entry.body, footnotes) + "</article>" + footnoteHtml;
    showMode("entry");
    var marketSymbol = tradingViewSymbol(entry);
    var chartSource = chartSourceForEntry(entry);
    var korean = isKrxSymbol(marketSymbol);
    if (korean && (chartSource === "auto" || chartSource === "krx" || chartSource === "both")) mountKrxChart(entry);
    if (!korean && (chartSource === "auto" || chartSource === "tradingview" || chartSource === "both")) mountTradingViewChart(entry);
    writerEntryView.querySelector("[data-entry-back]").addEventListener("click", function () { showMode("dashboard"); });
    writerEntryView.querySelector("[data-entry-edit]").addEventListener("click", function () { editEntry(id); });
  }

  function saveEntry(event) {
    event.preventDefault();
    var id = document.getElementById("analysis-id").value;
    var company = document.getElementById("analysis-company").value.trim();
    var title = document.getElementById("analysis-title-input").value.trim();
    var date = document.getElementById("analysis-date").value;
    if (!company || !title || !date) {
      setStatus("기업명, 제목, 분석 날짜를 입력해줘.");
      return;
    }
    var existing = entries.find(function (entry) { return entry.id === id; });
    var next = {
      id: id || makeId(),
      company: company,
      ticker: document.getElementById("analysis-ticker").value.trim().toUpperCase(),
      date: date,
      type: document.getElementById("analysis-type").value,
      chartSource: chartSourceForEntry({ chartSource: document.getElementById("analysis-chart-source").value }),
      title: title,
      body: document.getElementById("analysis-body").value,
      footnotes: collectFootnotes(),
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    entries = existing ? entries.map(function (entry) { return entry.id === id ? next : entry; }) : entries.concat([next]);
    saveEntries();
    setVisibleView("writer");
    showMode("dashboard");
    setStatus(existing ? "분석을 수정해서 저장했어." : "분석을 저장했어. 날짜별 차트와 기록에 반영했어.");
    window.history.replaceState({ view: "write" }, "", window.location.pathname + "#write");
  }

  function exportEntries() {
    var blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "equity-fieldnotes-" + today() + ".json";
    link.click();
    URL.revokeObjectURL(url);
    setStatus("작성한 분석을 백업 파일로 준비했어.");
  }

  document.querySelectorAll("[data-view]").forEach(function (card) {
    card.addEventListener("click", function () { openWriter("dashboard"); });
  });

  document.getElementById("writer-back-button").addEventListener("click", function () {
    setVisibleView("home");
    window.history.replaceState({}, "", window.location.pathname);
  });

  document.querySelectorAll("[data-writer-mode]").forEach(function (button) {
    button.addEventListener("click", function () {
      if (button.dataset.writerMode === "editor") startNew();
      else showMode("dashboard");
    });
  });

  document.getElementById("new-analysis").addEventListener("click", startNew);
  document.getElementById("cancel-analysis").addEventListener("click", function () { showMode("dashboard"); });
  document.getElementById("add-footnote").addEventListener("click", function () { addFootnote(); });
  document.getElementById("export-analyses").addEventListener("click", exportEntries);
  analysisForm.addEventListener("submit", saveEntry);

  entryList.addEventListener("click", function (event) {
    var editButton = event.target.closest("[data-edit-entry]");
    var deleteButton = event.target.closest("[data-delete-entry]");
    var entryTarget = event.target.closest("[data-open-entry]");
    if (editButton) {
      editEntry(editButton.dataset.editEntry);
      return;
    }
    if (deleteButton) {
      var deleteId = deleteButton.dataset.deleteEntry;
      var deleteEntry = entries.find(function (entry) { return entry.id === deleteId; });
      if (deleteEntry && window.confirm("“" + deleteEntry.title + "” 분석을 삭제할까?")) {
        entries = entries.filter(function (entry) { return entry.id !== deleteId; });
        saveEntries();
        renderDashboard();
        setStatus("분석을 삭제했어.");
      }
      return;
    }
    if (entryTarget) renderEntry(entryTarget.dataset.openEntry);
  });

  entryList.addEventListener("keydown", function (event) {
    if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-open-entry]")) {
      event.preventDefault();
      renderEntry(event.target.dataset.openEntry);
    }
  });

  window.addEventListener("keydown", function (event) {
    if (event.key !== "Escape" || !writerView.classList.contains("is-active")) return;
    if (!writerEntryView.hidden || !writerEditor.hidden) showMode("dashboard");
    else document.getElementById("writer-back-button").click();
  });

  if (window.location.hash === "#write") openWriter("dashboard");
})();
