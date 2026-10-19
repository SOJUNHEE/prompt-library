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
  };

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
      const res = await fetch("index.json");
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      state.items = data.items;
      state.meta = data.meta;
      state.lowerTitle = state.items.map((x) => (x.t + " " + x.p + " " + (x.id || "")).toLowerCase());
      buildKindChips();
      readHash();
      apply();
      fullPromise = loadFull();
    } catch (e) {
      el.count.textContent = "목록을 불러오지 못했어요. 새로고침해 주세요.";
    }
  }

  async function loadFull() {
    const res = await fetch("full.json");
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
      let word = raw;
      // 조사 떼기: "이메일을" → "이메일"
      const stem = Object.keys(KO).find((k) => raw === k || (raw.startsWith(k) && raw.length - k.length <= 2));
      if (stem) { ko.push([stem, KO[stem]]); out.push([raw, KO[stem]]); continue; }
      out.push([word]);
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
    if (state.sort === "title") res.sort((a, b) => it[a].t.localeCompare(it[b].t, "en"));
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
      el.hint.innerHTML = "함께 찾는 영어 단어: " + ko.map(([k, e]) => `${esc(k)} → <span class="terms">${esc(e)}</span>`).join(", ");
    } else {
      el.hint.textContent = "프롬프트 본문은 영어예요. 한국어로 검색하면 자주 쓰는 단어는 영어로 바꿔서 함께 찾아요.";
    }
    if (!keepScroll && window.scrollY > el.list.offsetTop) window.scrollTo({ top: el.list.offsetTop - 80 });
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
        `<span class="r-title">${highlight(x.t, out)}</span>` +
        `<span class="r-meta">${x.v ? `<span class="vars-n">빈칸 ${x.v}</span>` : ""}` +
        `<span class="src ${x.s}">${x.s === "pc" ? "prompts.chat" : "Fabric"}</span>` +
        `<span>${esc(x.k)}</span><span>${fmt(x.n)}자</span></span>` +
        `<span class="r-prev">${slotPreview(highlight(x.p, out))}</span></button>`;
      frag.appendChild(li);
    }
    el.list.appendChild(frag);
    state.shown = end;
  }

  new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && state.shown < state.results.length) renderMore();
  }, { rootMargin: "600px" }).observe(el.sentinel);

  // ---------- 종류 칩 ----------
  function buildKindChips() {
    const counts = new Map();
    for (const x of state.items) {
      if (state.src !== "all" && x.s !== state.src) continue;
      counts.set(x.k, (counts.get(x.k) || 0) + 1);
    }
    if (state.kind !== "all" && !counts.has(state.kind)) state.kind = "all";
    const kinds = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    el.kind.innerHTML =
      `<button type="button" data-v="all" aria-pressed="${state.kind === "all"}">전체</button>` +
      kinds.map(([k, n]) => `<button type="button" data-v="${esc(k)}" aria-pressed="${state.kind === k}">${esc(k)}<span class="n">${fmt(n)}</span></button>`).join("");
  }

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
    el.dTitle.textContent = x.t;
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
    document.body.style.overflow = "hidden";
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
    document.body.style.overflow = "";
    state.openId = null;
    history.replaceState(null, "", location.pathname + location.search);
    if (state.lastFocus && document.contains(state.lastFocus)) state.lastFocus.focus();
  }

  async function copy(text, hasVars) {
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
    el.toast.textContent = hasVars ? "빈칸을 채운 내용으로 복사했어요" : "복사했어요";
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
    apply();
  });
  el.kind.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    state.kind = b.dataset.v;
    for (const x of el.kind.children) x.setAttribute("aria-pressed", String(x === b));
    apply();
  });
  el.onlyVars.addEventListener("change", () => { state.onlyVars = el.onlyVars.checked; apply(); });
  el.devs.addEventListener("change", () => { state.devs = el.devs.checked; apply(); });
  el.sort.addEventListener("change", () => { state.sort = el.sort.value; apply(); });
  el.reset.addEventListener("click", () => {
    state.src = "all"; state.kind = "all"; state.onlyVars = false; state.devs = false;
    el.onlyVars.checked = false; el.devs.checked = false;
    for (const x of el.src.children) x.setAttribute("aria-pressed", String(x.dataset.v === "all"));
    buildKindChips();
    apply();
  });
  el.list.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-i]");
    if (b) open(Number(b.dataset.i));
  });
  const moreToggle = $("moreToggle");
  moreToggle.addEventListener("click", () => {
    const open = moreToggle.getAttribute("aria-expanded") !== "true";
    moreToggle.setAttribute("aria-expanded", String(open));
    $("moreFilters").classList.toggle("open", open);
    moreToggle.textContent = open ? "필터 접기" : "필터 더 보기";
  });
  el.dClose.addEventListener("click", close);
  el.scrim.addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !el.drawer.hidden) close();
    if (e.key === "/" && document.activeElement !== el.q && el.drawer.hidden) { e.preventDefault(); el.q.focus(); }
    if (e.key === "Tab" && !el.drawer.hidden) {
      const f = el.drawer.querySelectorAll("button, a[href], input, select, textarea");
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  window.addEventListener("hashchange", () => {
    if (/^#p\d+$/.test(location.hash)) readHash();
    else if (!el.drawer.hidden) close();
  });

  load();
})();
