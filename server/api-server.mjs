import "dotenv/config";
import express from "express";
import multer from "multer";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { unlink } from "node:fs/promises";

const PORT = Number(process.env.PORT ?? process.env.OSTIRO_API_PORT ?? 8787);
const HOST = process.env.HOST ?? (process.env.PORT ? "0.0.0.0" : "127.0.0.1");
const MAX_AUDIO_SIZE = 512 * 1024 * 1024;
const TRANSCRIPTION_TIMEOUT_MS = Number(
  process.env.OSTIRO_TRANSCRIPTION_TIMEOUT_MS ?? 2 * 60 * 60 * 1000
);
const DIST_DIR = path.join(process.cwd(), "dist");
const upload = multer({
  dest: path.join(os.tmpdir(), "ostiro-flow"),
  limits: { fileSize: MAX_AUDIO_SIZE }
});

const app = express();

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    provider: "local-whisper",
    model: process.env.OSTIRO_WHISPER_MODEL ?? "base"
  });
});

app.post("/api/transcribe", upload.single("audio"), async (request, response) => {
  if (!request.file) {
    response.status(400).json({ error: "Aucun fichier audio recu." });
    return;
  }

  try {
    const result = await transcribeLocally(
      request.file.path,
      String(request.body.language ?? "fr")
    );
    response.json(result);
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : "Transcription locale impossible."
    });
  } finally {
    await cleanupUpload(request.file);
  }
});

app.use(express.static(DIST_DIR));

app.get("*", (_request, response) => {
  response.sendFile(path.join(DIST_DIR, "index.html"));
});

app.use((error, _request, response, next) => {
  void next;

  if (error?.code === "LIMIT_FILE_SIZE") {
    response.status(413).json({
      error: "Audio trop lourd pour cette session locale."
    });
    return;
  }

  response.status(500).json({ error: "Erreur serveur de transcription." });
});

app.listen(PORT, HOST, () => {
  console.log(`Ostiro Flow listening on http://${HOST}:${PORT}`);
});

function transcribeLocally(audioPath, language) {
  const scriptPath = path.join(process.cwd(), "server", "local_transcribe.py");
  const pythonBinary = process.env.PYTHON_BIN ?? "python";

  return new Promise((resolve, reject) => {
    const child = spawn(pythonBinary, [scriptPath, audioPath], {
      env: {
        ...process.env,
        OSTIRO_TRANSCRIBE_LANGUAGE: language
      },
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Transcription locale trop longue."));
    }, TRANSCRIPTION_TIMEOUT_MS);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(new Error(`Python indisponible: ${error.message}`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);

      if (code !== 0) {
        reject(new Error(cleanError(stderr) || "Whisper local a echoue."));
        return;
      }

      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error("Reponse Whisper illisible."));
      }
    });
  });
}

async function cleanupUpload(file) {
  if (!file?.path) {
    return;
  }

  await unlink(file.path).catch(() => undefined);
}

function cleanError(value) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-3)
    .join(" ");
}
