// 사용 기록: 무엇을 누르고 얼마나 봤는지 구글 스프레드시트(Apps Script)로 보낸다.
(function () {
  const URL = (window.YTP_CONFIG || {}).trackUrl || "";
  const creator = document.body.dataset.slug || "unknown";
  const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
  let visitor = get("ytp.visitor");
  if (!visitor) { visitor = "v" + Math.random().toString(36).slice(2, 10); set("ytp.visitor", visitor); }
  const session = "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const ctx = { section: "", format: "" };
  let queue = [];

  function send(useKeepalive) {
    if (!URL || !queue.length) { queue = []; return; }
    const body = JSON.stringify({ events: queue.splice(0, 50) });
    try {
      fetch(URL, { method: "POST", mode: "no-cors", keepalive: !!useKeepalive, headers: { "Content-Type": "text/plain;charset=utf-8" }, body });
    } catch {}
  }

  window.YTP_track = function (event, label, value) {
    queue.push({ ts: Date.now(), creator, visitor, session, event, label: label || "", value: value == null ? "" : value, section: ctx.section, format: ctx.format });
    if (queue.length >= 10) send();
  };
  window.YTP_trackCtx = function (section, format) { ctx.section = section; ctx.format = format; };

  // 화면을 실제로 보고 있을 때만 15초마다 '봄' 기록
  setInterval(() => { if (document.visibilityState === "visible" && document.hasFocus()) window.YTP_track("heartbeat", "", 15); }, 15000);
  setInterval(() => send(), 15000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") send(true); });
  window.addEventListener("pagehide", () => send(true));
})();
