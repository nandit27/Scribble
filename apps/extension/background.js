const API = "http://localhost:8000";

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url || !/^https?:\/\//.test(tab.url)) {
    // Chrome blocks injection into chrome://, extension, and browser settings pages.
    return;
  }
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["overlay.js"] });
    await chrome.tabs.sendMessage(tab.id, { type: "scribble-toggle" });
  } catch {
    // A page may navigate between the click and injection; silently ignore it.
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "scribble-api") return;
  fetch(`${API}${message.path}`, {
    method: message.method ?? "GET",
    headers: { "Content-Type": "application/json" },
    body: message.body ? JSON.stringify(message.body) : undefined,
  }).then(async (response) => {
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail?.message ?? data.message ?? "Scribble could not reach its tutor service.");
    sendResponse({ ok: true, data });
  }).catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});
