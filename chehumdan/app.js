// 체험단 다모아 — data/campaigns.json 을 읽어 분류 필터로 좁혀 보여준다.
(() => {
  const SITES = { reviewnote: "리뷰노트", gangnam: "강남맛집", revu: "레뷰", popomon: "포포몬", dinnerqueen: "디너의여왕",
    cometoplay: "놀러와체험단", chvu: "체험뷰", remin: "리뷰의민족", fourblog: "포블로그", cloudreview: "클라우드리뷰", ddok: "똑똑리워드" };
  const PURPOSES = { food: "맛집", cafe: "카페·디저트", travel: "여행·숙박", beauty: "뷰티·미용", health: "운동·건강", edu: "교육·체험", pet: "반려동물", product: "생활·제품", service: "기타 서비스" };
  const TYPES = { visit: "방문형", delivery: "배송형", reporter: "기자단", takeout: "포장", purchase: "구매평", etc: "기타" };
  const CHANNELS = { blog: "블로그", insta: "인스타그램", reels: "릴스", youtube: "유튜브", shorts: "쇼츠", tiktok: "틱톡", clip: "클립", etc: "기타" };
  const SIDO = ["전국", "서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산", "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];
  const SITE_URL = {
    reviewnote: (id) => `https://www.reviewnote.co.kr/campaigns/${id}`,
    revu: (id) => `https://www.revu.net/campaign/${id}`,
    popomon: (id) => `https://popomon.com/campaign/${id}`,
    gangnam: (id) => `https://xn--939au0g4vj8sq.net/cp/?id=${id}`,
    dinnerqueen: (id) => `https://dinnerqueen.net/taste/${id}`,
    cometoplay: (id) => `https://www.cometoplay.kr/item.php?it_id=${id}`,
    chvu: (id) => `https://chvu.co.kr/campaign/${id}`,
    remin: (id) => `https://remin.co.kr/category/information?cam_seq=${id}`,
    fourblog: (id) => `https://4blog.net/campaign/${id}/`,
    cloudreview: (id) => `https://cloudreview.co.kr/campaign/detail/${id}`,
    ddok: (id) => `https://ddok.it/campaigns/${id}`,
  };
  const SOON_DAYS = 2;
  const PAGE = 60;

  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  const kstToday = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const today = kstToday();
  const daysLeft = (d) => d ? Math.round((Date.parse(d) - Date.parse(today)) / 86400e3) : null;

  // ── 상태 (주소 뒤 #에 담아 링크로 공유) ──
  const state = { tab: "all", q: "", sort: "pick", sido: "", sgg: new Set(), purpose: new Set(), type: new Set(), channel: new Set(), site: new Set() };
  const SETS = ["purpose", "type", "channel", "site"];
  let items = [];
  let activeSites = Object.keys(SITES);
  let shown = PAGE;

  function readHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    state.tab = ["all", "new", "soon"].includes(p.get("tab")) ? p.get("tab") : "all";
    state.q = p.get("q") || "";
    state.sort = ["pick", "end", "new", "ratio"].includes(p.get("sort")) ? p.get("sort") : "pick";
    state.sido = p.get("sido") || "";
    state.sgg = new Set((p.get("sgg") || "").split(",").filter(Boolean)); // 시/군/구는 여러 개
    for (const k of SETS) state[k] = new Set((p.get(k) || "").split(",").filter(Boolean));
  }
  function writeHash() {
    const p = new URLSearchParams();
    if (state.tab !== "all") p.set("tab", state.tab);
    if (state.q) p.set("q", state.q);
    if (state.sort !== "pick") p.set("sort", state.sort);
    if (state.sido) p.set("sido", state.sido);
    if (state.sgg.size) p.set("sgg", [...state.sgg].join(","));
    for (const k of SETS) if (state[k].size) p.set(k, [...state[k]].join(","));
    const h = p.toString();
    try { history.replaceState(null, "", h ? "#" + h : location.pathname + location.search); } catch { /* 미리보기 창 등 */ }
  }

  // ── 필터 ──
  const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, "");
  function matches(it, skip) {
    if (skip !== "tab") {
      if (state.tab === "new" && it.first_seen !== today) return false;
      if (state.tab === "soon") { const d = daysLeft(it.end); if (d == null || d > SOON_DAYS) return false; }
    }
    if (skip !== "q" && state.q) {
      const hay = norm(`${it.title} ${it.offer} ${it.sido || ""} ${it.sigungu || ""} ${it.cat || ""}`);
      if (!state.q.split(/\s+/).filter(Boolean).every((w) => hay.includes(norm(w)))) return false;
    }
    if (skip !== "sido" && state.sido) {
      if (it.sido !== state.sido) return false;
      if (skip !== "sgg" && state.sgg.size && !state.sgg.has(it.sigungu)) return false;
    }
    for (const k of SETS) if (skip !== k && state[k].size && !state[k].has(it[k])) return false;
    return true;
  }

  function countBy(skip, key) {
    const m = new Map();
    for (const it of items) if (matches(it, skip)) m.set(it[key], (m.get(it[key]) || 0) + 1);
    return m;
  }

  // ── 칩 그리기 ──
  function chip(label, count, pressed, onClick) {
    const b = el("button", "chip", label);
    b.type = "button";
    b.setAttribute("aria-pressed", pressed ? "true" : "false");
    if (count != null) b.append(el("small", null, count.toLocaleString()));
    if (!count && !pressed) b.disabled = true;
    b.addEventListener("click", onClick);
    return b;
  }

  function renderChips() {
    // 지역 1단계
    const sidoCount = countBy("sido", "sido");
    const sidoBox = $("sidoChips");
    sidoBox.replaceChildren(chip("전 지역", null, !state.sido, () => { state.sido = ""; state.sgg.clear(); update(); }));
    sidoBox.firstChild.disabled = false;
    for (const s of SIDO) {
      const n = sidoCount.get(s) || 0;
      if (!n && state.sido !== s) continue;
      sidoBox.append(chip(s === "전국" ? "전국·배송" : s, n, state.sido === s, () => {
        state.sido = state.sido === s ? "" : s; state.sgg.clear(); update();
      }));
    }
    // 지역 2단계 (시/군/구)
    const sggBox = $("sggChips"), qSgg = $("qSgg");
    sggBox.replaceChildren(); qSgg.replaceChildren();
    sggBox.hidden = qSgg.hidden = !state.sido || state.sido === "전국";
    if (!sggBox.hidden) {
      const m = countBy("sgg", "sigungu");
      const names = [...m.keys()].filter(Boolean).sort((a, b) => a.localeCompare(b, "ko"));
      for (const g of state.sgg) if (!names.includes(g)) names.unshift(g);
      const toggle = (g) => () => { state.sgg.has(g) ? state.sgg.delete(g) : state.sgg.add(g); update(); };
      for (const g of names) {
        sggBox.append(chip(g, m.get(g) || 0, state.sgg.has(g), toggle(g)));
        qSgg.append(chip(g, m.get(g) || 0, state.sgg.has(g), toggle(g)));
      }
      if (m.get(null)) sggBox.append(el("span", "stat", `시/군/구 미상 ${m.get(null).toLocaleString()}`));
    }
    // 다중 선택 그룹
    const siteLabels = Object.fromEntries(activeSites.map((k) => [k, SITES[k] || k]));
    const groups = { purpose: [PURPOSES, "purposeChips"], type: [TYPES, "typeChips"], channel: [CHANNELS, "channelChips"], site: [siteLabels, "siteChips"] };
    for (const [key, [labels, id]] of Object.entries(groups)) {
      const m = countBy(key, key);
      const box = $(id);
      box.replaceChildren();
      for (const [v, label] of Object.entries(labels)) {
        const n = m.get(v) || 0;
        if (!n && !state[key].has(v)) continue;
        box.append(chip(label, n, state[key].has(v), () => {
          state[key].has(v) ? state[key].delete(v) : state[key].add(v); update();
        }));
      }
    }
    // 탭 숫자
    const tabCount = { all: 0, new: 0, soon: 0 };
    for (const it of items) {
      if (!matches(it, "tab")) continue;
      tabCount.all++;
      if (it.first_seen === today) tabCount.new++;
      const d = daysLeft(it.end); if (d != null && d <= SOON_DAYS) tabCount.soon++;
    }
    for (const b of $("tabs").children) {
      const t = b.dataset.tab;
      b.setAttribute("aria-pressed", state.tab === t ? "true" : "false");
      b.setAttribute("aria-label", `${b.dataset.label} ${tabCount[t].toLocaleString()}개`);
      b.replaceChildren(b.dataset.label, el("small", null, tabCount[t].toLocaleString()));
    }
    const active = (state.sido ? 1 : 0) + SETS.reduce((n, k) => n + state[k].size, 0);
    $("filterCount").textContent = active ? String(active) : "";

    // 모바일 빠른 분류 띠: 지역 한 줄, 목적 한 줄
    const qs = $("qSido");
    qs.replaceChildren(chip("전 지역", null, !state.sido, () => { state.sido = ""; state.sgg.clear(); update(); }));
    qs.firstChild.disabled = false;
    for (const s of SIDO) {
      const n = sidoCount.get(s) || 0;
      if (!n && state.sido !== s) continue;
      qs.append(chip(s === "전국" ? "전국·배송" : s, n, state.sido === s, () => {
        state.sido = state.sido === s ? "" : s; state.sgg.clear(); update();
      }));
    }
    const pm = countBy("purpose", "purpose");
    const qp = $("qPurpose");
    qp.replaceChildren();
    for (const [v, label] of Object.entries(PURPOSES)) {
      const n = pm.get(v) || 0;
      if (!n && !state.purpose.has(v)) continue;
      qp.append(chip(label, n, state.purpose.has(v), () => {
        state.purpose.has(v) ? state.purpose.delete(v) : state.purpose.add(v); update();
      }));
    }
    // 공유 링크로 열었을 때만 선택한 칩이 보이게 띠를 넘긴다. 누를 때마다 넘기면 손가락 아래 칩이 바뀐다
    if (!stripsScrolled && items.length) {
      stripsScrolled = true;
      for (const strip of [qs, qSgg, qp]) {
        const on = strip.querySelector('[aria-pressed="true"]');
        if (on) strip.scrollLeft = on.offsetLeft - strip.offsetLeft - 16;
      }
    }
    renderActive();
  }

  // ── 걸린 조건: 하나씩 끄는 줄 ──
  function renderActive() {
    const box = $("active");
    const parts = [];
    const add = (label, off) => parts.push([label, off]);
    if (state.tab !== "all") add({ new: "오늘 새로", soon: "마감 임박" }[state.tab], () => { state.tab = "all"; });
    if (state.q) add(`'${state.q}'`, () => { state.q = ""; $("q").value = ""; });
    if (state.sido) {
      if (state.sgg.size) for (const g of state.sgg) add(`${state.sido} ${g}`, () => { state.sgg.delete(g); });
      else add(state.sido === "전국" ? "전국·배송" : state.sido, () => { state.sido = ""; });
    }
    const LABELS = { purpose: PURPOSES, type: TYPES, channel: CHANNELS, site: SITES };
    for (const k of SETS) for (const v of state[k]) add(LABELS[k][v] || v, () => { state[k].delete(v); });
    box.hidden = !parts.length;
    box.replaceChildren(...parts.map(([label, off]) => {
      const b = el("button", "pill", label);
      b.type = "button";
      b.setAttribute("aria-label", `${label} 조건 빼기`);
      b.insertAdjacentHTML("beforeend", '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 2l6 6M8 2l-6 6"/></svg>');
      b.addEventListener("click", () => { off(); update(); });
      return b;
    }));
    if (parts.length > 1) {
      const all = el("button", "link", "모두 지우기");
      all.type = "button";
      all.addEventListener("click", clearAll);
      box.append(all);
    }
  }

  // ── 공고 한 장 (PC: 교환권 카드 / 모바일: 한 줄 목록) ──
  function card(it) {
    const li = el("li");
    const a = el("a", "ticket");
    const sid = it.id.slice(it.id.indexOf(":") + 1);
    a.href = it.url || (SITE_URL[it.site] ? SITE_URL[it.site](sid) : "#"); a.target = "_blank"; a.rel = "noopener noreferrer";
    const d = daysLeft(it.end);
    const stub = el("div", "stub");
    // 오늘 마감은 도장, D-1~2 는 빨간 글씨 — 빨강이 첫 화면을 덮지 않게 둘을 나눈다
    const cls = d == null ? " far" : d <= 0 ? " today" : d <= SOON_DAYS ? " soon" : "";
    const dd = el("span", "dd" + cls, d == null ? "상시" : d <= 0 ? "오늘" : `D-${d}`);
    stub.append(dd, el("span", "dd-label", d == null ? "마감일 없음" : it.end.slice(5).replace("-", ".") + " 마감"), el("span", "site", SITES[it.site] || it.site));
    const body = el("div", "body");
    body.append(el("p", "title", it.title));
    if (it.offer) body.append(el("p", "offer", it.offer));
    const meta = el("div", "meta");
    meta.append(el("span", "site-m", SITES[it.site] || it.site));
    if (it.first_seen === today) meta.append(el("span", "tag new", "새 공고"));
    meta.append(el("span", "tag purpose", PURPOSES[it.purpose] || it.purpose));
    const region = it.sido === "전국" ? "전국·배송" : [it.sido, it.sigungu].filter(Boolean).join(" ");
    if (region) meta.append(el("span", "tag", region));
    meta.append(el("span", "tag", TYPES[it.type] || it.type));
    if (it.channel && it.channel !== "blog") meta.append(el("span", "tag", CHANNELS[it.channel] || it.channel));
    if (it.recruit) {
      // 경쟁률: 신청 ÷ 모집
      const odds = el("span", "odds");
      odds.title = `모집 ${it.recruit}명 · 신청 ${it.applicants ?? "?"}명`;
      if (it.applicants != null) {
        const r = it.applicants / it.recruit;
        odds.append(el("b", null, r < 1 ? "여유" : `${r >= 10 ? Math.round(r) : r.toFixed(1)}:1`), ` · ${it.recruit}명`);
      } else odds.append(`${it.recruit}명 모집`);
      meta.append(odds);
    }
    body.append(meta);
    a.append(stub, body);
    const when = d == null ? "상시 모집" : d <= 0 ? "오늘 마감" : `${d}일 남음`;
    a.setAttribute("aria-label", `${it.title} — ${when}, ${region || "지역 미상"}, ${SITES[it.site] || it.site} (새 창)`);
    li.append(a);
    return li;
  }

  const numId = (it) => Number(it.id.slice(it.id.indexOf(":") + 1)) || 0;
  const ratio = (it) => it.recruit && it.applicants != null ? it.applicants / it.recruit : Infinity; // 신청 수를 모르면 뒤로
  const SORTERS = {
    end: (a, b) => (a.end || "9999").localeCompare(b.end || "9999") || (b.first_seen || "").localeCompare(a.first_seen || ""),
    new: (a, b) => (b.first_seen || "").localeCompare(a.first_seen || "") || numId(b) - numId(a),
    ratio: (a, b) => ratio(a) - ratio(b) || (a.end || "9999").localeCompare(b.end || "9999"),
  };
  // 추천 순(기본): 마감 빠른 순인데 오늘 마감은 맨 뒤로 — 오늘 마감 2,500여 건이 첫 화면을 덮어서(10-16). 오늘 마감은 '마감 임박' 탭에서 본다
  SORTERS.pick = (a, b) => (daysLeft(a.end) === 0) - (daysLeft(b.end) === 0) || SORTERS.end(a, b);

  function renderList() {
    const res = items.filter((it) => matches(it)).sort(SORTERS[state.sort]);
    $("list").replaceChildren(...res.slice(0, shown).map(card));
    $("more").hidden = res.length <= shown;
    $("empty").hidden = res.length > 0;
    if (!res.length) renderRelax();
    const b = el("b", null, res.length.toLocaleString());
    $("summary").replaceChildren(b, "개 공고");
    $("sheetDone").textContent = `공고 ${res.length.toLocaleString()}개 보기`;
  }

  function renderRelax() {
    const NAMES = { q: "검색어", sido: "지역", sgg: "시/군/구", purpose: "목적", type: "유형", channel: "채널", site: "사이트" };
    const on = { tab: state.tab !== "all", q: !!state.q, sido: !!state.sido, sgg: state.sgg.size > 0 };
    for (const k of SETS) on[k] = state[k].size > 0;
    const tips = Object.keys(on).filter((k) => on[k] && !(k === "sido" && on.sgg))
      .map((k) => [k, items.filter((it) => matches(it, k)).length]).filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1]).slice(0, 3);
    $("relax").replaceChildren(...tips.map(([k, n]) => {
      const label = k === "tab" ? "전체 탭에서 보면" : `${NAMES[k]} 조건을 빼면`;
      const b = el("button", "more", `${label} ${n.toLocaleString()}개`);
      b.type = "button";
      b.addEventListener("click", () => {
        if (k === "tab") state.tab = "all";
        else if (k === "q") { state.q = ""; $("q").value = ""; }
        else if (k === "sido") { state.sido = ""; state.sgg.clear(); }
        else if (k === "sgg") state.sgg.clear();
        else state[k].clear();
        update();
      });
      return b;
    }));
  }

  function update(keepPage) {
    if (!keepPage) shown = PAGE;
    writeHash();
    renderChips();
    renderList();
  }

  // ── 모바일 필터 시트 ──
  const side = () => $("side");
  const focusables = () => [...side().querySelectorAll("button:not(:disabled)")];
  function openSheet() {
    side().classList.add("open"); $("scrim").hidden = false;
    side().setAttribute("role", "dialog"); side().setAttribute("aria-modal", "true");
    $("filterToggle").setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    focusables()[0]?.focus();
  }
  function closeSheet() {
    const wasOpen = side().classList.contains("open");
    side().classList.remove("open"); $("scrim").hidden = true;
    side().removeAttribute("role"); side().removeAttribute("aria-modal");
    $("filterToggle").setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    if (wasOpen) $("filterToggle").focus();
  }

  // ── 시작 ──
  function bind() {
    for (const b of $("tabs").children) {
      b.dataset.label = b.textContent;
      b.addEventListener("click", () => { state.tab = b.dataset.tab; update(); });
    }
    const q = $("q");
    q.value = state.q;
    let t;
    q.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { state.q = q.value.trim(); update(); }, 150); });
    $("sort").value = state.sort;
    $("sort").addEventListener("change", (e) => { state.sort = e.target.value; update(); });
    $("more").addEventListener("click", () => { shown += PAGE; renderList(); });
    const reset = () => { state.sido = ""; state.sgg.clear(); for (const k of SETS) state[k].clear(); update(); };
    $("reset").addEventListener("click", reset);
    $("emptyReset").addEventListener("click", clearAll);
    $("reload").addEventListener("click", () => location.reload());
    $("filterToggle").addEventListener("click", () => ($("side").classList.contains("open") ? closeSheet() : openSheet()));
    $("sheetDone").addEventListener("click", () => { closeSheet(); window.scrollTo({ top: 0 }); });
    $("scrim").addEventListener("click", closeSheet);
    document.addEventListener("keydown", (e) => {
      if (!side().classList.contains("open")) return;
      if (e.key === "Escape") closeSheet();
      if (e.key === "Tab") { // 시트 안에서만 돈다
        const f = focusables(), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    matchMedia("(min-width: 861px)").addEventListener("change", (e) => { if (e.matches) closeSheet(); });
    window.addEventListener("hashchange", () => { readHash(); q.value = state.q; $("sort").value = state.sort; update(); });
  }

  function renderUpdated(data) {
    const when = data.updated ? new Date(data.updated).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "알 수 없음";
    const entries = Object.entries(data.sites || {});
    $("updated").replaceChildren(`마지막 수집 ${when}`, ...entries.flatMap(([k, s]) =>
      [" · ", el("span", "nowrap", `${SITES[k] || k} ${s.count.toLocaleString()}건${s.ok ? "" : "(최근 수집 실패)"}`)]));
    const failed = entries.filter(([, s]) => !s.ok).map(([k]) => SITES[k] || k);
    $("notice").hidden = !failed.length;
    $("notice").textContent = failed.length ? `${failed.join(" · ")}는 최근 수집에 실패해서 지난번 공고를 보여 주고 있어요.` : "";
  }

  // 검색어·탭까지 처음 상태로
  function clearAll() {
    state.sido = ""; state.sgg.clear(); for (const k of SETS) state[k].clear();
    state.q = ""; $("q").value = ""; state.tab = "all";
    update();
  }
  let stripsScrolled = false;

  readHash();
  bind();
  // 사이트마다 파일이 따로 있다 (없는 사이트는 건너뜀). 공개 페이지는 수집기가 덮어쓰는 chehumdan-data 브랜치를 읽고,
  // 이 PC에서 미리 볼 때(localhost)는 data_sync.py pull 로 받아 둔 data/sites/ 를 읽는다.
  const DATA = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
    ? "data/sites" : "https://raw.githubusercontent.com/sunnyu012-hub/lookbook/chehumdan-data/sites";
  const loadSite = (k) => fetch(`${DATA}/${k}.json`, { cache: "no-cache" })
    .then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const load = window.__CAMPAIGNS__
    ? Promise.resolve(window.__CAMPAIGNS__)
    : Promise.all(Object.keys(SITES).map(loadSite)).then((files) => {
        const data = { sites: {}, items: [], updated: null };
        for (const f of files) {
          if (!f || (!f.ok && !f.count)) continue; // 아직 한 번도 수집 못 한 사이트
          data.sites[f.site] = { ok: f.ok, count: f.count, updated: f.updated };
          data.items.push(...(f.items || []));
          if (f.updated && (!data.updated || f.updated > data.updated)) data.updated = f.updated;
        }
        if (!data.items.length) throw new Error("no data");
        return data;
      });
  load
    .then((data) => {
      const now = today;
      items = (data.items || []).filter((it) => !it.end || it.end >= now);
      activeSites = Object.keys(data.sites || {});
      $("siteGroup").hidden = activeSites.length < 2;
      renderUpdated(data);
      $("list").removeAttribute("aria-busy");
      update(true);
    })
    .catch(() => {
      $("list").replaceChildren(); $("list").removeAttribute("aria-busy");
      $("summary").textContent = "불러오지 못했어요";
      $("loadError").hidden = false;
    });
})();
