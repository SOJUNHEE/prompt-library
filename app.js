(() => {
  "use strict";

  const PAGE = 40;
  const VAR_RE = /\$\{([^}\n]{1,120})\}/g;
  const PC_REPO = "https://github.com/f/prompts.chat";
  const FB_BASE = "https://github.com/danielmiessler/fabric/blob/main/data/patterns/";

  // 한국어 검색어 → 영어 검색어 (본문이 영어라서)
  const KO = {
    "이메일": "email", "메일": "email", "편지": "letter", "마케팅": "marketing", "광고": "advertis",
    "카피": "copywrit", "요약": "summar", "번역": "translat", "코드": "code", "코딩": "code",
    "프로그래밍": "programm", "개발자": "developer", "개발": "develop", "파이썬": "python",
    "자바스크립트": "javascript", "엑셀": "excel", "스프레드시트": "spreadsheet", "데이터": "data",
    "분석": "analy", "통계": "statistic", "보고서": "report", "회의": "meeting", "기획": "plan",
    "계획": "plan", "디자인": "design", "이미지": "image", "사진": "photo", "그림": "illustrat",
    "영상": "video", "유튜브": "youtube", "인스타": "instagram", "인스타그램": "instagram",
    "블로그": "blog", "글쓰기": "writ", "작가": "writer", "소설": "story", "이야기": "story",
    "시": "poem", "노래": "song", "가사": "lyric", "음악": "music", "선생님": "teacher",
    "교사": "teacher", "학생": "student", "공부": "study", "수업": "lesson", "퀴즈": "quiz",
    "시험": "exam", "수학": "math", "영어": "english", "여행": "travel", "요리": "recipe",
    "레시피": "recipe", "건강": "health", "운동": "fitness", "식단": "diet", "이력서": "resume",
    "자기소개서": "cover letter", "면접": "interview", "취업": "job", "커리어": "career",
    "링크드인": "linkedin", "판매": "sales", "영업": "sales", "고객": "customer", "상담": "advis",
    "법률": "legal", "계약": "contract", "논문": "paper", "연구": "research", "리뷰": "review",
    "검토": "review", "피드백": "feedback", "전략": "strateg", "비즈니스": "business",
    "사업": "business", "창업": "startup", "스타트업": "startup", "투자": "invest", "재무": "financ",
    "회계": "account", "물류": "logistic", "공급망": "supply chain", "무역": "trade", "수출": "export",
    "수입": "import", "협상": "negotiat", "프롬프트": "prompt", "챗봇": "chatbot", "제품": "product",
    "상품": "product", "브랜드": "brand", "슬로건": "slogan", "제목": "title", "설명": "explain",
    "토론": "debate", "철학": "philosoph", "역사": "histor", "심리": "psycholog", "코치": "coach",
    "멘토": "mentor", "소셜": "social", "트위터": "tweet", "보안": "security", "웹사이트": "website",
    "홈페이지": "website", "앱": "app", "게임": "game", "번역가": "translator", "의사": "doctor",
    "변호사": "lawyer", "면접관": "interviewer", "추천": "recommend", "아이디어": "idea",
    "문법": "grammar", "교정": "proofread", "질문": "question", "인터뷰": "interview",
  };

  const $ = (id) => document.getElementById(id);
  const el = {
    q: $("q"), count: $("count"), hint: $("hint"), list: $("list"), empty: $("empty"),
    sentinel: $("sentinel"), src: $("src"), kind: $("kind"), onlyVars: $("onlyVars"),
    devs: $("devs"), sort: $("sort"), reset: $("reset"),
    scrim: $("scrim"), drawer: $("drawer"), dSrc: $("d-src"), dTitle: $("d-title"),
    dClose: $("d-close"), dVars: $("d-vars"), dFields: $("d-fields"), dText: $("d-text"),
    dCopy: $("d-copy"), dLink: $("d-link"), toast: $("toast"),
    dEn: $("d-en"), dKo: $("d-ko"), dKoText: $("d-ko-text"), koReply: $("koReply"),
    bar: $("bar"), filters: $("filters"), filterBtn: $("filterBtn"), badge: $("filterBadge"),
    sheetClose: $("sheetClose"), applyBtn: $("applyBtn"), resetSheet: $("resetSheet"), resetSide: $("resetSide"),
  };
  const mobile = window.matchMedia("(max-width: 820px)");
  const KO_KEYS = Object.keys(KO).sort((a, b) => b.length - a.length);
  const DEFAULT_HINT = "한글 제목·설명으로 찾을 수 있어요. 영어 원문 본문까지 찾으려면 영어 단어도 써 보세요.";
  const KO_REPLY = "\n\n답변은 한국어로 해 주세요.";
  try { const v = localStorage.getItem("koReply"); if (v !== null) document.getElementById("koReply").checked = v === "1"; } catch (e) {}

  const state = {
    items: [], meta: null, full: null, lowerFull: null, lowerTitle: [],
    q: "", src: "all", kind: "all", onlyVars: false, devs: false, sort: "default",
    results: [], shown: 0, openId: null, lastFocus: null, values: {},
  };
  let fullPromise = null;

  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n) => n.toLocaleString("ko-KR");

  // ---------- 데이터 ----------
  async function load() {
    try {
      const res = await fetch("index.json", { cache: "no-cache" });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      state.items = data.items;
      state.meta = data.meta;
      state.lowerTitle = state.items.map((x) => [x.t, x.p, x.id || "", x.kt || "", x.kd || ""].join(" ").toLowerCase());
      buildKindChips();
      fullPromise = loadFull();
      fullPromise.catch(() => {});
      apply(true);
      readHash();
    } catch (e) {
      el.count.textContent = "목록을 불러오지 못했어요. 새로고침해 주세요.";
    }
  }

  async function loadFull() {
    const res = await fetch("full.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    state.full = await res.json();
    state.lowerFull = state.full.map((t) => t.toLowerCase());
    if (state.q) apply(true);
    return state.full;
  }

  // ---------- 검색어 ----------
  function terms(q) {
    const out = [];
    const ko = [];
    for (const raw of q.toLowerCase().split(/\s+/).filter(Boolean)) {
      // 정확히 같은 단어 먼저, 없으면 조사가 붙은 경우("이메일을" → "이메일")만 긴 단어부터
      const stem = KO[raw] ? raw : KO_KEYS.find((k) => raw.startsWith(k) && raw.length - k.length <= 2 && k.length >= 2);
      if (stem) { ko.push([stem, KO[stem]]); out.push([raw, KO[stem]]); continue; }
      out.push([raw]);
    }
    return { out, ko };
  }

  function matches(i, tlist) {
    const hay = state.lowerTitle[i];
    const full = state.lowerFull ? state.lowerFull[i] : "";
    return tlist.every((alts) => alts.some((t) => hay.includes(t) || (full && full.includes(t))));
  }

  // ---------- 필터 적용 ----------
  function apply(keepScroll) {
    const { out, ko } = terms(state.q);
    const res = [];
    for (let i = 0; i < state.items.length; i++) {
      const x = state.items[i];
      if (state.src !== "all" && x.s !== state.src) continue;
      if (state.kind !== "all" && x.k !== state.kind) continue;
      if (state.onlyVars && !x.v) continue;
      if (state.devs && !x.d) continue;
      if (out.length && !matches(i, out)) continue;
      res.push(i);
    }
    const it = state.items;
    if (state.sort === "title") res.sort((a, b) => (it[a].kt || it[a].t).localeCompare(it[b].kt || it[b].t, "ko"));
    else if (state.sort === "short") res.sort((a, b) => it[a].n - it[b].n);
    else if (state.sort === "long") res.sort((a, b) => it[b].n - it[a].n);

    state.results = res;
    state.shown = 0;
    el.list.innerHTML = "";
    renderMore();

    const total = state.items.length;
    el.count.innerHTML = res.length === total
      ? `<b>${fmt(total)}</b>개 프롬프트`
      : `${fmt(total)}개 중 <b>${fmt(res.length)}</b>개`;
    if (state.q && !state.lowerFull) el.count.innerHTML += " · 본문 검색 준비 중";
    el.empty.hidden = res.length > 0;

    if (ko.length) {
      el.hint.className = "hint";
      el.hint.innerHTML = "함께 찾는 영어 단어: " + ko.map(([k, e]) => `${esc(k)} → <span class="terms">${esc(e)}</span>`).join(", ");
    } else {
      el.hint.className = "hint default";
      el.hint.textContent = DEFAULT_HINT;
    }
    el.applyBtn.textContent = `결과 ${fmt(res.length)}개 보기`;
    updateBadge();
    if (!keepScroll) {
      const listTop = el.list.getBoundingClientRect().top + window.scrollY - el.bar.offsetHeight - 8;
      if (window.scrollY > listTop) window.scrollTo({ top: listTop });
    }
  }

  function activeFilterCount() {
    return (state.src !== "all") + (state.kind !== "all") + state.onlyVars + state.devs + (state.sort !== "default");
  }
  function updateBadge() {
    const n = activeFilterCount();
    el.badge.hidden = n === 0;
    el.badge.textContent = n;
    el.filterBtn.classList.toggle("active", n > 0);
    el.filterBtn.setAttribute("aria-label", n ? `필터, ${n}개 적용 중` : "필터");
  }

  function highlight(text, tlist) {
    let html = esc(text);
    const words = tlist.flat().filter((t) => t.length > 1).sort((a, b) => b.length - a.length);
    if (!words.length) return html;
    const re = new RegExp("(" + words.map((w) => esc(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "gi");
    return html.replace(re, "<mark>$1</mark>");
  }

  // 미리보기 속 ${이름:예시} → 형광펜 빈칸 (예시값만 보여 줌)
  function slotPreview(html) {
    return html.replace(/\$\{([^}]{1,120})\}?/g, (m, inner) => {
      const cut = inner.indexOf(":");
      const shown = cut >= 0 ? inner.slice(cut + 1) : inner;
      return `<span class="slot">${shown}</span>`;
    });
  }

  function renderMore() {
    const { out } = terms(state.q);
    const end = Math.min(state.shown + PAGE, state.results.length);
    const frag = document.createDocumentFragment();
    for (let k = state.shown; k < end; k++) {
      const i = state.results[k];
      const x = state.items[i];
      const li = document.createElement("li");
      li.className = "row";
      li.innerHTML =
        `<button type="button" data-i="${i}">` +
        `<span class="r-title">${highlight(x.kt || x.t, out)}${x.kt ? `<span class="r-en">${highlight(x.t, out)}</span>` : ""}</span>` +
        `<span class="r-meta">${x.v ? `<span class="vars-n">빈칸 ${x.v}</span>` : ""}` +
        `<span class="src ${x.s}">${x.s === "pc" ? "prompts.chat" : "Fabric"}</span>` +
        `<span>${esc(x.k)}</span><span>${fmt(x.n)}자</span></span>` +
        `<span class="r-prev">${x.kd ? highlight(x.kd, out) : slotPreview(highlight(x.p, out))}</span></button>`;
      frag.appendChild(li);
    }
    el.list.appendChild(frag);
    state.shown = end;
  }

  new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && state.shown < state.results.length) renderMore();
  }, { rootMargin: "600px" }).observe(el.sentinel);

  // ---------- 종류 칩 ----------
  // 출처별로 묶어서 보여 줌 (prompts.chat은 형식, Fabric은 하는 일 기준이라 섞이면 헷갈림)
  const kindOpen = { pc: false, fb: false };
  function buildKindChips() {
    const groups = { pc: new Map(), fb: new Map() };
    for (const x of state.items) {
      if (state.src !== "all" && x.s !== state.src) continue;
      groups[x.s].set(x.k, (groups[x.s].get(x.k) || 0) + 1);
    }
    const all = new Set([...groups.pc.keys(), ...groups.fb.keys()]);
    if (state.kind !== "all" && !all.has(state.kind)) state.kind = "all";
    const chip = (v, label, n) =>
      `<button type="button" data-v="${esc(v)}" aria-pressed="${state.kind === v}"><span>${esc(label)}</span>${n != null ? `<span class="n">${fmt(n)}</span>` : ""}</button>`;
    let html = `<div class="kgroup"><div class="kchips">${chip("all", "전체")}</div></div>`;
    for (const s of ["pc", "fb"]) {
      if (!groups[s].size) continue;
      const kinds = [...groups[s].entries()].sort((a, b) => b[1] - a[1]);
      const selectedHidden = kinds.findIndex(([k]) => k === state.kind) >= 6;
      const collapse = kinds.length > 7 && !kindOpen[s] && !selectedHidden;
      html += `<div class="kgroup"><p class="kgroup-title ${s}">${s === "pc" ? "prompts.chat · 형식" : "Fabric · 하는 일"}</p>` +
        `<div class="kchips${collapse ? " collapsed" : ""}">${kinds.map(([k, n]) => chip(k, k, n)).join("")}</div>` +
        (collapse ? `<button type="button" class="kmore" data-more="${s}">${kinds.length - 6}개 더 보기</button>` : "") +
        `</div>`;
    }
    el.kind.innerHTML = html;
  }

  // ---------- 모바일 필터 시트 ----------
  function openSheet() {
    el.filters.classList.add("open");
    el.filterBtn.setAttribute("aria-expanded", "true");
    el.scrim.hidden = false;
    document.body.classList.add("locked");
    el.sheetClose.focus();
  }
  function closeSheet(focusBack = true) {
    if (!el.filters.classList.contains("open")) return;
    el.filters.classList.remove("open");
    el.filterBtn.setAttribute("aria-expanded", "false");
    if (el.drawer.hidden) { el.scrim.hidden = true; document.body.classList.remove("locked"); }
    if (focusBack) el.filterBtn.focus();
  }
  function resetFilters() {
    state.src = "all"; state.kind = "all"; state.onlyVars = false; state.devs = false; state.sort = "default";
    el.onlyVars.checked = false; el.devs.checked = false; el.sort.value = "default";
    for (const x of el.src.children) x.setAttribute("aria-pressed", String(x.dataset.v === "all"));
    buildKindChips();
    apply();
  }

  // 고정 검색줄 높이를 CSS에 알려 줌 (사이드바·스크롤 위치 계산용)
  new ResizeObserver(() => {
    document.documentElement.style.setProperty("--bar-h", el.bar.offsetHeight + "px");
  }).observe(el.bar);
  new IntersectionObserver(([e]) => el.bar.classList.toggle("stuck", !e.isIntersecting))
    .observe(document.querySelector(".top"));

  // ---------- 상세 ----------
  function parseVars(text) {
    const vars = new Map();
    for (const m of text.matchAll(VAR_RE)) {
      const inner = m[1];
      const cut = inner.indexOf(":");
      const name = (cut >= 0 ? inner.slice(0, cut) : inner).trim();
      const def = cut >= 0 ? inner.slice(cut + 1).trim() : "";
      if (name && !vars.has(name)) vars.set(name, def);
    }
    return vars;
  }

  function fill(text, vars, asHtml) {
    let last = 0;
    let out = "";
    for (const m of text.matchAll(VAR_RE)) {
      const inner = m[1];
      const cut = inner.indexOf(":");
      const name = (cut >= 0 ? inner.slice(0, cut) : inner).trim();
      const typed = state.values[name];
      const def = vars.get(name) || "";
      const val = typed ? typed : (def || "{" + name + "}");
      const before = text.slice(last, m.index);
      if (asHtml) {
        out += esc(before) + `<span class="slot${typed ? " filled" : ""}" title="${esc(name)}">${esc(val)}</span>`;
      } else {
        out += before + val;
      }
      last = m.index + m[0].length;
    }
    const rest = text.slice(last);
    return out + (asHtml ? esc(rest) : rest);
  }

  async function open(i, fromHash) {
    const x = state.items[i];
    if (!x) return;
    state.openId = i;
    state.values = {};
    if (!fromHash) state.lastFocus = document.activeElement;
    el.dTitle.textContent = x.kt || x.t;
    el.dEn.textContent = x.kt ? x.t : "";
    el.dEn.hidden = !x.kt;
    el.dKoText.textContent = x.kd || "";
    el.dKo.hidden = !x.kd;
    el.dSrc.innerHTML =
      `<span class="src ${x.s}">${x.s === "pc" ? "prompts.chat" : "Fabric"}</span>` +
      `<span>${esc(x.k)}</span>` +
      (x.s === "pc" ? `<span>CC0 퍼블릭 도메인</span>` : `<span>MIT 라이선스</span>`) +
      (x.a ? `<span>작성: ${esc(x.a)}</span>` : "");
    el.dLink.href = x.s === "fb" ? FB_BASE + encodeURIComponent(x.id) + "/system.md" : PC_REPO;
    el.dLink.textContent = x.s === "fb" ? "원본 보기 (GitHub)" : "출처 저장소";
    el.dVars.hidden = true;
    el.dText.className = "prompt loading";
    el.dText.textContent = "본문을 불러오는 중…";
    el.toast.textContent = "";
    el.scrim.hidden = false;
    el.drawer.hidden = false;
    document.body.classList.add("locked");
    el.dClose.focus();
    if (location.hash !== "#p" + i) history.replaceState(null, "", "#p" + i);

    let full;
    try { full = state.full || (await fullPromise); } catch (e) {
      el.dText.textContent = "본문을 불러오지 못했어요. 새로고침 후 다시 열어 주세요.";
      return;
    }
    if (state.openId !== i) return;
    const text = full[i];
    const vars = parseVars(text);
    el.dText.className = "prompt";
    if (vars.size) {
      el.dFields.innerHTML = [...vars.entries()].map(([name, def], k) =>
        `<div class="field"><label for="v${k}">${esc(name)}</label>` +
        `<input id="v${k}" data-name="${esc(name)}" placeholder="${esc(def || "직접 입력")}" autocomplete="off"></div>`).join("");
      el.dVars.hidden = false;
      el.dFields.oninput = (e) => {
        const name = e.target.dataset.name;
        if (name == null) return;
        state.values[name] = e.target.value;
        el.dText.innerHTML = fill(text, vars, true);
      };
      el.dText.innerHTML = fill(text, vars, true);
    } else {
      el.dText.textContent = text;
    }
    el.dCopy.onclick = () => copy(vars.size ? fill(text, vars, false) : text, vars.size);
  }

  function close() {
    el.drawer.hidden = true;
    el.scrim.hidden = true;
    document.body.classList.remove("locked");
    state.openId = null;
    history.replaceState(null, "", location.pathname + location.search);
    if (state.lastFocus && document.contains(state.lastFocus)) state.lastFocus.focus();
  }

  async function copy(text, hasVars) {
    if (el.koReply.checked) text += KO_REPLY;
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    el.toast.textContent = (hasVars ? "빈칸을 채운 내용으로 복사했어요" : "복사했어요") + (el.koReply.checked ? " (한국어 답변 요청 포함)" : "");
    clearTimeout(copy.t);
    copy.t = setTimeout(() => (el.toast.textContent = ""), 2400);
  }

  function readHash() {
    const m = location.hash.match(/^#p(\d+)$/);
    if (m) open(Number(m[1]), true);
  }

  // ---------- 이벤트 ----------
  let timer;
  el.q.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => { state.q = el.q.value.trim(); apply(); }, 160);
  });
  el.src.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    state.src = b.dataset.v;
    for (const x of el.src.children) x.setAttribute("aria-pressed", String(x === b));
    buildKindChips();
    apply(mobile.matches);
  });
  el.kind.addEventListener("click", (e) => {
    const more = e.target.closest("button[data-more]");
    if (more) { kindOpen[more.dataset.more] = true; buildKindChips(); return; }
    const b = e.target.closest("button[data-v]");
    if (!b) return;
    state.kind = b.dataset.v;
    for (const x of el.kind.querySelectorAll("button[data-v]")) x.setAttribute("aria-pressed", String(x === b));
    apply(mobile.matches);
  });
  el.onlyVars.addEventListener("change", () => { state.onlyVars = el.onlyVars.checked; apply(mobile.matches); });
  el.devs.addEventListener("change", () => { state.devs = el.devs.checked; apply(mobile.matches); });
  el.sort.addEventListener("change", () => { state.sort = el.sort.value; apply(mobile.matches); });
  el.reset.addEventListener("click", resetFilters);
  el.resetSide.addEventListener("click", resetFilters);
  el.resetSheet.addEventListener("click", resetFilters);
  el.filterBtn.addEventListener("click", () => (el.filters.classList.contains("open") ? closeSheet() : openSheet()));
  el.sheetClose.addEventListener("click", () => closeSheet());
  el.applyBtn.addEventListener("click", () => {
    closeSheet(false);
    const listTop = el.list.getBoundingClientRect().top + window.scrollY - el.bar.offsetHeight - 8;
    if (window.scrollY > listTop) window.scrollTo({ top: listTop });
  });
  const setPlaceholder = () => {
    el.q.placeholder = mobile.matches ? "검색 (예: 이메일, 요약)" : "찾을 내용 (예: 이메일, 요약, marketing)";
  };
  setPlaceholder();
  mobile.addEventListener("change", () => { setPlaceholder(); if (!mobile.matches) closeSheet(false); });
  el.list.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-i]");
    if (b) open(Number(b.dataset.i));
  });
  el.koReply.addEventListener("change", () => { try { localStorage.setItem("koReply", el.koReply.checked ? "1" : "0"); } catch (e) {} });
  el.dClose.addEventListener("click", close);
  el.scrim.addEventListener("click", () => (el.drawer.hidden ? closeSheet() : close()));
  function trap(e, box, sel) {
    const f = [...box.querySelectorAll(sel)].filter((n) => n.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  document.addEventListener("keydown", (e) => {
    const sheetOpen = el.filters.classList.contains("open");
    if (e.key === "Escape") { if (!el.drawer.hidden) close(); else if (sheetOpen) closeSheet(); }
    if (e.key === "/" && document.activeElement !== el.q && el.drawer.hidden && !sheetOpen) { e.preventDefault(); el.q.focus(); }
    if (e.key === "Tab") {
      if (!el.drawer.hidden) trap(e, el.drawer, "button, a[href], input, select, textarea");
      else if (sheetOpen) trap(e, el.filters, "button, a[href], input, select");
    }
  });
  window.addEventListener("hashchange", () => {
    if (/^#p\d+$/.test(location.hash)) readHash();
    else if (!el.drawer.hidden) close();
  });

  load();
})();
