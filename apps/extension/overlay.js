(() => {
  if (window.__scribbleOverlayLoaded) return;
  window.__scribbleOverlayLoaded = true;

  let root;
  let sessionId;
  const api = (path, method = "GET", body) => new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "scribble-api", path, method, body }, (result) => result?.ok ? resolve(result.data) : reject(new Error(result?.error ?? "Extension connection failed.")));
  });
  const pageContext = () => document.body.innerText.replace(/\s+/g, " ").trim().slice(0, 12000);

  function mount() {
    root = document.createElement("div"); root.id = "scribble-overlay-root";
    const shadow = root.attachShadow({ mode: "closed" });
    shadow.innerHTML = `<style>
      :host { all: initial; } #card, #card * { box-sizing:border-box; } #card { position:fixed; z-index:2147483647; top:90px; right:24px; width:372px; color:#24231e; background:#fffdf8; border:2px solid #24231e; border-radius:16px; box-shadow:8px 9px 0 rgba(36,35,30,.3); font-family:Arial,sans-serif; overflow:hidden; }
      #bar { display:flex; align-items:center; gap:9px; padding:11px 13px; background:#f8ce52; border-bottom:2px solid #24231e; cursor:grab; user-select:none; font-size:16px; font-weight:800; } #mark { display:grid; place-items:center; width:25px; height:25px; color:#24231e; border:1.5px solid #24231e; border-radius:50%; background:#fffdf8; font-family:Georgia,serif; } #drag { color:#605d54; font-size:10px; font-weight:500; } #close { margin-left:auto; padding:0 4px; color:#24231e; border:0; background:transparent; font-size:22px; line-height:1; cursor:pointer; }
      #body { padding:13px; } #context { display:flex; gap:7px; align-items:center; margin:0 0 10px; padding:8px 9px; color:#4e4c45; border:1px solid #ded9cd; border-radius:8px; background:#f5f1e8; font-size:11px; line-height:1.3; } #context::before { content:"●"; color:#3d8a62; } #status { min-height:0; margin:0; color:#5f5c54; font-size:12px; line-height:1.4; } #notes { max-height:240px; overflow:auto; } .note { margin:11px 0 0; padding:12px; border:1px solid #ded9cd; border-left:4px solid #f8ce52; border-radius:7px; background:#fff; font-size:13px; line-height:1.5; } .note::before { content:"SCRIBBLE"; display:block; margin-bottom:5px; color:#4073d9; font-size:9px; font-weight:700; letter-spacing:.08em; } form { display:flex; gap:7px; margin-top:12px; } input { min-width:0; flex:1; padding:10px 11px; color:#24231e; border:1px solid #777168; border-radius:8px; outline:none; background:#fff; font:13px Arial,sans-serif; } input::placeholder { color:#777168; } input:focus { border-color:#4073d9; box-shadow:0 0 0 2px #dbe7ff; } button.send { width:39px; color:#fff; border:1px solid #24231e; border-radius:8px; background:#4073d9; font-size:18px; cursor:pointer; } .actions { display:flex; gap:7px; margin-top:9px; } .actions button { padding:7px 9px; color:#24231e; border:1px solid #aaa59a; border-radius:6px; background:#fff; font:600 11px Arial,sans-serif; cursor:pointer; } #attach { background:#f8ce52; border-color:#24231e; } #voice[disabled] { color:#8b877d; background:#f2efe8; cursor:not-allowed; }
    </style><section id="card"><header id="bar"><span id="mark">S</span><span>Scribble</span><span id="drag">drag to move</span><button id="close" aria-label="Close">×</button></header><div id="body"><p id="context">No page attached yet</p><div id="status">Attach this page, then ask for a hint or an explanation.</div><div id="notes"></div><form><input aria-label="Ask Scribble" placeholder="Ask about this page…" /><button class="send" aria-label="Send">↑</button></form><div class="actions"><button id="attach">Attach this page</button><button id="voice" disabled>Voice setup needed</button></div></div></section>`;
    document.documentElement.append(root);
    const el = (selector) => shadow.querySelector(selector);
    const status = (text) => { el("#status").textContent = text; };
    const addNote = (text) => { const note = document.createElement("div"); note.className = "note"; note.textContent = text; el("#notes").prepend(note); };
    el("#close").onclick = () => root.remove();
    el("#attach").onclick = async () => {
      try { status("Attaching this page…"); const session = await api("/api/v1/sessions", "POST"); sessionId = session.session_id; const context = pageContext(); await api(`/api/v1/sessions/${sessionId}/context`, "POST", { problem_text: context || document.title, source_url: location.href, source_title: document.title }); el("#context").textContent = `Attached: ${document.title}`; el("#attach").textContent = "Page attached"; el("#attach").disabled = true; status("Ready. Ask for a hint, explanation, check, or graph."); }
      catch (error) { status(error.message); }
    };
    el("form").onsubmit = async (event) => { event.preventDefault(); const input = el("input"); const question = input.value.trim(); if (!question) return; if (!sessionId) { status("Choose ‘Use this page’ first."); return; } input.value = ""; status("Scribble is thinking…"); try { const result = await api(`/api/v1/sessions/${sessionId}/tutor-turn`, "POST", { scribble_session_id: sessionId, question }); addNote(result.spoken_response); status("Added a note for this page."); } catch (error) { status(error.message); } };
    let drag; el("#bar").addEventListener("pointerdown", (event) => { drag = { x:event.clientX, y:event.clientY, right:parseInt(getComputedStyle(el("#card")).right, 10), top:parseInt(getComputedStyle(el("#card")).top, 10) }; el("#bar").setPointerCapture(event.pointerId); }); el("#bar").addEventListener("pointermove", (event) => { if (!drag) return; const card = el("#card"); card.style.right = `${Math.max(8, drag.right - (event.clientX - drag.x))}px`; card.style.top = `${Math.max(8, drag.top + (event.clientY - drag.y))}px`; }); el("#bar").addEventListener("pointerup", () => { drag = undefined; });
  }
  chrome.runtime.onMessage.addListener((message) => { if (message.type === "scribble-toggle") { if (!root?.isConnected) mount(); else root.remove(); } });
})();
