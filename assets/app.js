// 유튜브 핀터레스트 v3 — 세 섹션을 위아래로 두고, 섹션마다 영상을 옆으로 넘겨 보는 화면 (예라 누나 피그마 기준)
(async function () {
  const slug = document.body.dataset.slug;
  const T = window.YTP_track || (() => {});
  const SECTIONS = [
    { key: "trend", label: "요즘 뜨는 영상", icon: "trend" },
    { key: "audience", label: "내 시청자들이 본 영상", icon: "audience" },
    { key: "global", label: "해외에서 뜨는 영상", icon: "global" },
  ];
  const FMT = { shorts: "쇼츠", long: "롱폼" };
  const store = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
                  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };

  const res = await fetch(`../data/${slug}.json?v=${Date.now()}`, { cache: "no-cache" });
  const D = await res.json();
  const savedFmt = store.get(`ytp.${slug}.fmt`, D.formats[0]);
  const st = {
    format: D.formats.includes(savedFmt) ? savedFmt : D.formats[0],
    sort: store.get(`ytp.${slug}.sort`, "mult"),
    days: store.get(`ytp.${slug}.days`, 60),
  };
  const save = () => { store.set(`ytp.${slug}.fmt`, st.format); store.set(`ytp.${slug}.sort`, st.sort); store.set(`ytp.${slug}.days`, st.days); };

  document.title = `${D.name} · 유튜브 핀터레스트`;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = (n) => n >= 1e8 ? (n / 1e8).toFixed(1).replace(/\.0$/, "") + "억" : n >= 1e4 ? (n / 1e4).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, "") + "만" : n.toLocaleString("ko-KR");
  const ago = (d) => d <= 0 ? "오늘" : d < 7 ? `${d}일 전` : d < 30 ? `${Math.floor(d / 7)}주 전` : `${Math.floor(d / 30)}달 전`;
  const mult = (m) => m >= 100 ? Math.round(m) : m >= 10 ? m.toFixed(0) : m.toFixed(1);

  // 헤더: 쇼츠/롱폼, 정렬, 기간
  const fmtSeg = $("#fmt");
  if (D.formats.length > 1) {
    fmtSeg.innerHTML = D.formats.map((f) => `<button type="button" data-fmt="${f}">${FMT[f]}</button>`).join("");
    fmtSeg.addEventListener("click", (e) => { const b = e.target.closest("[data-fmt]"); if (!b || b.dataset.fmt === st.format) return; st.format = b.dataset.fmt; save(); T("format", st.format); render(); });
  } else fmtSeg.hidden = true;
  $("#sort").value = st.sort;
  $("#sort").addEventListener("change", (e) => { st.sort = e.target.value; save(); T("sort", st.sort); render(); });
  $("#days").value = String(st.days);
  $("#days").addEventListener("change", (e) => { st.days = +e.target.value; save(); T("period", String(st.days)); render(); });

  function card(v, i) {
    const label = v.multKind === "channel" ? "평소의" : "구독자 대비";
    const m = mult(v.mult);
    const mm = Math.floor(v.sec / 60), ss = String(v.sec % 60).padStart(2, "0");
    const url = v.format === "shorts" ? `https://www.youtube.com/shorts/${v.id}` : `https://www.youtube.com/watch?v=${v.id}`;
    const thumb = v.format === "shorts" ? "sddefault" : "hqdefault";
    const why = v.why ? `<p><span class="hl">${label} ×${m}배</span> 조회수 · ${esc(v.why.summary)}</p>` : `<p><span class="hl">${label} ×${m}배</span> 조회수가 나왔습니다.</p>`;
    return `<article class="card ${v.format}">
      <div class="media" data-id="${v.id}">
        <img class="th" loading="lazy" alt="" src="https://i.ytimg.com/vi/${v.id}/${thumb}.jpg" onerror="this.onerror=null;this.src='https://i.ytimg.com/vi/${v.id}/hqdefault.jpg'">
        <a class="hit" href="${url}" target="_blank" rel="noopener" data-open="${v.id}" aria-label="${esc(v.title)} 유튜브에서 보기"></a>
        <span class="badge">${label} <b>×${m}</b></span>
        <span class="rank">${i + 1}</span>
        <span class="dur">${mm}:${ss}</span>
        <div class="why">${why}<a class="apply" href="${url}" target="_blank" rel="noopener" data-open="${v.id}">이 영상 보러가기</a></div>
      </div>
      <div class="ctitle">${esc(v.title)}</div>
      <div class="cmeta"><span>${esc(v.channel)}</span><span>조회 ${num(v.views)}</span><span>${ago(v.age)}</span>${v.overlap ? `<span>내 시청자 ${v.overlap}명 구독</span>` : ""}</div>
    </article>`;
  }

  function list(sec) {
    const all = ((D.boards[sec] || {})[st.format] || []);
    const key = { mult: (v) => -v.mult, views: (v) => -v.views, new: (v) => v.age }[st.sort];
    return all.filter((v) => v.age <= st.days).sort((a, b) => key(a) - key(b) || b.views - a.views);
  }

  const rows = $("#rows");
  function render() {
    for (const b of fmtSeg.querySelectorAll("[data-fmt]")) b.setAttribute("aria-pressed", String(b.dataset.fmt === st.format));
    window.YTP_trackCtx && window.YTP_trackCtx("", st.format);
    rows.innerHTML = SECTIONS.map((s) => {
      const vs = list(s.key);
      return `<section class="sec" data-sec="${s.key}">
        <div class="shead">
          <span class="ic"><img src="../assets/icons/${s.icon}.svg" width="22" height="22" alt=""></span>
          <h2>${s.label}</h2>
          <div class="nav"><button type="button" data-dir="-1" aria-label="${s.label} 이전 영상"><img src="../assets/icons/prev.svg" width="20" height="20" alt=""></button><button type="button" data-dir="1" aria-label="${s.label} 다음 영상"><img src="../assets/icons/next.svg" width="20" height="20" alt=""></button></div>
        </div>
        <div class="row" tabindex="-1">${vs.length ? vs.map(card).join("") : `<div class="empty">이 기간에는 보여 줄 ${FMT[st.format]}가 없어요. 기간을 늘려 보세요.</div>`}</div>
      </section>`;
    }).join("");
    for (const r of rows.querySelectorAll(".row")) { r.addEventListener("scroll", () => arrows(r), { passive: true }); arrows(r); }
  }

  // ‹ › 버튼: 끝에 닿으면 흐리게
  function arrows(row) {
    const nav = row.parentElement.querySelectorAll("[data-dir]");
    const max = row.scrollWidth - row.clientWidth - 2;
    nav[0].disabled = row.scrollLeft <= 2;
    nav[1].disabled = row.scrollLeft >= max;
  }

  const touch = matchMedia("(hover: none)").matches;
  rows.addEventListener("click", (e) => {
    const nav = e.target.closest("[data-dir]");
    if (nav) {
      const sec = nav.closest(".sec"), row = sec.querySelector(".row"), dir = +nav.dataset.dir;
      const step = Math.max(row.clientWidth - 120, 200);
      row.scrollBy({ left: dir * step, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      T("scroll_arrow", sec.dataset.sec, dir > 0 ? "next" : "prev");
      return;
    }
    const a = e.target.closest("[data-open]");
    if (a) {
      const media = a.closest(".media");
      // 폰: 첫 번째 누름은 잘 된 이유 보여주기, 두 번째 누름에 유튜브로
      if (touch && !media.classList.contains("on")) {
        e.preventDefault();
        for (const m of rows.querySelectorAll(".media.on")) m.classList.remove("on");
        media.classList.add("on");
        T("why_hover", media.dataset.id, a.closest(".sec").dataset.sec);
        return;
      }
      T("open_video", a.dataset.open, a.closest(".sec").dataset.sec);
    }
  });

  // 마우스를 0.8초 이상 올려 둔 영상은 '이유 봄'으로 한 번 기록
  const seen = new Set();
  let ht;
  rows.addEventListener("mouseover", (e) => {
    const m = e.target.closest(".media");
    if (!m || touch || seen.has(m.dataset.id)) return;
    clearTimeout(ht);
    ht = setTimeout(() => { if (m.matches(":hover")) { seen.add(m.dataset.id); T("why_hover", m.dataset.id, m.closest(".sec").dataset.sec); } }, 800);
  });

  let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => rows.querySelectorAll(".row").forEach(arrows), 150); });
  T("visit", D.name);
  render();
})();
