// 유튜브 핀터레스트 — 크리에이터 1명용 보드 화면
(async function () {
  const slug = document.body.dataset.slug;
  const T = window.YTP_track || (() => {});
  const SECTIONS = [
    { key: "trend", label: "요즘 뜨는 영상" },
    { key: "audience", label: "내 시청자들이 본 영상" },
    { key: "global", label: "해외에서 뜨는 영상" },
  ];
  const FMT = { shorts: "쇼츠", long: "롱폼" };
  const store = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
                  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };

  const res = await fetch(`../data/${slug}.json?v=${Date.now()}`, { cache: "no-cache" });
  const D = await res.json();
  const st = {
    section: store.get(`ytp.${slug}.sec`, "trend"),
    format: D.formats.includes(store.get(`ytp.${slug}.fmt`, D.formats[0])) ? store.get(`ytp.${slug}.fmt`, D.formats[0]) : D.formats[0],
    sort: store.get(`ytp.${slug}.sort`, "mult"),
    days: store.get(`ytp.${slug}.days`, 60),
  };
  const save = () => { store.set(`ytp.${slug}.sec`, st.section); store.set(`ytp.${slug}.fmt`, st.format); store.set(`ytp.${slug}.sort`, st.sort); store.set(`ytp.${slug}.days`, st.days); };

  document.title = `${D.name} · 유튜브 핀터레스트`;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const num = (n) => n >= 1e8 ? (n / 1e8).toFixed(1).replace(/\.0$/, "") + "억" : n >= 1e4 ? (n / 1e4).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, "") + "만" : n.toLocaleString("ko-KR");
  const ago = (d) => d <= 0 ? "오늘" : d < 7 ? `${d}일 전` : d < 30 ? `${Math.floor(d / 7)}주 전` : `${Math.floor(d / 30)}달 전`;
  const mult = (m) => m >= 100 ? Math.round(m) : m >= 10 ? m.toFixed(0) : m.toFixed(1);

  // 탭
  const tabs = $("#tabs");
  tabs.innerHTML = SECTIONS.map((s) => `<button class="pill" type="button" data-sec="${s.key}">${s.label}</button>`).join("");
  tabs.addEventListener("click", (e) => { const b = e.target.closest("[data-sec]"); if (!b) return; st.section = b.dataset.sec; save(); T("section", st.section); render(); });

  const fmtSeg = $("#fmt");
  if (D.formats.length > 1) {
    fmtSeg.innerHTML = D.formats.map((f) => `<button type="button" data-fmt="${f}">${FMT[f]}</button>`).join("");
    fmtSeg.addEventListener("click", (e) => { const b = e.target.closest("[data-fmt]"); if (!b) return; st.format = b.dataset.fmt; save(); T("format", st.format); render(); });
  } else fmtSeg.hidden = true;
  $("#sort").value = st.sort;
  $("#sort").addEventListener("change", (e) => { st.sort = e.target.value; save(); T("sort", st.sort); render(); });
  $("#days").value = String(st.days);
  $("#days").addEventListener("change", (e) => { st.days = +e.target.value; save(); T("period", String(st.days)); render(); });

  function subline(list, all) {
    const m = D.meta[st.section] || {};
    const hot = all.filter((v) => v.mult >= 2).length;
    let note = "";
    if (st.section === "trend") note = `같은 분야 국내 채널에서 <strong>평소보다 잘 된</strong> ${FMT[st.format]}`;
    if (st.section === "audience") note = `댓글 단 시청자 ${m.commenters || 0}명 중 구독 목록이 공개된 <strong>${m.public || 0}명</strong>이 많이 구독한 채널의 잘 된 ${FMT[st.format]}`;
    if (st.section === "global") note = `미국·일본에서 최근 30일 <strong>구독자 대비 조회수가 높은</strong> ${FMT[st.format]}`;
    return `<span>${note}</span><span>${list.length}개 표시 · 2배 이상 ${hot}개</span>`;
  }

  function pin(v, i) {
    const badge = v.multKind === "channel" ? `평소의 <b>×${mult(v.mult)}</b>` : `구독자 대비 <b>×${mult(v.mult)}</b>`;
    const mm = Math.floor(v.sec / 60), ss = String(v.sec % 60).padStart(2, "0");
    const url = v.format === "shorts" ? `https://www.youtube.com/shorts/${v.id}` : `https://www.youtube.com/watch?v=${v.id}`;
    const why = v.why ? `<div class="why"><div class="sum">${esc(v.why.summary)}</div>
        <button type="button" data-why="${v.id}" aria-expanded="false">근거 보기</button>
        <ul hidden>${(v.why.reasons || []).map((r) => `<li>${esc(r)}</li>`).join("")}</ul></div>` : "";
    return `<div class="pin ${v.format}">
      <a class="img" href="${url}" target="_blank" rel="noopener" data-open="${v.id}" aria-label="${esc(v.title)} 유튜브에서 보기">
        <img loading="lazy" alt="" src="https://i.ytimg.com/vi/${v.id}/sddefault.jpg" onerror="this.onerror=null;this.src='https://i.ytimg.com/vi/${v.id}/hqdefault.jpg'">
        <span class="badge">${badge}</span><span class="rank">${i + 1}</span><span class="dur">${mm}:${ss}</span>
      </a>
      <div class="ptitle">${esc(v.title)}</div>
      <div class="pmeta"><span>${esc(v.channel)}</span><span>조회 ${num(v.views)}</span><span>${ago(v.age)}</span>${v.overlap ? `<span class="ov">내 시청자 ${v.overlap}명 구독</span>` : ""}</div>
      ${why}
    </div>`;
  }

  // 가장 짧은 열에 차례로 넣기 → 1등부터 왼쪽→오른쪽으로 읽힘
  function layout(list) {
    const board = $("#board");
    const w = board.clientWidth, colW = st.format === "long" ? 320 : 236, gap = 16;
    const n = Math.max(2, Math.floor((w + gap) / (colW + gap)));
    board.innerHTML = Array.from({ length: n }, () => `<div class="col"></div>`).join("");
    const cols = [...board.children];
    list.forEach((v, i) => {
      const target = cols.reduce((a, c) => (c.offsetHeight < a.offsetHeight ? c : a), cols[0]);
      target.insertAdjacentHTML("beforeend", pin(v, i));
    });
  }

  function render() {
    for (const b of tabs.querySelectorAll("[data-sec]")) b.setAttribute("aria-pressed", String(b.dataset.sec === st.section));
    for (const b of fmtSeg.querySelectorAll("[data-fmt]")) b.setAttribute("aria-pressed", String(b.dataset.fmt === st.format));
    window.YTP_trackCtx && window.YTP_trackCtx(st.section, st.format);
    const all = ((D.boards[st.section] || {})[st.format] || []);
    let list = all.filter((v) => v.age <= st.days);
    const key = { mult: (v) => -v.mult, views: (v) => -v.views, new: (v) => v.age }[st.sort];
    list = [...list].sort((a, b) => key(a) - key(b) || b.views - a.views);
    $("#sub").innerHTML = subline(list, all);
    $("#empty").hidden = list.length > 0;
    layout(list);
  }

  $("#board").addEventListener("click", (e) => {
    const w = e.target.closest("[data-why]");
    if (w) {
      const ul = w.nextElementSibling, open = ul.hidden;
      ul.hidden = !open; w.setAttribute("aria-expanded", String(open)); w.textContent = open ? "근거 접기" : "근거 보기";
      if (open) T("why_open", w.dataset.why);
      return;
    }
    const a = e.target.closest("[data-open]");
    if (a) T("open_video", a.dataset.open);
  });
  let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(render, 150); });
  T("visit", D.name);
  render();
})();
