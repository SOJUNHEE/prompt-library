(() => {
  "use strict";

  const D = window.NOTES;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const DAYCLS = { "DAY 1": "d1", "DAY 2": "d2", "DAY 3": "d3" };
  const groupOf = Object.fromEntries(D.groups.map((g) => [g.id, g]));
  const topicOf = Object.fromEntries(D.topics.map((t) => [t.id, t]));
  const PROMPTS = new Map(); // id -> text (복사용)

  // 빈칸 표시: {값}, (           ), (예: …), (여기에 … 붙여넣기) 같은 칸을 형광펜으로
  const BLANK_RE = /\{[^{}\n"':]{1,32}\}|\{[^{}\n"']{1,32}\}(?=\s*[,\n]|$)|\((?:\s{2,}|예:[^()\n]{0,60}|[^()\n]{0,40}(?:붙여넣기|여기에|내가|어떤 상황|무슨 문제|고른 상황|정답 프레임워크|직접 해 보고|내 게임|내 HTML)[^()\n]{0,40})\)/g;
  const markBlanks = (text) => {
    let out = "", last = 0;
    for (const m of text.matchAll(BLANK_RE)) {
      out += esc(text.slice(last, m.index)) + `<span class="slot">${esc(m[0])}</span>`;
      last = m.index + m[0].length;
    }
    return out + esc(text.slice(last));
  };

  const dayTag = (day) => (day ? `<span class="day ${DAYCLS[day] || ""}">${esc(day)}</span>` : "");

  // ---------- 그리기 ----------
  function promptBox(p) {
    PROMPTS.set(p.id, p.text);
    const kind = p.kind === "vibe" ? `<span class="kind vibe">바이브 코딩</span>` : p.kind === "ref" ? `<span class="kind">참고용</span>` : "";
    return `<div class="pbox" data-pid="${p.id}">
      <div class="pbox-head">
        <div class="pbox-lab">${kind}${esc(p.lab)}${p.where ? `<span class="pbox-where">📍 ${esc(p.where)}</span>` : ""}</div>
        <button type="button" class="copy-btn" data-copy="${p.id}" aria-label="${esc(p.lab)} 복사">복사</button>
      </div>
      <pre>${markBlanks(p.text)}</pre>
    </div>`;
  }

  function promptList(list) {
    let html = "";
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      html += promptBox(p);
      if (p.join && list[i + 1]) {
        const id = p.id + "+" + list[i + 1].id;
        PROMPTS.set(id, p.text + "\n\n" + list[i + 1].text);
        html += promptBox(list[i + 1]) +
          `<div class="join-row"><button type="button" class="copy-btn" data-copy="${id}">위 두 상자 한 번에 복사</button></div>`;
        i++;
      }
    }
    return `<div class="prompts">${html}</div>`;
  }

  function table(b) {
    return `<div class="t-table"><table><thead><tr>${b.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>` +
      b.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("") + `</tbody></table></div>`;
  }

  function topicHTML(t) {
    const g = groupOf[t.group];
    let h = `<section class="topic" id="${t.id}" data-group="${t.group}">`;
    h += `<p class="t-meta">${dayTag(g.day)}<span>${esc(g.title)}</span>${t.en ? `<span>· ${esc(t.en)}</span>` : ""}</p>`;
    h += `<h2>${esc(t.title)}</h2>`;
    if (t.summary) h += `<p class="t-sum">${esc(t.summary)}</p>`;
    if (t.points && t.points.length) h += `<ul class="t-points">${t.points.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
    for (const b of t.blocks || []) if (b.type === "table") h += table(b);
    if (t.fixes) {
      h += `<h3 class="t-sub">AI가 이럴 때는 이 기법</h3><ul class="fixes">` +
        t.fixes.map(([s, id]) => `<li><a href="#${id}"><span>${esc(s)}</span><span>${esc(topicOf[id] ? topicOf[id].title.replace(/ \(.*\)$/, "") : id)}</span></a></li>`).join("") + `</ul>`;
    }
    if (t.tool === "generator") h += generatorHTML();
    if (t.prompts && t.prompts.length) h += `<h3 class="t-sub">예시 프롬프트</h3>` + promptList(t.prompts);
    if (t.work && t.work.length) h += `<h3 class="t-sub">무역 업무에서는</h3><ul class="t-work">${t.work.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
    if (t.extra) h += `<details class="extra"><summary>${esc(t.extra.title)} (${t.extra.prompts.length}개)</summary>${promptList(t.extra.prompts)}</details>`;
    if (t.caution) h += `<p class="t-caution">${esc(t.caution)}</p>`;
    if (t.link) h += `<a class="t-link" href="#${t.link[0]}">${esc(t.link[1])}</a>`;
    return h + `</section>`;
  }

  function generatorHTML() {
    return `<form class="gen" id="gen" onsubmit="return false">
      <div><label for="g-task">작업</label><textarea id="g-task" rows="2" placeholder="예: 고객 클레임 이메일 답장 작성"></textarea></div>
      <div><label for="g-goal">원하는 결과물</label><textarea id="g-goal" rows="2" placeholder="예: 고객이 화가 풀리고 우리 회사를 신뢰하게 하는 답장"></textarea></div>
      <div><label for="g-avoid">피해야 할 것</label><textarea id="g-avoid" rows="2" placeholder="예: 방어적 태도, 책임 회피, 형식적인 사과"></textarea></div>
      <div class="gen-row">
        <span class="seg" role="group" aria-label="방식">
          <button type="button" data-mode="quick" aria-pressed="true">빠른 APE (후보 5개)</button>
          <button type="button" data-mode="master" aria-pressed="false">마스터 APE (후보 10개)</button>
        </span>
      </div>
      <div class="gen-row">
        <span class="gen-hint">예시 채우기:</span>
        <button type="button" class="chip" data-ex="0">클레임 답장</button>
        <button type="button" class="chip" data-ex="1">바이어 첫 연락 메일</button>
        <button type="button" class="chip" data-ex="2">인스타 제품 소개 글</button>
      </div>
      <div class="gen-row">
        <button type="button" class="btn primary" id="g-build">프롬프트 조립하기</button>
        <button type="button" class="btn" id="g-clear">지우기</button>
      </div>
      <div class="gen-out" id="g-out" hidden>
        <div class="pbox">
          <div class="pbox-head">
            <div class="pbox-lab">완성 프롬프트<span class="pbox-where">📍 복사해서 Gemini나 Claude 새 채팅에 붙여넣기</span></div>
            <button type="button" class="copy-btn" data-copy="gen-out">복사</button>
          </div>
          <pre id="g-text"></pre>
        </div>
        <div class="gen-row" style="margin-top:10px">
          <a class="btn" href="https://claude.ai/new" target="_blank" rel="noopener">Claude 열기</a>
          <a class="btn" href="https://gemini.google.com/app" target="_blank" rel="noopener">Gemini 열기</a>
        </div>
      </div>
      <details class="api" id="api">
        <summary>OpenAI API로 바로 만들기 (선택)</summary>
        <p class="warn">내 OpenAI API 키로 이 화면에서 바로 결과를 받아요. 키는 저장하지 않고, 이 브라우저에서 OpenAI로만 보내요. 사용량만큼 내 계정에 요금이 나가요. 공용 컴퓨터에서는 쓰지 마세요.</p>
        <div class="api-grid">
          <div><label for="g-key">API 키</label><input id="g-key" type="password" autocomplete="off" spellcheck="false" placeholder="sk-로 시작하는 키"></div>
          <div><label for="g-model">모델</label><input id="g-model" type="text" value="gpt-5.4-mini" autocomplete="off" spellcheck="false"></div>
        </div>
        <div class="gen-row" style="margin-top:12px"><button type="button" class="btn primary" id="g-run">조립한 프롬프트로 생성</button></div>
        <p class="api-status" id="g-status" role="status"></p>
        <div class="gen-out" id="g-res" hidden>
          <div class="pbox">
            <div class="pbox-head">
              <div class="pbox-lab">AI 결과</div>
              <button type="button" class="copy-btn" data-copy="gen-res">복사</button>
            </div>
            <pre id="g-restext"></pre>
          </div>
        </div>
      </details>
    </form>`;
  }

  // 목차
  function buildToc() {
    let h = "";
    for (const g of D.groups) {
      const ts = D.topics.filter((t) => t.group === g.id);
      h += `<div class="toc-group"><p class="toc-gtitle">${dayTag(g.day)}<span>${esc(g.title)}</span></p>` +
        ts.map((t) => `<a href="#${t.id}" data-tid="${t.id}">${esc(t.title)}</a>`).join("") + `</div>`;
    }
    $("tocNav").innerHTML = h;
  }

  $("topics").innerHTML = D.topics.map(topicHTML).join("");
  buildToc();
  const realTopics = D.topics.filter((t) => t.group !== "start" && t.group !== "tools").length;
  $("heroStats").innerHTML =
    `<li><b>${realTopics}</b>개 기법</li><li><b>${D.counts.prompts}</b>개 예시 프롬프트</li><li><b>3</b>일 수업</li>`;

  // ---------- 복사 ----------
  const toast = $("toast");
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(showToast.t);
    showToast.t = setTimeout(() => toast.classList.remove("show"), 1800);
  }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand("copy"); } catch (e2) {}
      ta.remove(); return ok;
    }
  }
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-copy]");
    if (!b) return;
    const id = b.dataset.copy;
    const text = id === "gen-out" ? $("g-text").textContent : id === "gen-res" ? $("g-restext").textContent : PROMPTS.get(id);
    if (!text) return;
    const ok = await copyText(text);
    const old = b.textContent;
    b.textContent = ok ? "복사됨" : "복사 실패";
    b.classList.add("done");
    showToast(ok ? "복사했어요. 새 채팅에 붙여넣으세요" : "복사하지 못했어요. 글자를 직접 선택해 주세요");
    setTimeout(() => { b.textContent = old; b.classList.remove("done"); }, 1500);
  });

  // ---------- 목차: 모바일 서랍 ----------
  const toc = $("toc"), scrim = $("scrim"), menuBtn = $("menuBtn");
  const mobile = window.matchMedia("(max-width: 900px)");
  function openToc() {
    toc.classList.add("open"); scrim.hidden = false; document.body.classList.add("locked");
    menuBtn.setAttribute("aria-expanded", "true");
    const a = toc.querySelector("a.active") || toc.querySelector("a");
    if (a) { a.scrollIntoView({ block: "center" }); a.focus({ preventScroll: true }); }
  }
  function closeToc(focusBack) {
    if (!toc.classList.contains("open")) return;
    toc.classList.remove("open"); scrim.hidden = true; document.body.classList.remove("locked");
    menuBtn.setAttribute("aria-expanded", "false");
    if (focusBack) menuBtn.focus();
  }
  menuBtn.addEventListener("click", () => (toc.classList.contains("open") ? closeToc(true) : openToc()));
  $("tocClose").addEventListener("click", () => closeToc(true));
  scrim.addEventListener("click", () => closeToc(true));
  toc.addEventListener("click", (e) => { if (e.target.closest("a") && mobile.matches) closeToc(false); });
  const setPlaceholder = () => { $("q").placeholder = mobile.matches ? "기법·예시 검색" : "기법·예시 검색 (예: 퓨샷, 바이어)"; };
  setPlaceholder();
  mobile.addEventListener("change", () => { setPlaceholder(); if (!mobile.matches) closeToc(false); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeToc(true);
    if (e.key === "Tab" && toc.classList.contains("open")) {
      const f = [...toc.querySelectorAll("a, button")].filter((n) => n.offsetParent !== null);
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") { e.preventDefault(); $("q").focus(); }
  });

  // ---------- 지금 읽는 기법 표시 ----------
  const links = Object.fromEntries([...toc.querySelectorAll("a[data-tid]")].map((a) => [a.dataset.tid, a]));
  let current = null;
  const spy = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) setActive(en.target.id);
  }, { rootMargin: "-20% 0px -70% 0px" });
  function setActive(id) {
    if (current === id || !links[id]) return;
    if (current && links[current]) links[current].classList.remove("active");
    current = id;
    links[id].classList.add("active");
    links[id].setAttribute("aria-current", "true");
    if (!mobile.matches) {
      const box = $("tocNav"), a = links[id];
      if (a.offsetTop < box.scrollTop || a.offsetTop > box.scrollTop + box.clientHeight - 40) box.scrollTo({ top: a.offsetTop - 80 });
    }
  }
  document.querySelectorAll(".topic").forEach((s) => spy.observe(s));

  // ---------- 검색 ----------
  const searchText = Object.fromEntries(D.topics.map((t) => {
    const parts = [t.title, t.en, t.summary, ...(t.points || []), ...(t.work || []), t.caution || "",
      ...(t.prompts || []).map((p) => p.lab + " " + p.text), ...((t.extra && t.extra.prompts) || []).map((p) => p.lab + " " + p.text),
      ...(t.blocks || []).flatMap((b) => [...b.head, ...b.rows.flat()])];
    return [t.id, parts.join(" ").toLowerCase()];
  }));
  let qTimer;
  $("q").addEventListener("input", () => {
    clearTimeout(qTimer);
    qTimer = setTimeout(() => {
      const words = $("q").value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      let shown = 0;
      for (const t of D.topics) {
        const ok = !words.length || words.every((w) => searchText[t.id].includes(w));
        $(t.id).hidden = !ok;
        links[t.id].classList.toggle("dim", !ok);
        if (ok) shown++;
      }
      document.querySelector(".hero").hidden = words.length > 0;
      document.querySelectorAll(".toc-group").forEach((g) => { g.hidden = !g.querySelector("a:not(.dim)"); });
      $("searchEmpty").hidden = shown > 0;
      if (words.length) window.scrollTo({ top: 0 });
    }, 150);
  });

  // ---------- 생성기 ----------
  const EX = [
    ["고객 클레임 이메일 답장 작성", "고객이 화가 풀리고 우리 회사를 신뢰하게 하는 답장", "방어적 태도, 책임 회피, 형식적인 사과"],
    ["바이어 첫 연락 이메일", "답장을 받고 싶게 만드는 짧은 영문 메일", "과장 광고, 긴 회사 소개"],
    ["인스타그램 제품 소개 글", "20대가 저장하고 싶은 글", "뻔한 표현, 해시태그 10개 이상"],
  ];
  let mode = "quick";
  const gen = $("gen");
  if (gen) {
    const f = { task: $("g-task"), goal: $("g-goal"), avoid: $("g-avoid") };
    gen.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => {
      mode = b.dataset.mode;
      gen.querySelectorAll("[data-mode]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      if (!$("g-out").hidden) build();
    }));
    gen.querySelectorAll("[data-ex]").forEach((b) => b.addEventListener("click", () => {
      const [a, c, d] = EX[Number(b.dataset.ex)];
      f.task.value = a; f.goal.value = c; f.avoid.value = d;
      build();
    }));
    const val = (el, fallback) => el.value.trim() || fallback;
    function build() {
      const task = val(f.task, "{작업}"), goal = val(f.goal, "{원하는 결과물}"), avoid = val(f.avoid, "{피해야 할 것}");
      let text;
      if (mode === "quick") {
        // 수업의 '빠른 APE' 틀에 세 줄을 채워 넣음
        text = D.gen.quick
          .replace(/작업:\s*\(\s*\)/, "작업: " + task)
          .replace(/원하는 결과물:\s*\(\s*\)/, "원하는 결과물: " + goal)
          .replace(/피해야 할 것:\s*\(\s*\)/, "피해야 할 것: " + avoid);
      } else {
        // 수업의 'APE 마스터 프롬프트' + 작업 입력
        const input = D.gen.masterInput
          .replace(/작업\s*:\s*\{[^}]*\}/, "작업 : " + task)
          .replace(/원하는 결과물\s*:\s*\{[^}]*\}/, "원하는 결과물 : " + goal)
          .replace(/피해야 할 것\s*:\s*\{[^}]*\}/, "피해야 할 것 : " + avoid);
        text = D.gen.master + "\n\n" + input;
      }
      $("g-text").innerHTML = markBlanks(text);
      $("g-out").hidden = false;
      return text;
    }
    $("g-build").addEventListener("click", () => {
      if (!f.task.value.trim()) { f.task.focus(); showToast("작업을 먼저 적어 주세요"); return; }
      build();
      $("g-out").scrollIntoView({ block: "nearest" });
    });
    $("g-clear").addEventListener("click", () => {
      f.task.value = f.goal.value = f.avoid.value = "";
      $("g-out").hidden = true;
      f.task.focus();
    });

    // OpenAI API (선택): 키는 변수에만 잠깐 두고 저장하지 않음
    $("g-run").addEventListener("click", async () => {
      const status = $("g-status");
      const key = $("g-key").value.trim();
      const model = $("g-model").value.trim() || "gpt-5.4-mini";
      status.className = "api-status";
      if (!f.task.value.trim()) { status.textContent = "작업을 먼저 적어 주세요."; status.classList.add("err"); f.task.focus(); return; }
      if (!key) { status.textContent = "API 키를 입력해 주세요."; status.classList.add("err"); $("g-key").focus(); return; }
      const prompt = build();
      const btn = $("g-run");
      btn.disabled = true;
      status.textContent = "만드는 중이에요… (보통 10~40초)";
      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
          body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = (data.error && data.error.message) || res.statusText;
          const hint = res.status === 401 ? "API 키를 다시 확인해 주세요." : res.status === 404 ? "모델 이름을 확인해 주세요." :
            res.status === 429 ? "사용 한도나 결제 상태를 확인해 주세요." : "";
          throw new Error(`${res.status} 오류: ${msg} ${hint}`);
        }
        const out = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        $("g-restext").textContent = out || "(빈 결과가 왔어요)";
        $("g-res").hidden = false;
        status.textContent = "완료했어요. AI 결과도 초안이니 한 번 읽고 다듬어 쓰세요.";
      } catch (err) {
        status.textContent = "생성하지 못했어요. " + err.message;
        status.classList.add("err");
      } finally {
        btn.disabled = false;
      }
    });
  }

  // 주소에 #기법 이 있으면 그 위치로
  if (location.hash && $(location.hash.slice(1))) setTimeout(() => $(location.hash.slice(1)).scrollIntoView(), 50);
})();
