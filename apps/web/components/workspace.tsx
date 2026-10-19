"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createVoiceCall } from "../lib/bolna-client";

type Step = { text: string; latex?: string };
type Graph = { expression: string; points: { x: number; y: number }[] };
type Turn = { turn_id: string; question_text: string; spoken_response: string; artifact: { type: string; title: string; steps: Step[]; graph?: Graph | null }; verification: { status: string } };
type Worksheet = { id: string; problem_text: string; expressions: string[]; confidence: number; ambiguities: { text: string; reason: string }[]; confirmed_problem_text?: string; parse_status: string };

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const SAMPLE = "Determine and sketch the function f(x) = sin(x) + x/3. Describe what happens around x = 0.";

function GraphView({ graph }: { graph: Graph }) {
  const { path, xAxis, yAxis } = useMemo(() => {
    const points = graph.points;
    const xs = points.map((p) => p.x); const ys = points.map((p) => p.y);
    let minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    if (minX === maxX) { minX -= 1; maxX += 1; }
    if (minY === maxY) { minY -= 1; maxY += 1; }
    const sx = (x: number) => ((x - minX) / (maxX - minX)) * 100;
    const sy = (y: number) => 100 - ((y - minY) / (maxY - minY)) * 100;
    return { path: points.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(2)},${sy(p.y).toFixed(2)}`).join(" "), xAxis: sy(0), yAxis: sx(0) };
  }, [graph]);
  return <div className="graph"><div className="graph-label">y = {graph.expression}</div><svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`Graph of ${graph.expression}`}><path className="axis" d={`M0 ${xAxis} H100 M${yAxis} 0 V100`} /><path className="curve" d={path} /></svg></div>;
}

export function Workspace() {
  const [sessionId, setSessionId] = useState<string>();
  const [worksheet, setWorksheet] = useState<Worksheet>();
  const [problem, setProblem] = useState(SAMPLE);
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [state, setState] = useState<"welcome" | "confirm" | "ready" | "working">("welcome");
  const [voice, setVoice] = useState<"idle" | "connecting" | "active" | "muted" | "error">("idle");
  const [notice, setNotice] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [previewName, setPreviewName] = useState("");
  const voiceCall = useRef<ReturnType<typeof createVoiceCall> | undefined>(undefined);

  useEffect(() => { void createSession(); }, []);
  useEffect(() => () => { void voiceCall.current?.stop(); }, []);
  useEffect(() => {
    if (!sessionId || state !== "ready") return;
    const poll = window.setInterval(() => void loadTurns(), 2500);
    return () => window.clearInterval(poll);
  }, [sessionId, state]);

  async function api(path: string, options?: RequestInit) {
    const response = await fetch(`${API}${path}`, options);
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail?.message ?? data.message ?? "Something went wrong.");
    return data;
  }
  async function createSession() {
    try { const data = await api("/api/v1/sessions", { method: "POST" }); setSessionId(data.session_id); }
    catch { setNotice("Scribble could not start a workspace. Is the API running on port 8000?"); }
  }
  async function loadTurns() { if (!sessionId) return; const data = await api(`/api/v1/sessions/${sessionId}/turns`); setTurns(data.turns); }
  async function useSample() {
    if (!sessionId) return;
    setWorksheet({ id: "sample", problem_text: SAMPLE, expressions: ["sin(x) + x/3"], confidence: 1, ambiguities: [], parse_status: "needs_confirmation" });
    setProblem(SAMPLE); setState("confirm"); setNotice("Sample worksheet loaded. Review the problem, then confirm it.");
  }
  async function onUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file || !sessionId) return;
    if (!/^(image\/png|image\/jpeg|application\/pdf)$/.test(file.type) || file.size > 10 * 1024 * 1024) { setNotice("Choose a PNG, JPG, or PDF under 10 MB."); return; }
    setNotice("Reading your worksheet…");
    setPreviewName(file.name);
    setPreviewUrl(file.type === "application/pdf" ? undefined : URL.createObjectURL(file));
    try { const form = new FormData(); form.append("file", file); const data = await api(`/api/v1/sessions/${sessionId}/worksheets`, { method: "POST", body: form }); const parsed = await api(`/api/v1/worksheets/${data.worksheet_id}`); setWorksheet(parsed); setProblem(parsed.problem_text); setState("confirm"); setNotice("Review the extraction before starting your tutor session."); }
    catch (e) { setNotice(e instanceof Error ? e.message : "That file did not upload."); }
  }
  async function clearWorkspace() {
    const oldSession = sessionId;
    void voiceCall.current?.stop(); voiceCall.current = undefined;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setVoice("idle"); setWorksheet(undefined); setTurns([]); setProblem(SAMPLE); setPreviewUrl(undefined); setPreviewName(""); setState("welcome");
    if (oldSession) { try { await api(`/api/v1/sessions/${oldSession}`, { method: "DELETE" }); } catch { /* A stopped API should not prevent a fresh workspace. */ } }
    await createSession();
    setNotice("This workspace was cleared. Upload a new worksheet or use the sample.");
  }
  async function confirm() {
    if (!sessionId || !worksheet || problem.trim().length < 3) return;
    try {
      if (worksheet.id !== "sample") await api(`/api/v1/worksheets/${worksheet.id}/confirm`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ problem_text: problem, expressions: worksheet.expressions }) });
      else { // The sample uses the same server workflow through a tiny invisible upload substitute.
        const blob = new Blob(["sample"], { type: "image/png" }); const form = new FormData(); form.append("file", blob, "sample-worksheet.png"); const created = await api(`/api/v1/sessions/${sessionId}/worksheets`, { method: "POST", body: form }); await api(`/api/v1/worksheets/${created.worksheet_id}/confirm`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ problem_text: problem, expressions: worksheet.expressions }) }); setWorksheet({ ...worksheet, id: created.worksheet_id });
      }
      setState("ready"); setNotice("Worksheet confirmed. Ask Scribble out loud or type a question.");
    } catch (e) { setNotice(e instanceof Error ? e.message : "Could not confirm the worksheet."); }
  }
  async function ask(event: FormEvent) {
    event.preventDefault(); if (!sessionId || !question.trim() || state !== "ready") return;
    setState("working"); setNotice("Scribble is checking the worksheet…");
    const asked = question; setQuestion("");
    try { await api(`/api/v1/sessions/${sessionId}/tutor-turn`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scribble_session_id: sessionId, question: asked }) }); await loadTurns(); setNotice("A new note was added to your notebook."); }
    catch (e) { setNotice(e instanceof Error ? e.message : "Scribble could not answer that yet."); }
    finally { setState("ready"); }
  }
  async function startVoice() {
    if (!sessionId || state !== "ready") return;
    setVoice("connecting");
    try { const call = createVoiceCall(sessionId, (next, message) => { setVoice(next); if (message) setNotice(message); }); voiceCall.current = call; await call.start(); setVoice("active"); setNotice("Scribble is listening. Ask about the worksheet whenever you’re ready."); }
    catch (e) { setVoice("error"); setNotice(e instanceof Error ? e.message : "Voice could not start. Type a question instead."); }
  }
  const toggleMute = () => { if (!voiceCall.current) return; const muted = voice !== "muted"; voiceCall.current.setMuted(muted); setVoice(muted ? "muted" : "active"); };
  const endVoice = () => { void voiceCall.current?.stop(); voiceCall.current = undefined; setVoice("idle"); setNotice("Voice session ended. Your worksheet and notes are still here."); };
  const voiceLabel = voice === "active" ? "● Listening" : voice === "muted" ? "Muted" : voice === "connecting" ? "Connecting" : "Voice ready";

  return <main>
    <header><div className="brand"><span className="brand-mark">S</span><span>Scribble</span></div><div className="status"><span className={`dot ${voice === "active" ? "live" : ""}`} /> {voiceLabel}</div></header>
    <section className="hero"><p className="eyebrow">YOUR VOICE-POWERED MATH TUTOR</p><h1>Keep the question on the page.</h1><p>Upload once, ask naturally, and let the explanation appear beside your work.</p></section>
    {notice && <div className="notice" role="status">{notice}</div>}
    <div className="workspace">
      <section className="paper worksheet"><div className="panel-top"><span>WORKSHEET</span><span className="small-status">{state === "ready" ? "Confirmed" : "Waiting for review"}</span></div>
        {state === "welcome" && <div className="empty"><div className="upload-icon">↑</div><h2>Bring in your work</h2><p>PNG, JPG, or PDF · up to 10 MB</p><label className="button primary">Upload worksheet<input type="file" accept="image/png,image/jpeg,application/pdf" onChange={onUpload} hidden /></label><button className="text-button" onClick={useSample}>Try the sample worksheet</button></div>}
        {state !== "welcome" && worksheet && <><div className="worksheet-preview">{previewUrl ? <img className="uploaded-preview" src={previewUrl} alt={`Preview of ${previewName || "uploaded worksheet"}`} /> : previewName ? <div className="file-preview"><b>{previewName}</b><span>PDF uploaded — review the extracted problem below.</span></div> : <><div className="handwrite">f(x) = sin(x) + x/3</div><div className="scribble-line" /><div className="ghost-work">Find the shape of the curve<br />and explain the next step.</div></>}</div><div className="extraction"><label>Extracted problem</label><textarea value={problem} disabled={state === "ready" || state === "working"} onChange={(e) => setProblem(e.target.value)} />{worksheet.ambiguities.length > 0 && state !== "ready" && <p className="ambiguity">Needs review: {worksheet.ambiguities[0].reason}</p>}{state === "confirm" && <button className="button primary full" onClick={confirm}>Use this problem</button>}</div></>}
      </section>
      <section className="paper notebook"><div className="panel-top"><span>SCRIBBLE&apos;S NOTES</span><span className="small-status">{state === "working" ? "Thinking…" : `${turns.length} notes`}</span></div>
        {!turns.length ? <div className="notes-empty"><span>✦</span><h2>Your explanation will land here.</h2><p>Ask for a hint, a concept explanation, a work check, or a graph.</p></div> : <div className="turns">{turns.map((turn) => <article className="turn" key={turn.turn_id}><div className="turn-heading"><span>{turn.artifact.title}</span><em>{turn.verification.status.replace("_", " ")}</em></div><p>{turn.spoken_response}</p>{turn.artifact.steps.map((step, index) => <div className="step" key={index}><b>{index + 1}</b><span>{step.text}</span></div>)}{turn.artifact.graph && <GraphView graph={turn.artifact.graph} />}</article>)}</div>}
      </section>
    </div>
    <footer className="controls"><div className="voice-buttons"><button className="button voice" onClick={startVoice} disabled={state !== "ready" || voice === "connecting" || voice === "active" || voice === "muted"}>{voice === "active" ? "Voice active" : "Start voice"}</button><button className="button muted" onClick={toggleMute} disabled={voice !== "active" && voice !== "muted"}>{voice === "muted" ? "Unmute" : "Mute"}</button><button className="button muted" onClick={endVoice} disabled={voice === "idle"}>End</button></div><form onSubmit={ask}><input value={question} onChange={(e) => setQuestion(e.target.value)} disabled={state !== "ready"} placeholder="Ask about the problem you’re working on…" /><button className="send" disabled={state !== "ready" || !question.trim()} aria-label="Send question">↑</button></form><div className="prompt-row" aria-label="Demo prompts">{["Explain this step", "Give me a hint", "Plot this function"].map((prompt) => <button type="button" className="prompt" key={prompt} disabled={state !== "ready"} onClick={() => setQuestion(prompt)}>{prompt}</button>)}</div><button className="clear" onClick={() => void clearWorkspace()} aria-label="Clear worksheet and notes">Clear</button></footer>
  </main>;
}
