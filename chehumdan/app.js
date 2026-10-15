// 체험단 다모아 — data/campaigns.json 을 읽어 분류 필터로 좁혀 보여준다.
(() => {
  const SITES = { reviewnote: "리뷰노트", gangnam: "강남맛집", revu: "레뷰", popomon: "포포몬" };
  const PURPOSES = { food: "맛집", cafe: "카페·디저트", travel: "여행·숙박", beauty: "뷰티·미용", health: "운동·건강", edu: "교육·체험", pet: "반려동물", product: "생활·제품", service: "기타 서비스" };
  const TYPES = { visit: "방문형", delivery: "배송형", reporter: "기자단", takeout: "포장", purchase: "구매평", etc: "기타" };
  const CHANNELS = { blog: "블로그", insta: "인스타그램", reels: "릴스", youtube: "유튜브", shorts: "쇼츠", tiktok: "틱톡", clip: "클립", etc: "기타" };
  const SIDO = ["전국", "서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산", "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];
  const SITE_URL = {
    reviewnote: (id) => `https://www.reviewnote.co.kr/campaigns/${id}`,
    revu: (id) => `https://www.revu.net/campaign/${id}`,
    popomon: (id) => `https://popomon.com/campaign/${id}`,
  };
  const SOON_DAYS = 2;
  const PAGE = 60;

  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  const kstToday = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const today = kstToday();
  const daysLeft = (d) => d ? Math.round((Date.parse(d) - Date.parse(today)) / 86400e3) : null;

  // ── 상태 (주소 뒤 #에 담아 링크로 공유) ──
  const state = { tab: "all", q: "", sort: "end", sido: "", sgg: "", purpose: new Set(), type: new Set(), channel: new Set(), site: new Set() };
  const SETS = ["purpose", "type", "channel", "site"];
  let items = [];
  let activeSites = Object.keys(SITES);
  let shown = PAGE;

  function readHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    state.tab = ["all", "new", "soon"].includes(p.get("tab")) ? p.get("tab") : "all";
    state.q = p.get("q") || "";
    state.sort = ["end", "new", "ratio"].includes(p.get("sort")) ? p.get("sort") : "end";
    state.sido = p.get("sido") || "";
    state.sgg = p.get("sgg") || "";
    for (const k of SETS) state[k] = new Set((p.get(k) || "").split(",").filter(Boolean));
  }
  function writeHash() {
    const p = new URLSearchParams();
    if (state.tab !== "all") p.set("tab", state.tab);
    if (state.q) p.set("q", state.q);
    if (state.sort !== "end") p.set("sort", state.sort);
    if (state.sido) p.set("sido", state.sido);
    if (state.sgg) p.set("sgg", state.sgg);
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
    if (state.q) {
      const hay = norm(`${it.title} ${it.offer} ${it.sido || ""} ${it.sigungu || ""} ${it.cat || ""}`);
      if (!state.q.split(/\s+/).filter(Boolean).every((w) => hay.includes(norm(w)))) return false;
    }
    if (skip !== "sido" && state.sido) {
      if (it.sido !== state.sido) return false;
      if (skip !== "sgg" && state.sgg && it.sigungu !== state.sgg) return false;
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
    sidoBox.replaceChildren(chip("전체", null, !state.sido, () => { state.sido = ""; state.sgg = ""; update(); }));
    sidoBox.firstChild.disabled = false;
    for (const s of SIDO) {
      const n = sidoCount.get(s) || 0;
      if (!n && state.sido !== s) continue;
      sidoBox.append(chip(s === "전국" ? "전국·배송" : s, n, state.sido === s, () => {
        state.sido = state.sido === s ? "" : s; state.sgg = ""; update();
      }));
    }
    // 지역 2단계 (시/군/구)
    const sggBox = $("sggChips");
    sggBox.replaceChildren();
    sggBox.hidden = !state.sido || state.sido === "전국";
    if (!sggBox.hidden) {
      const m = countBy("sgg", "sigungu");
      const names = [...m.keys()].filter(Boolean).sort((a, b) => a.localeCompare(b, "ko"));
      if (state.sgg && !names.includes(state.sgg)) names.unshift(state.sgg);
      for (const g of names) sggBox.append(chip(g, m.get(g) || 0, state.sgg === g, () => { state.sgg = state.sgg === g ? "" : g; update(); }));
      if (m.get(null)) sggBox.append(el("span", "stat", `시/군/구 미상 ${m.get(null)}`));
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
      b.setAttribute("aria-selected", state.tab === t ? "true" : "false");
      b.replaceChildren(b.dataset.label, el("small", null, tabCount[t].toLocaleString()));
    }
    const active = (state.sido ? 1 : 0) + SETS.reduce((n, k) => n + state[k].size, 0);
    $("filterCount").textContent = active ? String(active) : "";

    // 모바일 빠른 분류 띠: 지역 한 줄, 목적 한 줄
    const qs = $("qSido");
    qs.replaceChildren(chip("전 지역", null, !state.sido, () => { state.sido = ""; state.sgg = ""; update(); }));
    qs.firstChild.disabled = false;
    for (const s of SIDO) {
      const n = sidoCount.get(s) || 0;
      if (!n && state.sido !== s) continue;
      const label = state.sido === s && state.sgg ? `${s} ${state.sgg}` : (s === "전국" ? "전국·배송" : s);
      qs.append(chip(label, n, state.sido === s, () => {
        if (state.sido === s && s !== "전국") { openSheet(); return; } // 같은 지역을 다시 누르면 시/군/구 고르기
        state.sido = s; state.sgg = ""; update();
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
    for (const strip of [qs, qp]) strip.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  // ── 공고 한 장 (PC: 교환권 카드 / 모바일: 한 줄 목록) ──
  function card(it) {
    const li = el("li");
    const a = el("a", "ticket");
    const sid = it.id.slice(it.id.indexOf(":") + 1);
    a.href = it.url || (SITE_URL[it.site] ? SITE_URL[it.site](sid) : "#"); a.target = "_blank"; a.rel = "noopener noreferrer";
    const d = daysLeft(it.end);
    const stub = el("div", "stub");
    const dd = el("span", "dd" + (d != null && d <= SOON_DAYS ? " soon" : d == null ? " far" : ""), d == null ? "상시" : d <= 0 ? "오늘" : `D-${d}`);
    stub.append(dd, el("span", "dd-label", d == null ? "마감일 없음" : it.end.slice(5).replace("-", ".") + " 마감"), el("span", "site", SITES[it.site] || it.site));
    const body = el("div", "body");
    body.append(el("p", "title", it.title));
    if (it.offer) body.append(el("p", "offer", it.offer));
    const meta = el("div", "meta");
    meta.append(el("span", "site-m", SITES[it.site] || it.site));
    if (it.first_seen === today) meta.append(el("span", "tag new", "오늘 등록"));
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
    li.append(a);
    return li;
  }

  const numId = (it) => Number(it.id.slice(it.id.indexOf(":") + 1)) || 0;
  const ratio = (it) => it.recruit ? (it.applicants ?? 0) / it.recruit : Infinity;
  const SORTERS = {
    end: (a, b) => (a.end || "9999").localeCompare(b.end || "9999") || (b.first_seen || "").localeCompare(a.first_seen || ""),
    new: (a, b) => (b.first_seen || "").localeCompare(a.first_seen || "") || numId(b) - numId(a),
    ratio: (a, b) => ratio(a) - ratio(b) || (a.end || "9999").localeCompare(b.end || "9999"),
  };

  function renderList() {
    const res = items.filter((it) => matches(it)).sort(SORTERS[state.sort]);
    $("list").replaceChildren(...res.slice(0, shown).map(card));
    $("more").hidden = res.length <= shown;
    $("empty").hidden = res.length > 0;
    const b = el("b", null, res.length.toLocaleString());
    $("summary").replaceChildren(b, "개 공고");
    $("sheetDone").textContent = `공고 ${res.length.toLocaleString()}개 보기`;
  }

  function update(keepPage) {
    if (!keepPage) shown = PAGE;
    writeHash();
    renderChips();
    renderList();
  }

  // ── 모바일 필터 시트 ──
  function openSheet() {
    $("side").classList.add("open"); $("scrim").hidden = false;
    $("filterToggle").setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }
  function closeSheet() {
    $("side").classList.remove("open"); $("scrim").hidden = true;
    $("filterToggle").setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
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
    const reset = () => { state.sido = ""; state.sgg = ""; for (const k of SETS) state[k].clear(); update(); };
    $("reset").addEventListener("click", reset);
    $("emptyReset").addEventListener("click", () => { reset(); state.q = ""; q.value = ""; state.tab = "all"; update(); });
    $("filterToggle").addEventListener("click", () => ($("side").classList.contains("open") ? closeSheet() : openSheet()));
    $("sheetDone").addEventListener("click", () => { closeSheet(); window.scrollTo({ top: 0 }); });
    $("scrim").addEventListener("click", closeSheet);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });
    matchMedia("(min-width: 861px)").addEventListener("change", (e) => { if (e.matches) closeSheet(); });
    window.addEventListener("hashchange", () => { readHash(); q.value = state.q; $("sort").value = state.sort; update(); });
  }

  function renderUpdated(data) {
    const when = data.updated ? new Date(data.updated).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "알 수 없음";
    const sites = Object.entries(data.sites || {}).map(([k, s]) => `${SITES[k] || k} ${s.count.toLocaleString()}건${s.ok ? "" : "(최근 수집 실패)"}`);
    $("updated").textContent = `마지막 수집 ${when}` + (sites.length ? ` · ${sites.join(" · ")}` : "");
  }

  readHash();
  bind();
  // 사이트마다 파일이 따로 있다: data/sites/<사이트>.json (없는 사이트는 건너뜀)
  const loadSite = (k) => fetch(`data/sites/${k}.json`, { cache: "no-cache" })
    .then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const load = window.__CAMPAIGNS__
    ? Promise.resolve(window.__CAMPAIGNS__)
    : Promise.all(Object.keys(SITES).map(loadSite)).then((files) => {
        const data = { sites: {}, items: [], updated: null };
        for (const f of files) {
          if (!f) continue;
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
      update(true);
    })
    .catch(() => { $("summary").textContent = "공고 데이터를 불러오지 못했어요. 잠시 후 다시 열어 주세요."; });
})();
