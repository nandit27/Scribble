"use client";

import { ChangeEvent, FormEvent, PointerEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createVoiceCall, VoiceState } from "../lib/bolna-client";

type Point = { x: number; y: number };
type Stroke = { id: string; points: Point[]; color: string; width: number };
type BoardNote = { id: string; x: number; y: number; text: string; kind: "note" | "equation"; graph?: Graph };
type Graph = { expression: string; points: Point[] };
type Artifact = { type: "steps" | "graph" | "check"; title: string; body: string; steps?: string[]; graph?: Graph; status: string };
type Turn = { id: string; question: string; response: string; artifact: Artifact; createdAt: string };
type SavedState = { strokes: Stroke[]; notes: BoardNote[]; turns: Turn[]; page: number; zoom: number };

const SESSION_KEY = "scribble-demo-session-v2";
const COLORS = ["#202019", "#4073d9", "#d96349", "#5a8c61"];

function makeId() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }

function GraphView({ graph }: { graph: Graph }) {
  const path = useMemo(() => {
    const xs = graph.points.map((p) => p.x), ys = graph.points.map((p) => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const sx = (x: number) => ((x - minX) / (maxX - minX || 1)) * 100;
    const sy = (y: number) => 100 - ((y - minY) / (maxY - minY || 1)) * 100;
    return { d: graph.points.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(2)},${sy(p.y).toFixed(2)}`).join(" "), x: sy(0), y: sx(0) };
  }, [graph]);
  return <div className="graph-card"><code>y = {graph.expression}</code><svg viewBox="0 0 100 100" role="img" aria-label={`Graph of ${graph.expression}`}><path className="axis" d={`M0 ${path.x}H100 M${path.y} 0V100`} /><path className="curve" d={path.d} /></svg></div>;
}

function modeOf(q: string) { return /plot|graph/i.test(q) ? "Plotting" : /check|correct/i.test(q) ? "Checking" : /hint/i.test(q) ? "Hinting" : "Explaining"; }

function makeArtifact(question: string): Artifact {
  const q = question.toLowerCase();
  if (q.includes("plot") || q.includes("graph")) {
    const expression = q.includes("cos") ? "cos(x)" : q.includes("x²") || q.includes("x^2") ? "x²" : "sin(x) + x/3";
    const points = Array.from({ length: 61 }, (_, i) => { const x = -6 + i / 5; const y = expression === "cos(x)" ? Math.cos(x) : expression === "x²" ? x * x / 5 : Math.sin(x) + x / 3; return { x, y }; });
    return { type: "graph", title: "A quick visual check", body: "This bounded plot is generated locally from the supported expression. It is illustrative, not a proof.", graph: { expression, points }, status: "not_applicable" };
  }
  if (q.includes("check") || q.includes("correct")) return { type: "check", title: "Work check", body: "I can compare the typed work with the active context. Your visible strokes are not transcribed, so this result is unverified—select or type the step you want checked.", steps: ["Identify the exact step to check.", "Compare each transformation with the rule being used.", "Test the result with a simple value before continuing."], status: "unverified" };
  const hint = q.includes("hint");
  return { type: "steps", title: hint ? "A next-step hint" : "Why this step works", body: hint ? "Look for the operation that changes the outer function, then name the rule that matches it." : "Here is a compact explanation grounded in the active study surface.", steps: hint ? ["Circle the expression that changes.", "Ask which rule describes that change.", "Apply only that rule before simplifying."] : ["Name the quantity or rule in the selected line.", "Substitute the known values without changing the structure.", "Simplify one operation at a time and check the units or signs."], status: "not_applicable" };
}

function Board({ strokes, notes, tool, color, width, onStroke, onErase, onAddNote, onRemoveNote, onUndo, onRedo, canUndo, canRedo, children }: { children?: ReactNode; strokes: Stroke[]; notes: BoardNote[]; tool: string; color: string; width: number; onStroke: (s: Stroke) => void; onErase: (p: Point) => void; onAddNote: (p: Point) => void; onRemoveNote: (id: string) => void; onUndo: () => void; onRedo: () => void; canUndo: boolean; canRedo: boolean }) {
  const [active, setActive] = useState<Point[] | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const point = (e: PointerEvent) => { const r = svgRef.current?.getBoundingClientRect(); return r ? { x: e.clientX - r.left, y: e.clientY - r.top } : { x: 0, y: 0 }; };
  const down = (e: PointerEvent) => { if (tool === "text") { onAddNote(point(e)); return; } setActive([point(e)]); e.currentTarget.setPointerCapture(e.pointerId); };
  const move = (e: PointerEvent) => { if (active) { const p = point(e); if (tool === "eraser") onErase(p); else setActive([...active, p]); } };
  const up = () => { if (active && active.length > 1 && tool === "pen") onStroke({ id: makeId(), points: active, color, width }); setActive(null); };
  return <div className="board-canvas-wrap"><svg ref={svgRef} className="board-canvas" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-label="Interactive whiteboard">
    {strokes.map((s) => <polyline key={s.id} points={s.points.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={s.color} strokeWidth={s.width} strokeLinecap="round" strokeLinejoin="round" />)}
    {active && <polyline points={active.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />}
    {notes.map((n) => <foreignObject key={n.id} x={n.x} y={n.y} width={n.graph ? 280 : 240} height={n.graph ? 280 : 160} overflow="visible"><div className={`board-note ${n.kind}`}><button className="note-remove" onPointerDown={(e) => e.stopPropagation()} onClick={() => onRemoveNote(n.id)} aria-label="Dismiss note">×</button><span>{n.kind === "equation" ? "∑" : "✦"}</span>{n.text}{n.graph && <GraphView graph={n.graph} />}</div></foreignObject>)}
  </svg>{children}<div className="board-hint">{tool === "text" ? "Click anywhere to add a note" : "Draw directly on the paper · strokes save automatically"}</div><div className="board-history"><button onClick={onUndo} disabled={!canUndo} aria-label="Undo">↶</button><button onClick={onRedo} disabled={!canRedo} aria-label="Redo">↷</button></div></div>;
}

export function Workspace() {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [notes, setNotes] = useState<BoardNote[]>([]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [history, setHistory] = useState<Stroke[][]>([]);
  const [future, setFuture] = useState<Stroke[][]>([]);
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(3);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [voice, setVoice] = useState<VoiceState>("idle");
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [notice, setNotice] = useState("Demo mode is ready. Your work is saved privately in this browser.");
  const [mobileTab, setMobileTab] = useState<"pdf" | "board">("board");
  const [view, setView] = useState<"welcome" | "pdf" | "notes" | "split">("welcome");
  const [askOpen, setAskOpen] = useState(false);
  const [current, setCurrent] = useState<{ question: string; mode: string } | null>(null);
  const voiceCall = useRef<ReturnType<typeof createVoiceCall> | null>(null);

  useEffect(() => { try { const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || "null") as SavedState | null; if (saved) { setStrokes(saved.strokes || []); setNotes(saved.notes || []); setTurns(saved.turns || []); setPage(saved.page || 1); setZoom(saved.zoom || 100); setNotice("Reopened your last saved study session."); } } catch { setNotice("Could not restore the previous session; a fresh workspace is ready."); } return () => { void voiceCall.current?.stop(); }; }, []);
  useEffect(() => { const t = window.setTimeout(() => { localStorage.setItem(SESSION_KEY, JSON.stringify({ strokes, notes, turns, page, zoom })); }, 300); return () => window.clearTimeout(t); }, [strokes, notes, turns, page, zoom]);
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key !== "/" || (e.target as HTMLElement).closest("input, textarea, select")) return; e.preventDefault(); setAskOpen(true); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, []);
  const addStroke = (s: Stroke) => { setHistory((h) => [...h, strokes]); setFuture([]); setStrokes((v) => [...v, s]); };
  const erase = (p: Point) => { const remaining = strokes.filter((s) => !s.points.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 20)); if (remaining.length !== strokes.length) { setHistory((h) => [...h, strokes]); setStrokes(remaining); } };
  const undo = () => { const previous = history.at(-1); if (!previous) return; setFuture((f) => [...f, strokes]); setStrokes(previous); setHistory((h) => h.slice(0, -1)); };
  const redo = () => { const next = future.at(-1); if (!next) return; setHistory((h) => [...h, strokes]); setStrokes(next); setFuture((f) => f.slice(0, -1)); };
  const addNote = (p: Point, text = "New note", graph?: Graph) => setNotes((v) => [...v, { id: makeId(), x: p.x, y: p.y, text, kind: "note", graph }]);
  const removeNote = (id: string) => setNotes((v) => v.filter((note) => note.id !== id));
  const insertArtifact = (artifact: Artifact) => { if (view === "pdf") setView("split"); const text = artifact.type === "steps" ? `${artifact.title}\n${artifact.steps?.join("\n")}` : artifact.body; addNote({ x: 80, y: 80 + notes.length * 30 }, text, artifact.graph); setNotice("Scribble's answer is on the board. Dismiss it with ×."); };
  async function ask(e?: FormEvent) { e?.preventDefault(); const asked = question.trim(); if (!asked || busy) return; setBusy(true); setQuestion(""); setAskOpen(false); setCurrent({ question: asked, mode: modeOf(asked) }); await new Promise((r) => setTimeout(r, 500)); const artifact = makeArtifact(asked); setTurns((v) => [...v, { id: makeId(), question: asked, response: artifact.body, artifact, createdAt: new Date().toISOString() }]); insertArtifact(artifact); setBusy(false); }
  const uploadPdf = (e: ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; if (file.type !== "application/pdf" || file.size > 15 * 1024 * 1024) { setNotice("Choose a PDF under 15 MB. The original stays in your browser."); return; } if (pdfUrl) URL.revokeObjectURL(pdfUrl); setPdfUrl(URL.createObjectURL(file)); setPdfName(file.name); setPage(1); setNotice(`${file.name} is open. PDF annotations are non-destructive overlays.`); };
  const startVoice = async () => { setVoice("connecting"); try { const call = createVoiceCall("local-demo-session", (s, msg) => { setVoice(s); if (msg) setNotice(msg); }); voiceCall.current = call; await call.start(); setVoice("active"); setNotice("Microphone active. Ask a short question, or use typed input at any time."); } catch { setVoice("error"); setNotice("Voice is unavailable without Bolna credentials. Typed tutoring remains available."); } };
  const endVoice = () => { void voiceCall.current?.stop(); voiceCall.current = null; setVoice("idle"); setNotice("Voice ended. Your notes remain saved."); };
  const toggleMute = () => { voiceCall.current?.setMuted(voice !== "muted"); setVoice(voice === "muted" ? "active" : "muted"); };
  const live = voice === "active" || voice === "muted" || voice === "connecting";
  const tutorBar = <div className="tutor-bar">
    {live ? <><button className="tutor-status live" onClick={endVoice} aria-label="End voice">{voice === "connecting" ? "Connecting" : voice === "muted" ? "Muted" : "Listening"}</button><button className="tutor-mini" onClick={toggleMute} disabled={voice === "connecting"}>{voice === "muted" ? "Unmute" : "Mute"}</button></> : <button className="tutor-status" onClick={() => setAskOpen(true)}>✦ Ask <kbd>/</kbd></button>}
    {askOpen ? <form className="tutor-ask" onSubmit={ask}><input autoFocus value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") setAskOpen(false); }} onBlur={() => { if (!question.trim()) setAskOpen(false); }} placeholder="Explain, hint, check, or plot…" aria-label="Ask Scribble" /></form>
      : current ? <div className="tutor-now"><span className="mode-chip">● {busy ? "Thinking" : current.mode}</span><p>{current.question}</p><button className="tutor-mini" onClick={() => setCurrent(null)} aria-label="Dismiss">×</button></div>
      : !live && <button className="tutor-mini" onClick={startVoice} aria-label="Start voice">🎙</button>}
  </div>;
  const addHighlight = () => { if (view === "pdf") setView("split"); addNote({ x: 80, y: 120 }, `PDF page ${page} highlight\nSelected region (normalized)`,); setNotice("A page-relative highlight note was added to the board; the source PDF is unchanged."); };
  return <main className="app-shell">
    <header className="topbar"><button className="brand" onClick={() => setView("welcome")} aria-label="Scribble home"><img className="brand-logo" src="/logo.png" alt="" /><span>Scribble</span></button><div className="session-meta"><strong>Calculus warm-up</strong><span className="save-state"><i /> Saved locally</span></div><div className="top-actions"><span className={`voice-pill ${voice}`}>● {voice === "active" ? "Listening" : voice === "connecting" ? "Connecting" : "Voice idle"}</span><button className="icon-button" aria-label="Settings">⚙</button></div></header>
    {view === "welcome" ? <section className="welcome"><h1>Welcome to Scribble</h1><p>Study with your source, your notes, and a tutor that sees both.</p><div className="welcome-options">{([["pdf", "▤", "Open PDF", "Read a study document."], ["notes", "✎", "Open notes", "Write on a blank whiteboard."], ["split", "◫", "Open side by side", "PDF and notes together."]] as const).map(([v, icon, title, text]) => <button key={v} className="welcome-option" onClick={() => setView(v)}><i>{icon}</i><b>{title}</b><span>{text}</span></button>)}</div></section> : <>
    <div className="notice" role="status">{notice}</div>
    {view === "split" && <nav className="mobile-tabs" aria-label="Workspace panels">{(["pdf", "board"] as const).map((tab) => <button key={tab} className={mobileTab === tab ? "active" : ""} onClick={() => setMobileTab(tab)}>{tab === "pdf" ? "Document" : "Whiteboard"}</button>)}</nav>}
    <div className={`workspace-grid view-${view}`}>
      {view !== "notes" && <section className={`surface pdf-panel ${mobileTab === "pdf" ? "mobile-visible" : ""}`}><div className="surface-head"><div><span className="label">DOCUMENT</span><h2>{pdfName || "Open a study PDF"}</h2></div><label className="small-button">Open PDF<input type="file" accept="application/pdf" hidden onChange={uploadPdf} /></label></div><div className="pdf-toolbar"><button onClick={() => setPage(Math.max(1, page - 1))}>‹</button><span>Page {page}</span><button onClick={() => setPage(page + 1)}>›</button><span className="toolbar-divider" /><button onClick={() => setZoom(Math.max(60, zoom - 10))}>−</button><span>{zoom}%</span><button onClick={() => setZoom(Math.min(160, zoom + 10))}>＋</button><button className="annotation-button" onClick={addHighlight}>▱ Highlight</button></div><div className="pdf-stage">{view === "pdf" && tutorBar}{pdfUrl ? <iframe title={pdfName || "PDF document"} src={`${pdfUrl}#page=${page}&zoom=${zoom}`} style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left", width: `${10000 / zoom}%`, height: `${10000 / zoom}%` }} /> : <div className="pdf-empty"><div className="document-icon">▤</div><h3>Your source stays beside your work</h3><p>Open any PDF to read it here. Use Highlight to create a non-destructive, page-relative study note.</p><label className="button primary">Choose PDF<input type="file" accept="application/pdf" hidden onChange={uploadPdf} /></label><button className="text-button" onClick={() => setNotice("Demo context: f(x) = sin(x) + x/3. Ask the tutor to explain, hint, check, or plot it.")}>Use demo context</button></div>}</div></section>}
      {view !== "pdf" && <section className={`surface board-panel ${mobileTab === "board" ? "mobile-visible" : ""}`}><div className="surface-head board-head"><div><span className="label">WHITEBOARD</span><h2>Untitled study notes</h2></div><span className="context-chip">● Active context</span></div><div className="board-tools"><button className={tool === "pen" ? "selected" : ""} onClick={() => setTool("pen")}>✎ Pen</button><button className={tool === "eraser" ? "selected" : ""} onClick={() => setTool("eraser")}>⌫ Eraser</button><button className={tool === "text" ? "selected" : ""} onClick={() => setTool("text")}>T Text</button><span className="toolbar-divider" />{COLORS.map((c) => <button key={c} className={`color-dot ${color === c ? "picked" : ""}`} style={{ background: c }} onClick={() => setColor(c)} aria-label={`Use ${c}`} />)}<select value={width} onChange={(e) => setWidth(Number(e.target.value))} aria-label="Stroke width"><option value={2}>Fine</option><option value={3}>Medium</option><option value={6}>Bold</option></select></div><Board strokes={strokes} notes={notes} tool={tool} color={color} width={width} onStroke={addStroke} onErase={erase} onAddNote={(p) => addNote(p)} onRemoveNote={removeNote} onUndo={undo} onRedo={redo} canUndo={history.length > 0} canRedo={future.length > 0}>{tutorBar}</Board></section>}
    </div>
    </>}
  </main>;
}
