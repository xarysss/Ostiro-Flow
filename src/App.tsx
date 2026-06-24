import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type ReactNode
} from "react";
import * as THREE from "three";
import {
  Activity,
  ArrowRight,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileAudio2,
  Github,
  Globe2,
  Laptop,
  Loader2,
  Mic,
  MonitorDown,
  Radio,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Square,
  Upload
} from "lucide-react";
import { useLongRecorder } from "./hooks/useLongRecorder";
import { countWords, downloadTextFile, polishTranscriptText } from "./utils/formatTranscript";

type FlowPhase = "idle" | "recording" | "ready" | "transcribing" | "done";
type RoutePath = "/" | "/studio" | "/network" | "/telechargements";

const GITHUB_URL = "https://github.com/xarysss/Ostiro-Flow";

const navItems: Array<{ path: RoutePath; label: string }> = [
  { path: "/", label: "Accueil" },
  { path: "/studio", label: "Studio" },
  { path: "/network", label: "Ostiro Network" },
  { path: "/telechargements", label: "Apps" }
];

function App() {
  const [route, setRoute] = useState<RoutePath>(() => normalizePath(window.location.pathname));

  useEffect(() => {
    const handlePopState = () => setRoute(normalizePath(window.location.pathname));
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function navigate(path: RoutePath) {
    window.history.pushState({}, "", path);
    setRoute(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="site-shell">
      <Header route={route} navigate={navigate} />
      <main>
        {route === "/" ? <HomePage navigate={navigate} /> : null}
        {route === "/studio" ? <StudioPage /> : null}
        {route === "/network" ? <NetworkPage /> : null}
        {route === "/telechargements" ? <DownloadsPage /> : null}
      </main>
      <Footer navigate={navigate} />
    </div>
  );
}

function Header({
  route,
  navigate
}: {
  route: RoutePath;
  navigate: (path: RoutePath) => void;
}) {
  return (
    <header className="site-header">
      <a
        className="brand"
        href="/"
        onClick={(event) => {
          event.preventDefault();
          navigate("/");
        }}
        aria-label="Ostiro Flow"
      >
        <img src="/brand/ostiro-flow-icon.png" alt="" />
        <span>
          <strong>Ostiro</strong>
          <em>Flow</em>
        </span>
      </a>

      <nav className="desktop-nav" aria-label="Navigation principale">
        {navItems.map((item) => (
          <a
            key={item.path}
            className={route === item.path ? "active" : ""}
            href={item.path}
            onClick={(event) => {
              event.preventDefault();
              navigate(item.path);
            }}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <a className="header-cta" href={GITHUB_URL} target="_blank" rel="noreferrer">
        <Github size={16} />
        GitHub
      </a>
    </header>
  );
}

function HomePage({ navigate }: { navigate: (path: RoutePath) => void }) {
  return (
    <>
      <section className="hero-section">
        <HeroScene />
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="eyebrow">Audio long format - transcription propre</p>
          <h1>Ostiro Flow</h1>
          <p className="hero-copy">
            Un studio web sombre, minimal et professionnel pour enregistrer une discussion,
            transcrire le contenu avec un backend Whisper local, puis copier un texte propre.
          </p>
          <div className="hero-actions">
            <button className="primary-link" type="button" onClick={() => navigate("/studio")}>
              Ouvrir le studio
              <ArrowRight size={18} />
            </button>
            <button
              className="secondary-link"
              type="button"
              onClick={() => navigate("/telechargements")}
            >
              Voir les apps
            </button>
          </div>
        </div>
      </section>

      <section className="section-block compact-intro" id="studio-preview">
        <div className="section-heading">
          <p className="eyebrow">Experience principale</p>
          <h2>Enregistrer, transcrire, copier. Rien de plus.</h2>
          <p>
            Le studio reste disponible des la page d'accueil. Les informations secondaires
            partent dans les pages dediees pour garder l'usage simple sur mobile.
          </p>
        </div>
        <TranscriptStudio embedded />
      </section>

      <section className="section-block feature-band">
        <FeatureItem icon={<Mic size={20} />} title="Capture longue duree">
          Decoupage audio progressif pour tenir des conversations longues sans surcharge visuelle.
        </FeatureItem>
        <FeatureItem icon={<ShieldCheck size={20} />} title="Backend dedie">
          Transcription via le service Railway, sans dependance a une cle OpenAI dans le navigateur.
        </FeatureItem>
        <FeatureItem icon={<Copy size={20} />} title="Copie propre">
          Texte final editable, copiable et exportable en fichier TXT.
        </FeatureItem>
      </section>
    </>
  );
}

function StudioPage() {
  return (
    <section className="section-block page-section">
      <div className="section-heading">
        <p className="eyebrow">Studio</p>
        <h1>Transcription rapide</h1>
        <p>Un seul flux de travail : micro ou import audio, transcription, copie.</p>
      </div>
      <TranscriptStudio />
    </section>
  );
}

function NetworkPage() {
  return (
    <section className="section-block page-section">
      <div className="section-heading">
        <p className="eyebrow">Ecosysteme Ostiro</p>
        <h1>Ostiro Network et Ostiro Atlas</h1>
        <p>
          Ostiro Flow devient une brique simple dans un univers plus large : outils,
          automatisation, veille, analyse et produits publics.
        </p>
      </div>

      <div className="network-layout">
        <article className="spotlight-panel">
          <Github size={26} />
          <h2>Projet public sur GitHub</h2>
          <p>
            Suivre l'evolution, cloner le projet, proposer des ameliorations et verifier les
            prochaines releases natives depuis le repository.
          </p>
          <a className="primary-link inline" href={GITHUB_URL} target="_blank" rel="noreferrer">
            Voir le repo
            <ExternalLink size={16} />
          </a>
        </article>

        <div className="product-grid">
          <ProductCard
            icon={<Globe2 size={22} />}
            title="Ostiro Network"
            label="Infrastructure"
            body="Le socle de marque : pages, services, distributions, automatisations et outils publics."
          />
          <ProductCard
            icon={<Activity size={22} />}
            title="Ostiro Atlas"
            label="Analyse"
            body="Un cockpit d'observation pour centraliser des signaux, documents et donnees actionnables."
          />
          <ProductCard
            icon={<Radio size={22} />}
            title="Ostiro Flow"
            label="Audio"
            body="La couche transcription : capture de voix, nettoyage du texte, export et partage rapide."
          />
        </div>
      </div>
    </section>
  );
}

function DownloadsPage() {
  return (
    <section className="section-block page-section">
      <div className="section-heading">
        <p className="eyebrow">Applications</p>
        <h1>Telechargements Ostiro Flow</h1>
        <p>
          La version web fonctionne deja. Les builds natifs sont prepares autour du meme
          produit : un enregistreur minimaliste avec transcription claire et sans superflu.
        </p>
      </div>

      <div className="download-grid">
        <DownloadCard
          icon={<MonitorDown size={24} />}
          title="Windows"
          type=".exe"
          href={`${GITHUB_URL}/releases`}
          status="Build release"
          body="Application bureau pour enregistrer, envoyer au backend Flow, corriger et copier."
        />
        <DownloadCard
          icon={<Smartphone size={24} />}
          title="Android"
          type=".apk"
          href={`${GITHUB_URL}/releases`}
          status="Build mobile"
          body="Interface mobile simple, boutons larges, import audio et transcription en ligne."
        />
        <DownloadCard
          icon={<Laptop size={24} />}
          title="Linux"
          type=".AppImage"
          href={`${GITHUB_URL}/releases`}
          status="Build desktop"
          body="Version Linux autonome pour un poste de travail sobre et efficace."
        />
      </div>

      <div className="release-note">
        <ShieldCheck size={20} />
        <p>
          Les boutons pointent vers GitHub Releases pour eviter de distribuer de faux binaires.
          Les fichiers natifs doivent etre attaches a une release avant diffusion publique.
        </p>
      </div>
    </section>
  );
}

function TranscriptStudio({ embedded = false }: { embedded?: boolean }) {
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
      setMessage("Dernier texte restaure.");
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
    setMessage("Audio pret. Lance la transcription.");
  }

  async function transcribeRecording() {
    setMessage(null);
    setPhase("transcribing");

    try {
      const audio = importedAudio ?? (await recorder.getAudioBlob());

      if (!audio || audio.size < 900) {
        throw new Error("audio-empty");
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
        throw new Error(payload?.error ?? "transcribe-failed");
      }

      const cleanText = polishTranscriptText(payload?.text ?? "");
      if (!cleanText) {
        throw new Error("empty-transcript");
      }

      setTranscript(cleanText);
      setPhase("done");
      setMessage("Transcription prete.");
    } catch (error) {
      setPhase("ready");
      setMessage(getTranscriptionErrorMessage(error));
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
    setCopyLabel("Copie");
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
    setMessage("Audio importe. Lance la transcription.");
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

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragActive(false);
    void importAudio(event.dataTransfer.files?.[0] ?? null);
  }

  return (
    <div className={`studio-grid ${embedded ? "embedded" : ""}`}>
      <section
        className={`control-panel ${phase} ${recorder.soundDetected ? "sound-active" : "sound-quiet"} ${
          dragActive ? "drag-active" : ""
        }`}
        style={{ "--level": recorder.inputLevel.toFixed(2) } as CSSProperties}
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
            <h2>Capture claire. Texte pret.</h2>
          </div>
          <span className="state-badge">{getStateText(phase)}</span>
        </div>

        <div className="recorder-stage">
          <div className="power-line">
            <span />
            {recorder.soundDetected ? "Son detecte" : "En attente de voix"}
          </div>
          <div className="recorder-orb" aria-hidden="true">
            {phase === "transcribing" ? <Loader2 size={34} /> : <Mic size={34} />}
          </div>
          <div className="wave" aria-hidden="true">
            {Array.from({ length: 24 }, (_, index) => (
              <span key={index} style={{ "--i": index } as CSSProperties} />
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
            <button className="ghost-button" type="button" onClick={() => fileInputRef.current?.click()}>
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
          {getStatusText({
            recorderError: recorder.error,
            message,
            phase,
            waitingHint,
            importedAudioName: importedAudio?.name
          })}
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
          placeholder="Votre transcription apparaitra ici. Vous pouvez corriger le texte directement avant de le copier."
          spellCheck
        />

        <div className="bottom-actions">
          <button className="ghost-button" type="button" onClick={copyTranscript} disabled={!hasText}>
            <Copy size={16} />
            {copyLabel}
          </button>
          <button className="ghost-button" type="button" onClick={downloadTranscript} disabled={!hasText}>
            <Download size={16} />
            TXT
          </button>
        </div>
      </section>
    </div>
  );
}

function HeroScene() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0.2, 7.6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const gold = new THREE.MeshStandardMaterial({
      color: 0xe7bd7a,
      metalness: 0.78,
      roughness: 0.24
    });
    const teal = new THREE.MeshStandardMaterial({
      color: 0x1ddfc7,
      emissive: 0x05534c,
      metalness: 0.42,
      roughness: 0.2
    });
    const graphite = new THREE.MeshStandardMaterial({
      color: 0x171719,
      metalness: 0.62,
      roughness: 0.3
    });

    const torusA = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.035, 18, 180), gold);
    const torusB = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.018, 18, 220), graphite);
    const torusC = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.024, 18, 160), teal);
    torusA.rotation.x = 1.12;
    torusB.rotation.x = 1.28;
    torusB.rotation.y = 0.42;
    torusC.rotation.x = 1.08;
    torusC.rotation.y = -0.5;
    group.add(torusA, torusB, torusC);

    const capsule = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.1, 32), graphite);
    stem.rotation.z = Math.PI / 2;
    capsule.add(stem);
    const leftCap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 24), gold);
    const rightCap = leftCap.clone();
    leftCap.position.x = -1.05;
    rightCap.position.x = 1.05;
    capsule.add(leftCap, rightCap);
    capsule.rotation.z = -0.05;
    group.add(capsule);

    const bars: THREE.Mesh[] = [];
    for (let index = 0; index < 36; index += 1) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.25, 0.045), index % 3 === 0 ? teal : gold);
      const x = (index - 17.5) * 0.115;
      bar.position.set(x, 0, 0.3 * Math.sin(index * 0.34));
      bars.push(bar);
      group.add(bar);
    }

    const ambient = new THREE.AmbientLight(0xffffff, 0.74);
    const key = new THREE.PointLight(0xf4c98c, 36, 20);
    key.position.set(4, 3, 5);
    const fill = new THREE.PointLight(0x20d8c0, 18, 14);
    fill.position.set(-4, -2, 4);
    scene.add(ambient, key, fill);

    const resize = () => {
      const width = Math.max(mount.clientWidth, 1);
      const height = Math.max(mount.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    let frame = 0;
    let rafId = 0;
    const animate = () => {
      frame += 0.018;
      group.rotation.y = Math.sin(frame * 0.55) * 0.34;
      group.rotation.x = -0.08 + Math.sin(frame * 0.32) * 0.05;
      torusA.rotation.z += 0.004;
      torusB.rotation.z -= 0.0026;
      torusC.rotation.z += 0.006;

      bars.forEach((bar, index) => {
        const wave = Math.sin(frame * 3.6 + index * 0.55);
        const level = 0.35 + Math.abs(wave) * 1.7;
        bar.scale.y = level;
        bar.position.y = Math.sin(frame * 1.2 + index * 0.18) * 0.08;
      });

      renderer.render(scene, camera);
      rafId = window.requestAnimationFrame(animate);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();
    animate();

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(rafId);
      mount.removeChild(renderer.domElement);
      scene.traverse((object: THREE.Object3D) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
        }
      });
      gold.dispose();
      teal.dispose();
      graphite.dispose();
      renderer.dispose();
    };
  }, []);

  return <div className="hero-scene" ref={mountRef} aria-hidden="true" />;
}

function FeatureItem({
  icon,
  title,
  children
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="feature-item">
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{children}</p>
    </article>
  );
}

function ProductCard({
  icon,
  title,
  label,
  body
}: {
  icon: ReactNode;
  title: string;
  label: string;
  body: string;
}) {
  return (
    <article className="product-card">
      <span>{icon}</span>
      <p>{label}</p>
      <h2>{title}</h2>
      <small>{body}</small>
    </article>
  );
}

function DownloadCard({
  icon,
  title,
  type,
  status,
  body,
  href
}: {
  icon: ReactNode;
  title: string;
  type: string;
  status: string;
  body: string;
  href: string;
}) {
  return (
    <article className="download-card">
      <div className="download-card-head">
        <span>{icon}</span>
        <strong>{type}</strong>
      </div>
      <h2>{title}</h2>
      <p>{body}</p>
      <div className="download-meta">
        <small>{status}</small>
        <a href={href} target="_blank" rel="noreferrer">
          <Download size={16} />
          GitHub Releases
        </a>
      </div>
    </article>
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

function Footer({ navigate }: { navigate: (path: RoutePath) => void }) {
  return (
    <footer className="site-footer">
      <div>
        <img src="/brand/ostiro-flow-icon.png" alt="" />
        <strong>Ostiro Flow</strong>
        <p>Capture audio, transcription propre, export rapide.</p>
      </div>
      <nav aria-label="Footer">
        {navItems.map((item) => (
          <a
            key={item.path}
            href={item.path}
            onClick={(event) => {
              event.preventDefault();
              navigate(item.path);
            }}
          >
            {item.label}
          </a>
        ))}
      </nav>
    </footer>
  );
}

function getPrimaryAction(phase: FlowPhase) {
  if (phase === "recording") {
    return { icon: <Square size={18} />, label: "Arreter" };
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
    return "Audio pret";
  }

  if (phase === "transcribing") {
    return "Whisper";
  }

  if (phase === "done") {
    return "Texte pret";
  }

  return "Pret";
}

function getStatusText({
  recorderError,
  message,
  phase,
  waitingHint,
  importedAudioName
}: {
  recorderError: string | null;
  message: string | null;
  phase: FlowPhase;
  waitingHint: boolean;
  importedAudioName?: string;
}) {
  if (recorderError) {
    return "Le micro n'est pas disponible. Verifie l'autorisation du navigateur.";
  }

  if (message) {
    return message;
  }

  if (phase === "transcribing" && waitingHint) {
    return "Le modele se prepare. Garde cette page ouverte.";
  }

  if (phase === "recording") {
    return "Parle normalement. L'indicateur s'allume quand la voix est detectee.";
  }

  if (importedAudioName) {
    return importedAudioName;
  }

  return "Aucun cloud obligatoire dans le navigateur.";
}

function getTranscriptionErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : "";
  const normalized = raw.toLowerCase();

  if (normalized.includes("audio-empty") || normalized.includes("empty-transcript")) {
    return "Je n'ai pas entendu assez de voix. Recommence avec le micro plus proche ou importe un audio plus clair.";
  }

  if (normalized.includes("failed to fetch") || normalized.includes("network")) {
    return "Le backend n'a pas repondu. Reessaie dans quelques secondes.";
  }

  if (normalized.includes("trop longue")) {
    return "La transcription prend trop de temps. Essaie un extrait plus court.";
  }

  return "La transcription n'a pas abouti. Reessaie avec un son plus net.";
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

function normalizePath(pathname: string): RoutePath {
  if (pathname === "/studio" || pathname === "/network" || pathname === "/telechargements") {
    return pathname;
  }

  return "/";
}

export default App;
