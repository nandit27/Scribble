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
      :host { all: initial; } #card { position:fixed; z-index:2147483647; top:90px; right:24px; width:360px; color:#202019; background:#fffdf7; border:2px solid #202019; border-radius:12px; box-shadow:7px 8px 0 #aaa394; font-family:Arial,sans-serif; overflow:hidden; }
      #bar { display:flex; align-items:center; gap:9px; padding:12px 14px; background:#f8ce52; border-bottom:2px solid #202019; cursor:grab; font-weight:800; } #mark { display:grid; place-items:center; width:24px; height:24px; border:1px solid #202019; border-radius:50%; background:white; font-family:Georgia,serif; } #close { margin-left:auto; padding:0; border:0; background:transparent; font-size:21px; cursor:pointer; }
      #body { padding:15px; } #context { margin:0 0 13px; color:#605d54; font-size:12px; line-height:1.45; } #status { padding:8px 10px; margin-bottom:10px; border-radius:6px; background:#edf4ff; color:#355b9e; font-size:12px; } #notes { max-height:250px; overflow:auto; } .note { margin:10px 0; padding:11px; border-left:3px solid #f8ce52; background:#f4f0e7; font-size:13px; line-height:1.45; } form { display:flex; gap:6px; margin-top:12px; } input { min-width:0; flex:1; padding:10px; border:1px solid #777168; border-radius:6px; } button.send { width:38px; border:1px solid #202019; border-radius:6px; background:#4073d9; color:white; cursor:pointer; } .actions { display:flex; gap:8px; margin-top:9px; } .actions button { padding:7px 9px; border:1px solid #777168; border-radius:5px; background:white; font-size:11px; cursor:pointer; }
    </style><section id="card"><header id="bar"><span id="mark">S</span><span>Scribble</span><span style="font-size:11px;font-weight:normal">drag me</span><button id="close" aria-label="Close">×</button></header><div id="body"><p id="context">Open Scribble to attach the page you’re studying.</p><div id="status">Ready when you are.</div><div id="notes"></div><form><input aria-label="Ask Scribble" placeholder="Ask about this page…" /><button class="send" aria-label="Send">↑</button></form><div class="actions"><button id="attach">Use this page</button><button id="voice">Start voice</button></div></div></section>`;
    document.documentElement.append(root);
    const el = (selector) => shadow.querySelector(selector);
    const status = (text) => { el("#status").textContent = text; };
    const addNote = (text) => { const note = document.createElement("div"); note.className = "note"; note.textContent = text; el("#notes").prepend(note); };
    el("#close").onclick = () => root.remove();
    el("#attach").onclick = async () => {
      try { status("Attaching this page…"); const session = await api("/api/v1/sessions", "POST"); sessionId = session.session_id; const context = pageContext(); await api(`/api/v1/sessions/${sessionId}/context`, "POST", { problem_text: context || document.title, source_url: location.href, source_title: document.title }); el("#context").textContent = `Attached: ${document.title}. Scribble will use this page for follow-up questions.`; status("Page context attached. Ask a question."); }
      catch (error) { status(error.message); }
    };
    el("form").onsubmit = async (event) => { event.preventDefault(); const input = el("input"); const question = input.value.trim(); if (!question) return; if (!sessionId) { status("Choose ‘Use this page’ first."); return; } input.value = ""; status("Scribble is thinking…"); try { const result = await api(`/api/v1/sessions/${sessionId}/tutor-turn`, "POST", { scribble_session_id: sessionId, question }); addNote(result.spoken_response); status("Added a note for this page."); } catch (error) { status(error.message); } };
    el("#voice").onclick = () => status("Voice uses the Scribble web app while the extension keeps this page attached. Configure Bolna to enable it.");
    let drag; el("#bar").addEventListener("pointerdown", (event) => { drag = { x:event.clientX, y:event.clientY, right:parseInt(getComputedStyle(el("#card")).right, 10), top:parseInt(getComputedStyle(el("#card")).top, 10) }; el("#bar").setPointerCapture(event.pointerId); }); el("#bar").addEventListener("pointermove", (event) => { if (!drag) return; const card = el("#card"); card.style.right = `${Math.max(8, drag.right - (event.clientX - drag.x))}px`; card.style.top = `${Math.max(8, drag.top + (event.clientY - drag.y))}px`; }); el("#bar").addEventListener("pointerup", () => { drag = undefined; });
  }
  chrome.runtime.onMessage.addListener((message) => { if (message.type === "scribble-toggle") { if (!root?.isConnected) mount(); else root.remove(); } });
})();
