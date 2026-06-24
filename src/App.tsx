import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Copy,
  Download,
  FileAudio2,
  Loader2,
  Mic,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Square,
  Upload
} from "lucide-react";
import { useLongRecorder } from "./hooks/useLongRecorder";
import { countWords, downloadTextFile, polishTranscriptText } from "./utils/formatTranscript";

type FlowPhase = "idle" | "recording" | "ready" | "transcribing" | "done";

function App() {
  const recorder = useLongRecorder();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [transcript, setTranscript] = useState("");
  const [importedAudio, setImportedAudio] = useState<File | null>(null);
  const [phase, setPhase] = useState<FlowPhase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState("Copier");
  const [waitingHint, setWaitingHint] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const words = useMemo(() => countWords(transcript), [transcript]);
  const hasText = transcript.trim().length > 0;
  const primary = getPrimaryAction(phase);

  useEffect(() => {
    const savedTranscript = window.localStorage.getItem("ostiro-flow-transcript");
    if (savedTranscript?.trim()) {
      setTranscript(savedTranscript);
      setPhase("done");
      setMessage("Dernier texte restauré.");
    }
  }, []);

  useEffect(() => {
    if (hasText) {
      window.localStorage.setItem("ostiro-flow-transcript", transcript);
    }
  }, [hasText, transcript]);

  useEffect(() => {
    setWaitingHint(false);
    if (phase !== "transcribing") {
      return;
    }

    const timeout = window.setTimeout(() => setWaitingHint(true), 10_000);
    return () => window.clearTimeout(timeout);
  }, [phase]);

  async function startRecording() {
    setMessage(null);
    setTranscript("");
    setImportedAudio(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    const started = await recorder.start();
    if (started) {
      setPhase("recording");
    }
  }

  async function stopRecording() {
    await recorder.stop();
    setPhase("ready");
    setMessage("Audio prêt.");
  }

  async function transcribeRecording() {
    setMessage(null);
    setPhase("transcribing");

    try {
      const audio = importedAudio ?? (await recorder.getAudioBlob());

      if (!audio) {
        throw new Error("Aucun audio disponible.");
      }

      const formData = new FormData();
      formData.append("audio", audio, importedAudio?.name ?? "ostiro-flow.webm");
      formData.append("language", "fr");

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData
      });
      const payload = (await response.json().catch(() => null)) as
        | { text?: string; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Transcription impossible.");
      }

      const cleanText = polishTranscriptText(payload?.text ?? "");
      if (!cleanText) {
        throw new Error("La transcription est vide.");
      }

      setTranscript(cleanText);
      setPhase("done");
      setMessage("Transcription prête.");
    } catch (error) {
      setPhase("ready");
      setMessage(error instanceof Error ? error.message : "Transcription impossible.");
    }
  }

  async function copyTranscript() {
    if (!hasText) {
      return;
    }

    const text = transcript.trim();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      fallbackCopy(text);
    }
    setCopyLabel("Copié");
    window.setTimeout(() => setCopyLabel("Copier"), 1100);
  }

  async function resetFlow() {
    await recorder.reset();
    setTranscript("");
    setImportedAudio(null);
    setMessage(null);
    setPhase("idle");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    window.localStorage.removeItem("ostiro-flow-transcript");
  }

  async function importAudio(file: File | null) {
    if (!file) {
      return;
    }

    if (phase === "recording") {
      await recorder.stop(false);
    }

    setImportedAudio(file);
    setTranscript("");
    setPhase("ready");
    setMessage("Audio importé.");
  }

  function downloadTranscript() {
    if (!hasText) {
      return;
    }

    downloadTextFile(
      `ostiro-flow-${new Date().toISOString().slice(0, 10)}.txt`,
      transcript.trim()
    );
  }

  async function handlePrimaryAction() {
    if (phase === "recording") {
      await stopRecording();
      return;
    }

    if (phase === "ready") {
      await transcribeRecording();
      return;
    }

    if (phase === "done") {
      await copyTranscript();
      return;
    }

    if (phase !== "transcribing") {
      await startRecording();
    }
  }

  function handleDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragActive(false);
    void importAudio(event.dataTransfer.files?.[0] ?? null);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="/" aria-label="Ostiro Flow">
          <span className="brand-mark" aria-hidden="true" />
          <span>
            <strong>Ostiro</strong>
            <em>Flow</em>
          </span>
        </a>

        <div className="header-actions">
          <span className="local-pill">
            <ShieldCheck size={15} />
            Local
          </span>
          <button className="ghost-button" type="button" onClick={copyTranscript} disabled={!hasText}>
            <Copy size={16} />
            {copyLabel}
          </button>
        </div>
      </header>

      <main className="workspace">
        <section
          className={`control-panel ${phase} ${dragActive ? "drag-active" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          <div className="panel-head">
            <div>
              <p className="eyebrow">Transcription locale</p>
              <h1>Audio clair. Texte prêt.</h1>
            </div>
            <span className="state-badge">{getStateText(phase)}</span>
          </div>

          <div className="recorder-stage">
            <div className="recorder-orb" aria-hidden="true">
              {phase === "transcribing" ? <Loader2 size={34} /> : <Mic size={34} />}
            </div>
            <div className="wave" aria-hidden="true">
              {Array.from({ length: 20 }, (_, index) => (
                <span key={index} style={{ "--i": index } as React.CSSProperties} />
              ))}
            </div>
          </div>

          <button
            className="primary-button"
            type="button"
            onClick={handlePrimaryAction}
            disabled={phase === "transcribing"}
          >
            {primary.icon}
            {primary.label}
          </button>

          <div className="secondary-row">
            <input
              ref={fileInputRef}
              type="file"
              hidden
              aria-hidden="true"
              tabIndex={-1}
              accept="audio/*,.webm,.m4a,.mp3,.wav,.ogg,.mp4"
              onChange={(event) => void importAudio(event.target.files?.[0] ?? null)}
            />
            {phase !== "recording" && phase !== "transcribing" ? (
              <button
                className="ghost-button"
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={16} />
                Importer
              </button>
            ) : null}
            {phase !== "idle" || hasText ? (
              <button className="ghost-button" type="button" onClick={resetFlow}>
                <RotateCcw size={16} />
                Nouveau
              </button>
            ) : null}
          </div>

          <div className="steps" aria-label="Progression">
            <Step label="Capture" active={phase === "recording"} done={phase !== "idle"} />
            <Step label="Transcription" active={phase === "transcribing"} done={phase === "done"} />
            <Step label="Copie" active={phase === "done"} done={hasText} />
          </div>

          <p className="status-text">
            {recorder.error ??
              message ??
              (phase === "transcribing" && waitingHint
                ? "Le modèle local se prépare."
                : importedAudio
                  ? importedAudio.name
                  : "Aucun cloud obligatoire.")}
          </p>
        </section>

        <section className="transcript-panel" aria-label="Transcription">
          <div className="panel-toolbar">
            <div>
              <p className="eyebrow">Texte final</p>
              <h2>Transcription</h2>
            </div>
            <span>{hasText ? `${words} mots` : "Vide"}</span>
          </div>

          <textarea
            value={transcript}
            onChange={(event) => {
              setTranscript(event.target.value);
              if (event.target.value.trim()) {
                setPhase("done");
              }
            }}
            placeholder="Votre transcription apparaîtra ici. Vous pouvez corriger le texte directement avant de le copier."
            spellCheck
          />

          <div className="bottom-actions">
            <button className="ghost-button" type="button" onClick={copyTranscript} disabled={!hasText}>
              <Copy size={16} />
              {copyLabel}
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={downloadTranscript}
              disabled={!hasText}
            >
              <Download size={16} />
              TXT
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

function Step({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <div className={`step ${active ? "active" : ""} ${done ? "done" : ""}`}>
      <span>{done ? <Check size={13} /> : null}</span>
      <strong>{label}</strong>
    </div>
  );
}

function getPrimaryAction(phase: FlowPhase) {
  if (phase === "recording") {
    return { icon: <Square size={18} />, label: "Arrêter" };
  }

  if (phase === "ready") {
    return { icon: <Sparkles size={18} />, label: "Transcrire" };
  }

  if (phase === "transcribing") {
    return { icon: <Loader2 size={18} />, label: "Transcription..." };
  }

  if (phase === "done") {
    return { icon: <Copy size={18} />, label: "Copier le texte" };
  }

  return { icon: <FileAudio2 size={18} />, label: "Enregistrer" };
}

function getStateText(phase: FlowPhase) {
  if (phase === "recording") {
    return "En cours";
  }

  if (phase === "ready") {
    return "Audio prêt";
  }

  if (phase === "transcribing") {
    return "Local";
  }

  if (phase === "done") {
    return "Texte prêt";
  }

  return "Prêt";
}

function fallbackCopy(text: string) {
  const element = document.createElement("textarea");
  element.value = text;
  element.setAttribute("readonly", "true");
  element.style.position = "fixed";
  element.style.top = "-1000px";
  element.style.opacity = "0";
  document.body.appendChild(element);
  element.select();
  document.execCommand("copy");
  document.body.removeChild(element);
}

export default App;
