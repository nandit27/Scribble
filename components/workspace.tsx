"use client";

import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState } from "react";
import { createVoiceCall, VoiceState } from "../lib/bolna-client";
import { makeId } from "../lib/id";
import { eraserRadiusFor } from "../lib/board";
import { makeArtifact, modeOf } from "../lib/tutor";
import { askTutorService, ensureTutorContext } from "../lib/tutor-api";
import { decideTutorAction } from "../lib/jev-client";
import { targetToPracticeStrokes } from "../lib/handwriting";
import type { Artifact, BoardNote, Point, SavedState, Stroke, Tool, Turn, View } from "../lib/types";
import { AppHeader, SyncStatus } from "./app-header";
import { WelcomeScreen } from "./welcome-screen";
import { PdfPane } from "./pdf-pane";
import { BoardPane } from "./board-pane";
import { SplitDivider } from "./split-divider";
import { Toast, useToast } from "./toast";
import { useSupabaseAuth } from "../lib/supabase/auth";
import { fetchRemoteSession, getPdfSignedUrl, pushRemoteSession, uploadPdfToStorage } from "../lib/supabase/sync";

const SESSION_KEY = "scribble-demo-session-v3";
const HIGHLIGHT_HINT_KEY = "scribble-highlight-hint-seen";
const BOARD_HINT_KEY = "scribble-board-hint-seen";
const DEFAULT_SESSION_NAME = "Calculus warm-up";

export function Workspace() {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [notes, setNotes] = useState<BoardNote[]>([]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [history, setHistory] = useState<Stroke[][]>([]);
  const [future, setFuture] = useState<Stroke[][]>([]);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#202019");
  const [width, setWidth] = useState(3);
  const [question, setQuestion] = useState("");
  const [roastMode, setRoastMode] = useState(false);
  const [handwritingTarget, setHandwritingTarget] = useState("");
  const [handwritingConfirmed, setHandwritingConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [voice, setVoice] = useState<VoiceState>("idle");

  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [lastPdfName, setLastPdfName] = useState("");
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [visiblePageText, setVisiblePageText] = useState("");
  const [selectedPdfText, setSelectedPdfText] = useState("");
  const [highlightMode, setHighlightMode] = useState(false);
  const [highlightHintSeen, setHighlightHintSeen] = useState(false);

  const [boardZoom, setBoardZoom] = useState(1);
  const [boardPan, setBoardPan] = useState<Point>({ x: 0, y: 0 });
  const [boardContextEnabled, setBoardContextEnabled] = useState(true);
  const [boardHintDismissed, setBoardHintDismissed] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);

  const [mobileTab, setMobileTab] = useState<"pdf" | "board">("board");
  const [view, setView] = useState<View>("welcome");
  const [focusedPane, setFocusedPane] = useState<"pdf" | "notes" | null>(null);
  const [splitRatio, setSplitRatio] = useState(0.5);

  const [sessionName, setSessionName] = useState(DEFAULT_SESSION_NAME);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(DEFAULT_SESSION_NAME);
  const [updatedAt, setUpdatedAt] = useState<string | undefined>(undefined);

  const [askOpen, setAskOpen] = useState(false);
  const [current, setCurrent] = useState<{ question: string; mode: string } | null>(null);

  const [pdfPath, setPdfPath] = useState<string | undefined>(undefined);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [apiSessionId, setApiSessionId] = useState<string | null>(null);
  const [apiWorksheetId, setApiWorksheetId] = useState<string | null>(null);

  const toast = useToast();
  const auth = useSupabaseAuth();
  const mergedUserId = useRef<string | null>(null);
  const voiceCall = useRef<ReturnType<typeof createVoiceCall> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || "null") as SavedState | null;
      if (saved) {
        setStrokes(saved.strokes || []);
        setNotes(saved.notes || []);
        setTurns(saved.turns || []);
        setPage(saved.page || 1);
        setZoom(saved.zoom || 100);
        setSessionName(saved.sessionName || DEFAULT_SESSION_NAME);
        setNameDraft(saved.sessionName || DEFAULT_SESSION_NAME);
        setUpdatedAt(saved.updatedAt);
        setSplitRatio(saved.splitRatio ?? 0.5);
        setLastPdfName(saved.pdfName || "");
        setBoardContextEnabled(saved.boardContextEnabled ?? true);
        setApiSessionId(saved.apiSessionId ?? null);
        setApiWorksheetId(saved.apiWorksheetId ?? null);
        if ((saved.strokes?.length || saved.notes?.length || saved.turns?.length)) toast.show("Reopened your last saved session.");
      }
    } catch {
      toast.show("Could not restore the previous session. A fresh workspace is ready.");
    }
    try { setHighlightHintSeen(localStorage.getItem(HIGHLIGHT_HINT_KEY) === "1"); } catch {}
    try { setBoardHintDismissed(localStorage.getItem(BOARD_HINT_KEY) === "1"); } catch {}
    return () => { void voiceCall.current?.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (pdfName) setLastPdfName(pdfName); }, [pdfName]);
  useEffect(() => { if (view !== "split") setFocusedPane(null); }, [view]);

  useEffect(() => {
    const t = window.setTimeout(async () => {
      const now = new Date().toISOString();
      setUpdatedAt(now);
      const payload: SavedState = {
        strokes, notes, turns, page, zoom, sessionName, updatedAt: now, splitRatio, pdfName: lastPdfName, pdfPath, boardContextEnabled, apiSessionId: apiSessionId ?? undefined, apiWorksheetId: apiWorksheetId ?? undefined,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
      if (auth.user) {
        setSyncStatus("syncing");
        const ok = await pushRemoteSession(auth.user.id, payload);
        setSyncStatus(ok ? "synced" : "error");
      }
    }, 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokes, notes, turns, page, zoom, sessionName, splitRatio, lastPdfName, pdfPath, boardContextEnabled, apiSessionId, apiWorksheetId, auth.user]);

  // On sign-in: adopt whichever copy (local or remote) is more recently updated, so work from any
  // device wins instead of silently clobbering the other. Signed-out users are unaffected (local-only).
  useEffect(() => {
    const userId = auth.user?.id ?? null;
    if (!userId) { mergedUserId.current = null; setSyncStatus("idle"); return; }
    if (mergedUserId.current === userId) return;
    mergedUserId.current = userId;

    (async () => {
      setSyncStatus("syncing");
      const remote = await fetchRemoteSession(userId);
      const localUpdatedAt = updatedAt ? new Date(updatedAt).getTime() : 0;
      const remoteUpdatedAt = remote?.updatedAt ? new Date(remote.updatedAt).getTime() : 0;

      if (remote && remoteUpdatedAt > localUpdatedAt) {
        setStrokes(remote.strokes || []);
        setNotes(remote.notes || []);
        setTurns(remote.turns || []);
        setPage(remote.page || 1);
        setZoom(remote.zoom || 100);
        setSessionName(remote.sessionName || DEFAULT_SESSION_NAME);
        setNameDraft(remote.sessionName || DEFAULT_SESSION_NAME);
        setSplitRatio(remote.splitRatio ?? 0.5);
        setLastPdfName(remote.pdfName || "");
        setBoardContextEnabled(remote.boardContextEnabled ?? true);
        setApiSessionId(remote.apiSessionId ?? null);
        setApiWorksheetId(remote.apiWorksheetId ?? null);
        setUpdatedAt(remote.updatedAt);
        if (remote.pdfPath) {
          setPdfPath(remote.pdfPath);
          const url = await getPdfSignedUrl(remote.pdfPath);
          if (url) { setPdfUrl(url); setPdfName(remote.pdfName || "Document.pdf"); }
        }
        toast.show("Signed in. Restored your most recent saved session.");
        setSyncStatus("synced");
      } else {
        const now = new Date().toISOString();
        setUpdatedAt(now);
        const ok = await pushRemoteSession(userId, {
          strokes, notes, turns, page, zoom, sessionName, updatedAt: now, splitRatio, pdfName: lastPdfName, pdfPath, boardContextEnabled, apiSessionId: apiSessionId ?? undefined, apiWorksheetId: apiWorksheetId ?? undefined,
        });
        setSyncStatus(ok ? "synced" : "error");
        toast.show(ok ? "Signed in. This session is now synced to your account." : "Signed in, but syncing failed. Your work is still saved locally.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = !!(e.target as HTMLElement)?.closest("input, textarea, select");
      if (e.key === "/" && !typing) { e.preventDefault(); setAskOpen(true); return; }
      if ((e.metaKey || e.ctrlKey) && !typing && (view === "notes" || view === "split")) {
        if (e.key.toLowerCase() === "z" && e.shiftKey) { e.preventDefault(); redo(); }
        else if (e.key.toLowerCase() === "z") { e.preventDefault(); undo(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, strokes, history, future]);

  const addStroke = (s: Stroke) => { setHistory((h) => [...h, strokes]); setFuture([]); setStrokes((v) => [...v, s]); };
  const addPracticeStrokes = (target: string) => {
    const practice = targetToPracticeStrokes(target, 100, 150 + notes.length * 70);
    if (!practice.length) { toast.show("Use letters, numbers, or basic math symbols in the practice target."); return false; }
    setHistory((history) => [...history, strokes]); setFuture([]); setStrokes((existing) => [...existing, ...practice]);
    addNote({ x: 80, y: 90 + notes.length * 30 }, `Practice completion — student-confirmed target: ${target}`, undefined, "note");
    return true;
  };
  const erase = (p: Point) => {
    const radius = eraserRadiusFor(width);
    const remaining = strokes.filter((s) => !s.points.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < radius));
    if (remaining.length !== strokes.length) { setHistory((h) => [...h, strokes]); setStrokes(remaining); }
  };
  const undo = () => { const previous = history.at(-1); if (!previous) return; setFuture((f) => [...f, strokes]); setStrokes(previous); setHistory((h) => h.slice(0, -1)); };
  const redo = () => { const next = future.at(-1); if (!next) return; setHistory((h) => [...h, strokes]); setStrokes(next); setFuture((f) => f.slice(0, -1)); };

  const addNote = (p: Point, text = "New note", graph?: BoardNote["graph"], kind: BoardNote["kind"] = "note", notePage?: number) =>
    setNotes((v) => [...v, { id: makeId(), x: p.x, y: p.y, text, kind, graph, page: notePage }]);
  const removeNote = (id: string) => setNotes((v) => v.filter((note) => note.id !== id));
  const moveNote = (id: string, p: Point) => setNotes((v) => v.map((note) => note.id === id ? { ...note, x: p.x, y: p.y } : note));

  const dismissBoardHint = () => { if (!boardHintDismissed) { setBoardHintDismissed(true); try { localStorage.setItem(BOARD_HINT_KEY, "1"); } catch {} } };

  const insertArtifact = (artifact: Artifact) => {
    if (view === "pdf") setView("split");
    const text = artifact.type === "steps" ? `${artifact.title}\n${artifact.steps?.join("\n")}` : artifact.body;
    addNote({ x: 80, y: 80 + notes.length * 30 }, text, artifact.graph);
    toast.show("Scribble's answer is on the board.");
  };

  async function ask(e?: FormEvent) {
    e?.preventDefault();
    const asked = question.trim();
    if (!asked || busy) return;
    setBusy(true); setQuestion(""); setAskOpen(false);
    setCurrent({ question: asked, mode: modeOf(asked) });
    await new Promise((r) => setTimeout(r, 500));
    const boardSummary = boardContextEnabled
      ? [notes.slice(-4).map((note) => note.text).join(" "), `${strokes.length} handwritten stroke${strokes.length === 1 ? "" : "s"}`].filter(Boolean).join(". ")
      : undefined;
    const baseContext = { selectedText: selectedPdfText, visiblePageText, boardSummary, roastMode, handwritingTarget, handwritingConfirmed };
    let action = roastMode ? "roast" : "explain";
    try { action = await decideTutorAction({ question: asked, ...baseContext }); } catch { toast.show("Decision service is unavailable; Scribble used its safe local routing."); }
    const context = { ...baseContext, roastMode: action === "roast" };
    if (action === "complete_handwriting") {
      const completed = handwritingConfirmed && handwritingTarget.trim() && addPracticeStrokes(handwritingTarget.trim());
      const body = completed ? "Added a clearly labeled vector practice completion from your confirmed target." : "Confirm an explicit practice target before Scribble adds any writing.";
      const artifact: Artifact = { type: "steps", title: "Practice completion", body, steps: ["These are generated vector strokes, not a copy of your handwriting."], status: "not_applicable" };
      setTurns((v) => [...v, { id: makeId(), question: asked, response: body, artifact, createdAt: new Date().toISOString() }]);
      setBusy(false);
      return;
    }
    let artifact = makeArtifact(asked, context);
    let turn: Turn = { id: makeId(), question: asked, response: artifact.body, artifact, createdAt: new Date().toISOString() };
    try {
      const remote = action === "roast" ? null : await askTutorService(apiSessionId, asked, context, action === "draw_graph");
      if (remote) { setApiSessionId(remote.sessionId); setApiWorksheetId(remote.worksheetId); turn = remote.turn; artifact = remote.turn.artifact; }
    } catch { toast.show("Tutor service is offline, so Scribble used its local study helper."); }
    setTurns((v) => [...v, turn]);
    insertArtifact(artifact);
    setBusy(false);
  }

  const acceptFile = (file: File) => {
    setFileError(null);
    if (file.type !== "application/pdf") { setFileError("Choose a PDF file."); return; }
    if (file.size > 15 * 1024 * 1024) { setFileError("Choose a PDF under 15 MB."); return; }
    setPdfLoading(true);
    window.setTimeout(async () => {
      setPdfUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
      setPdfName(file.name);
      setPdfPath(undefined);
      setPage(1);
      setPdfPageCount(0);
      setVisiblePageText("");
      setSelectedPdfText("");
      setPdfLoading(false);
      toast.show(`${file.name} is open. Highlights stay separate from the original file.`);
      if (auth.user) {
        const path = await uploadPdfToStorage(auth.user.id, file);
        if (path) setPdfPath(path);
      }
    }, 400);
  };
  const uploadPdf = (e: ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) acceptFile(file); e.target.value = ""; };
  const onDragOver = (e: DragEvent) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = () => setDragOver(false);
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDragOver(false); const file = e.dataTransfer.files?.[0]; if (file) acceptFile(file); };
  const openFilePicker = () => fileInputRef.current?.click();
  const onTrySample = () => toast.show("Sample context ready: f(x) = sin(x) + x/3. Ask the tutor to explain, hint, check, or plot it.");

  const toggleHighlight = () => setHighlightMode((v) => !v);
  const addToNotes = () => {
    if (!selectedPdfText) { toast.show("Select text in the document first."); return; }
    if (view === "pdf") setView("split");
    addNote({ x: 80, y: 80 + notes.length * 20 }, selectedPdfText, undefined, "highlight", page);
    if (!highlightHintSeen) { setHighlightHintSeen(true); try { localStorage.setItem(HIGHLIGHT_HINT_KEY, "1"); } catch {} }
    toast.show("Added to your notes as a linked snippet.");
  };

  const startVoice = async () => {
    setVoice("connecting");
    try {
      const boardSummary = boardContextEnabled ? [notes.slice(-4).map((note) => note.text).join(" "), `${strokes.length} strokes on the board`].filter(Boolean).join(". ") : "";
      const context = { selectedText: selectedPdfText, visiblePageText, boardSummary };
      const attached = await ensureTutorContext(apiSessionId, context);
      if (!attached?.worksheetId) throw new Error("Add document or board context before starting voice.");
      setApiSessionId(attached.sessionId);
      setApiWorksheetId(attached.worksheetId);
      const call = createVoiceCall(attached.sessionId, {
        worksheet_id: attached.worksheetId,
        selected_text: selectedPdfText.slice(0, 2000),
        visible_page_text: selectedPdfText ? "" : visiblePageText.slice(0, 4000),
        board_context: boardSummary.slice(0, 3000),
      }, (s, msg) => { setVoice(s); if (msg) toast.show(msg); });
      voiceCall.current = call;
      await call.start();
      setVoice("active");
      toast.show("Microphone active. Ask a short question, or type at any time.");
    } catch {
      setVoice("error");
      toast.show("Voice is unavailable without Bolna credentials. Typed tutoring remains available.");
    }
  };
  const endVoice = () => { void voiceCall.current?.stop(); voiceCall.current = null; setVoice("idle"); toast.show("Voice ended. Your notes remain saved."); };
  const toggleMute = () => { voiceCall.current?.setMuted(voice !== "muted"); setVoice(voice === "muted" ? "active" : "muted"); };
  const live = voice === "active" || voice === "muted" || voice === "connecting";

  const toggleFocus = (pane: "pdf" | "notes") => setFocusedPane((cur) => (cur === pane ? null : pane));

  const startEditName = () => { setNameDraft(sessionName); setEditingName(true); };
  const commitName = () => { const v = nameDraft.trim(); setSessionName(v || sessionName); setEditingName(false); };
  const cancelEditName = () => { setNameDraft(sessionName); setEditingName(false); };

  const hasProgress = strokes.length > 0 || notes.length > 0 || turns.length > 0 || !!lastPdfName;
  const contentsLabel = lastPdfName || "Notes only";
  const handleContinue = () => {
    if (lastPdfName && (strokes.length > 0 || notes.length > 0)) setView("split");
    else if (lastPdfName) setView("pdf");
    else setView("notes");
  };

  const pdfContextLabel = selectedPdfText ? `PDF: ${selectedPdfText.length} characters selected` : pdfUrl ? `PDF: page ${page}${pdfPageCount ? ` of ${pdfPageCount}` : ""}` : "PDF: no document";
  const notesContextLabel = boardContextEnabled ? `Notes: ${strokes.length} stroke${strokes.length === 1 ? "" : "s"}` : "Notes: hidden from tutor";

  const tutorProps = {
    askOpen, onOpenAsk: () => setAskOpen(true), onCloseAsk: () => setAskOpen(false),
    question, onQuestionChange: setQuestion, onAsk: ask, busy,
    current, onDismissCurrent: () => setCurrent(null),
    live, voiceState: voice, onStartVoice: startVoice, onEndVoice: endVoice, onToggleMute: toggleMute,
    roastMode, onToggleRoastMode: () => setRoastMode((enabled) => !enabled),
    handwritingTarget, onHandwritingTargetChange: (target: string) => { setHandwritingTarget(target); setHandwritingConfirmed(false); },
    handwritingConfirmed, onHandwritingConfirmedChange: setHandwritingConfirmed,
  };

  return (
    <main className="app-shell">
      <AppHeader
        sessionName={sessionName}
        editingName={editingName}
        nameDraft={nameDraft}
        onStartEdit={startEditName}
        onDraftChange={setNameDraft}
        onCommitName={commitName}
        onCancelEdit={cancelEditName}
        voice={voice}
        view={view}
        onGoHome={() => setView("welcome")}
        pdfContextLabel={pdfContextLabel}
        notesContextLabel={notesContextLabel}
        tutorProps={tutorProps}
        authEmail={auth.user?.email ?? null}
        onSignIn={auth.signInWithEmail}
        onSignOut={auth.signOut}
        syncStatus={syncStatus}
      />

      {view === "welcome" ? (
        <WelcomeScreen
          sessionName={sessionName}
          hasProgress={hasProgress}
          updatedAt={updatedAt}
          contentsLabel={contentsLabel}
          onContinue={handleContinue}
          onSelect={setView}
        />
      ) : (
        <>
          <Toast toast={toast.toast} onDismiss={toast.dismiss} />
          {view === "split" && (
            <nav className="mobile-tabs" aria-label="Workspace panels">
              {(["pdf", "board"] as const).map((tab) => (
                <button key={tab} className={mobileTab === tab ? "is-active" : ""} aria-pressed={mobileTab === tab} onClick={() => setMobileTab(tab)}>
                  {tab === "pdf" ? "Document" : "Notes"}
                </button>
              ))}
            </nav>
          )}
          <div className={`workspace-area view-${view} ${focusedPane ? "has-focus" : ""}`} ref={splitContainerRef}>
            {view !== "notes" && (
              <PdfPane
                pdfUrl={pdfUrl} pdfName={pdfName} page={page} onPageChange={setPage} zoom={zoom} onZoom={setZoom}
                fileInputRef={fileInputRef} onOpenPicker={openFilePicker} onFileChange={uploadPdf}
                dragOver={dragOver} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                fileError={fileError} pdfLoading={pdfLoading}
                highlightMode={highlightMode} onToggleHighlight={toggleHighlight} onAddToNotes={addToNotes} highlightHintSeen={highlightHintSeen}
                pageCount={pdfPageCount} onPageCount={setPdfPageCount} onPageText={setVisiblePageText} onTextSelection={setSelectedPdfText} selectedText={selectedPdfText}
                onTrySample={onTrySample}
                view={view} isFocused={focusedPane === "pdf"} isOtherFocused={focusedPane === "notes"} onToggleFocus={() => toggleFocus("pdf")}
                mobileVisible={mobileTab === "pdf"}
                style={view === "split" && !focusedPane ? { flexBasis: `calc((100% - 8px) * ${splitRatio})` } : undefined}
                tutorProps={view !== "split" ? tutorProps : null}
              />
            )}
            {view === "split" && !focusedPane && (
              <SplitDivider containerRef={splitContainerRef} ratio={splitRatio} onRatioChange={setSplitRatio} />
            )}
            {view !== "pdf" && (
              <BoardPane
                strokes={strokes} notes={notes} tool={tool} onToolChange={setTool} color={color} onColorChange={setColor} width={width} onWidthChange={setWidth}
                onStroke={addStroke} onErase={erase} onAddNote={(p) => addNote(p)} onRemoveNote={removeNote} onMoveNote={moveNote}
                undo={undo} redo={redo} canUndo={history.length > 0} canRedo={future.length > 0}
                confirmingClear={confirmingClear} onRequestClear={() => setConfirmingClear(true)}
                onConfirmClear={() => { setHistory((h) => [...h, strokes]); setFuture([]); setStrokes([]); setConfirmingClear(false); toast.show("Canvas cleared. Undo to bring your strokes back."); }}
                onCancelClear={() => setConfirmingClear(false)}
                boardContextEnabled={boardContextEnabled} onToggleBoardContext={() => setBoardContextEnabled((v) => !v)}
                boardZoom={boardZoom} boardPan={boardPan} onBoardZoomChange={setBoardZoom} onBoardPanChange={setBoardPan}
                showHint={!boardHintDismissed} onFirstInteraction={dismissBoardHint}
                view={view} isFocused={focusedPane === "notes"} isOtherFocused={focusedPane === "pdf"} onToggleFocus={() => toggleFocus("notes")}
                mobileVisible={mobileTab === "board"}
                tutorProps={view !== "split" ? tutorProps : null}
              />
            )}
          </div>
        </>
      )}
    </main>
  );
}
