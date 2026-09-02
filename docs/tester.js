/* Anivexa API — inline docs tester.
 * Lets you fire real requests at a running instance of the API and see the
 * JSON response (and, for /watch + /stream endpoints, play the returned
 * stream) without leaving the docs page.
 *
 * Config order below MUST match the document order of the .try-btn anchors
 * in docs/index.html (tester-1 .. tester-20), since that's how the panels
 * were generated.
 */
(function () {
  "use strict";

  const AUDIO = { name: "audio", label: "Audio", type: "select", options: ["sub", "dub"], default: "sub" };

  function field(name, label, def, opts) {
    return Object.assign({ name, label, type: "text", default: def }, opts || {});
  }

  const TESTS = [
    // 1. API info
    { path: "/", fields: [], kind: "json" },
    // 2. Map IDs
    { path: "/map/{anilistId}", fields: [field("anilistId", "AniList ID", "16498")], kind: "json" },
    // 3. Episodes (all providers)
    { path: "/episodes/{anilistId}", fields: [field("anilistId", "AniList ID", "16498")], kind: "json" },
    // 4. Episodes (filtered)
    {
      path: "/episodes/{provider}/{anilistId}",
      fields: [
        field("provider", "Provider", "reanime"),
        field("anilistId", "AniList ID", "16498"),
      ],
      kind: "json",
    },
    // 5. watch/mkissa
    watchTest("mkissa", "16498", "1"),
    // 6. watch/reanime
    watchTest("reanime", "16498", "1"),
    // 7. stream/reanime (redirect)
    streamTest("reanime", "16498", "1"),
    // 8. watch/anikoto
    watchTest("anikoto", "16498", "1"),
    // 9. watch/animegg
    watchTest("animegg", "16498", "1"),
    // 10. watch/anineko
    watchTest("anineko", "16498", "1"),
    // 11. watch/anidbapp
    watchTest("anidbapp", "16498", "1"),
    // 12. watch/2dhive
    watchTest("2dhive", "16498", "1"),
    // 13. stream/2dhive (redirect)
    streamTest("2dhive", "16498", "1"),
    // 14. stream/2dhive/download (redirect)
    { ...streamTest("2dhive", "16498", "1"), path: "/stream/2dhive/download/{id}/{audio}/{ep}" },
    // 15. watch/animenosub
    watchTest("animenosub", "199547", "1"),
    // 16. watch/anizone
    watchTest("anizone", "199547", "1"),
    // 17. watch/anibd
    watchTest("anibd", "16498", "1"),
    // 18. watch/senshi
    watchTest("senshi", "16498", "1"),
    // 19. watch/kaa
    watchTest("kaa", "21", "1"),
    // 20. watch/animedunya
    watchTest("animedunya", "16498", "1"),
  ];

  function watchTest(provider, id, ep) {
    return {
      path: `/watch/${provider}/{id}/{audio}/${provider}-{ep}`,
      fields: [field("id", "AniList ID", id), AUDIO, field("ep", "Episode", ep)],
      kind: "watch",
    };
  }

  function streamTest(provider, id, ep) {
    return {
      path: `/stream/${provider}/{id}/{audio}/{ep}`,
      fields: [field("id", "AniList ID", id), AUDIO, field("ep", "Episode", ep)],
      kind: "redirect",
    };
  }

  // ── Base URL (persisted) ──────────────────────────────────────────────
  const BASE_URL_KEY = "anivexaTesterBaseUrl";
  const baseUrlInput = document.getElementById("globalBaseUrl");

  function getBaseUrl() {
    const stored = (baseUrlInput && baseUrlInput.value.trim()) || localStorage.getItem(BASE_URL_KEY) || "";
    return (stored || window.location.origin).replace(/\/$/, "");
  }

  if (baseUrlInput) {
    const saved = localStorage.getItem(BASE_URL_KEY);
    baseUrlInput.value = saved || window.location.origin;
    baseUrlInput.addEventListener("input", () => {
      localStorage.setItem(BASE_URL_KEY, baseUrlInput.value.trim());
      TESTS.forEach((_, i) => updateUrlPreview(i + 1));
    });
  }

  // ── HTML escaping + tiny JSON highlighter (reuses .k/.s/.n/.p/.b from style.css) ──
  function esc(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function highlightJson(value) {
    const json = JSON.stringify(value, null, 2);
    if (json === undefined) return "";
    return esc(json).replace(
      /("(\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(\.\d+)?([eE][+-]?\d+)?)/g,
      (match) => {
        if (/^"/.test(match)) {
          return /:$/.test(match)
            ? `<span class="n">${match.replace(/:$/, "")}</span>:`
            : `<span class="s">${match}</span>`;
        }
        if (/true|false|null/.test(match)) return `<span class="p">${match}</span>`;
        return `<span class="b">${match}</span>`;
      }
    );
  }

  // ── Panel rendering ─────────────────────────────────────────────────
  function buildPanel(i, cfg) {
    const mount = document.getElementById(`tester-${i}`);
    if (!mount) return;

    const fieldsHtml = cfg.fields.map((f) => {
      if (f.type === "select") {
        const opts = f.options.map((o) => `<option value="${esc(o)}" ${o === f.default ? "selected" : ""}>${esc(o)}</option>`).join("");
        return `<div class="tester-field">
          <label for="t${i}-${f.name}">${esc(f.label)}</label>
          <select id="t${i}-${f.name}" data-field="${esc(f.name)}">${opts}</select>
        </div>`;
      }
      return `<div class="tester-field grow">
        <label for="t${i}-${f.name}">${esc(f.label)}</label>
        <input id="t${i}-${f.name}" data-field="${esc(f.name)}" type="text" value="${esc(f.default)}" spellcheck="false" autocomplete="off"/>
      </div>`;
    }).join("");

    mount.innerHTML = `
      <div class="tester-fields">
        ${fieldsHtml}
        <button type="button" class="tester-run-btn" data-run="${i}">⚡ Send</button>
      </div>
      <div class="tester-url-preview"><span class="method-pill get">GET</span><span class="u" data-url-preview="${i}"></span></div>
      <div class="tester-status" data-status="${i}">
        <span class="tester-status-dot" data-status-dot="${i}"></span>
        <span data-status-code="${i}"></span>
        <span class="tester-status-time" data-status-time="${i}"></span>
      </div>
      <div class="tester-result" data-result="${i}"></div>
    `;

    cfg.fields.forEach((f) => {
      const el = mount.querySelector(`[data-field="${f.name}"]`);
      el.addEventListener("input", () => updateUrlPreview(i));
    });
    mount.querySelector(`[data-run="${i}"]`).addEventListener("click", () => runTest(i));

    updateUrlPreview(i);
  }

  function getFieldValues(i, cfg) {
    const mount = document.getElementById(`tester-${i}`);
    const values = {};
    cfg.fields.forEach((f) => {
      const el = mount.querySelector(`[data-field="${f.name}"]`);
      values[f.name] = (el.value || "").trim() || f.default;
    });
    return values;
  }

  function buildUrl(i, cfg) {
    const values = getFieldValues(i, cfg);
    let path = cfg.path.replace(/\{(\w+)\}/g, (_, name) => encodeURIComponent(values[name] ?? ""));
    return { base: getBaseUrl(), path, full: getBaseUrl() + path };
  }

  function updateUrlPreview(i) {
    const cfg = TESTS[i - 1];
    const el = document.querySelector(`[data-url-preview="${i}"]`);
    if (!el) return;
    el.textContent = buildUrl(i, cfg).full;
  }

  // ── Toggle open/close (lazy render on first open) ──────────────────
  const rendered = new Set();
  document.querySelectorAll("[data-tester-toggle]").forEach((btn) => {
    const i = Number(btn.getAttribute("data-tester-toggle"));
    btn.addEventListener("click", () => {
      const panel = document.getElementById(`tester-${i}`);
      if (!panel) return;
      const willOpen = panel.hasAttribute("hidden");
      if (willOpen && !rendered.has(i)) {
        buildPanel(i, TESTS[i - 1]);
        rendered.add(i);
      }
      if (willOpen) {
        panel.removeAttribute("hidden");
        btn.classList.add("is-open");
        btn.textContent = "▾ Test";
      } else {
        panel.setAttribute("hidden", "");
        btn.classList.remove("is-open");
        btn.textContent = "▶ Test";
      }
    });
  });

  // ── Run a request ───────────────────────────────────────────────────
  async function runTest(i) {
    const cfg = TESTS[i - 1];
    const { full } = buildUrl(i, cfg);
    const runBtn = document.querySelector(`[data-run="${i}"]`);
    const statusEl = document.querySelector(`[data-status="${i}"]`);
    const dotEl = document.querySelector(`[data-status-dot="${i}"]`);
    const codeEl = document.querySelector(`[data-status-code="${i}"]`);
    const timeEl = document.querySelector(`[data-status-time="${i}"]`);
    const resultEl = document.querySelector(`[data-result="${i}"]`);

    runBtn.disabled = true;
    runBtn.textContent = "⏳ Sending…";
    statusEl.classList.add("visible");
    dotEl.className = "tester-status-dot pending";
    codeEl.textContent = "Requesting…";
    timeEl.textContent = "";
    resultEl.classList.remove("visible");
    resultEl.innerHTML = "";

    const t0 = performance.now();
    try {
      const res = await fetch(full, { redirect: "follow" });
      const ms = Math.round(performance.now() - t0);
      dotEl.className = `tester-status-dot ${res.ok ? "ok" : "err"}`;
      codeEl.innerHTML = `<span class="tester-status-code ${res.ok ? "ok" : "err"}">${res.status}</span>`;
      timeEl.textContent = `${ms}ms`;

      if (cfg.kind === "redirect") {
        renderRedirectResult(resultEl, res, cfg);
      } else {
        let data;
        try {
          data = await res.json();
        } catch {
          const text = await res.text().catch(() => "");
          data = { error: "Response was not valid JSON", raw: text.slice(0, 2000) };
        }
        renderJsonResult(resultEl, data, cfg);
      }
      resultEl.classList.add("visible");
    } catch (e) {
      const ms = Math.round(performance.now() - t0);
      dotEl.className = "tester-status-dot err";
      codeEl.innerHTML = `<span class="tester-status-code err">Network error</span>`;
      timeEl.textContent = `${ms}ms`;
      resultEl.innerHTML = `<div class="tester-note">⚠️ <span>${esc(String(e.message || e))} — check the base URL, and that the server is running and reachable (CORS, mixed http/https, or the instance being asleep are common causes).</span></div>`;
      resultEl.classList.add("visible");
    } finally {
      runBtn.disabled = false;
      runBtn.textContent = "⚡ Send";
    }
  }

  function jsonBlock(data) {
    const id = `json-${Math.random().toString(36).slice(2)}`;
    return `<div class="tester-json-wrap">
      <button type="button" class="tester-copy-btn" data-copy-target="${id}">Copy</button>
      <pre id="${id}"><code>${highlightJson(data)}</code></pre>
    </div>`;
  }

  function wireCopyButtons(container, data) {
    container.querySelectorAll("[data-copy-target]").forEach((btn) => {
      btn.addEventListener("click", () => {
        navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
          btn.textContent = "Copied!";
          btn.classList.add("copied");
          setTimeout(() => { btn.textContent = "Copy"; btn.classList.remove("copied"); }, 1500);
        });
      });
    });
  }

  function renderJsonResult(container, data, cfg) {
    let html = jsonBlock(data);

    if (cfg.kind === "watch" && data && Array.isArray(data.streams) && data.streams.length) {
      html += renderStreamsBlock(data.streams);
    }

    container.innerHTML = html;
    wireCopyButtons(container, data);
    if (cfg.kind === "watch" && data && Array.isArray(data.streams) && data.streams.length) {
      wireStreamChips(container, data.streams);
    }
  }

  function renderStreamsBlock(streams) {
    const chips = streams.map((s, idx) => {
      const type = (s.type || "hls").toLowerCase();
      const active = s.isActive === false ? '<span class="inactive-tag">inactive</span>' : "";
      return `<button type="button" class="tester-chip type-${esc(type)}" data-chip="${idx}">
        <span class="dot"></span>${esc(s.server || type)} · ${esc(type)} ${active}
      </button>`;
    }).join("");

    return `
      <div class="tester-streams-label">Servers (${streams.length}) — click one to load it</div>
      <div class="tester-chips">${chips}</div>
      <div class="tester-player" data-player></div>
    `;
  }

  function wireStreamChips(container, streams) {
    const chipEls = container.querySelectorAll("[data-chip]");
    const player = container.querySelector("[data-player]");
    chipEls.forEach((chip) => {
      chip.addEventListener("click", () => {
        chipEls.forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        const stream = streams[Number(chip.getAttribute("data-chip"))];
        loadStream(player, stream);
      });
    });
  }

  function loadStream(player, stream) {
    player.innerHTML = "";
    player.classList.add("visible");
    const type = (stream.type || "hls").toLowerCase();
    const referer = stream.referer || (stream.headers && stream.headers.Referer);

    if (type === "embed") {
      const iframe = document.createElement("iframe");
      iframe.src = stream.url;
      iframe.allowFullscreen = true;
      player.appendChild(iframe);
    } else {
      const video = document.createElement("video");
      video.controls = true;
      video.playsInline = true;
      player.appendChild(video);

      if (window.Hls && window.Hls.isSupported()) {
        const hls = new window.Hls();
        hls.loadSource(stream.url);
        hls.attachMedia(video);
        hls.on(window.Hls.Events.ERROR, (_evt, data) => {
          if (data && data.fatal) showPlayerMessage(player, streamFailMessage(referer));
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = stream.url;
      } else {
        showPlayerMessage(player, "This browser can't play HLS streams inline. Copy the URL above and open it in VLC or mpv.");
      }
    }

    if (referer) {
      const note = document.createElement("div");
      note.className = "tester-note";
      note.innerHTML = `⚠️ <span>This source expects <code>Referer: ${esc(referer)}</code>. Browsers won't send a spoofed Referer from this page, so playback may fail here even though the URL is correct — test with a player that supports custom headers, or via the app itself.</span>`;
      player.parentElement.appendChild(note);
    }
  }

  function streamFailMessage(referer) {
    return referer
      ? "Playback failed — likely blocked by this source's Referer/hotlink protection. See the note below."
      : "Playback failed for this source. The stream URL above is still correct — try opening it in VLC/mpv or via the client app.";
  }

  function showPlayerMessage(player, msg) {
    const el = document.createElement("div");
    el.className = "tester-player-msg";
    el.textContent = msg;
    player.appendChild(el);
  }

  function renderRedirectResult(container, res, cfg) {
    const finalUrl = res.url || "(same URL, no redirect followed)";
    container.innerHTML = `
      <div class="tester-redirect-url">↳ resolved to<br/>${esc(finalUrl)}</div>
      <div class="tester-streams-label">Preview</div>
      <div class="tester-chips">
        <button type="button" class="tester-chip type-hls active" data-redirect-play>
          <span class="dot"></span>play resolved stream
        </button>
      </div>
      <div class="tester-player" data-player></div>
    `;
    container.querySelector("[data-redirect-play]").addEventListener("click", () => {
      loadStream(container.querySelector("[data-player]"), { url: finalUrl, type: "hls" });
    });
  }
})();
