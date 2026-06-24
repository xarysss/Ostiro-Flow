import { useCallback, useEffect, useRef, useState } from "react";
import type { RecorderState } from "../types";
import { clearAudioSession, getAudioChunks, saveAudioChunk } from "../utils/audioStore";

const CHUNK_INTERVAL_MS = 30_000;
const AUDIO_BITS_PER_SECOND = 32_000;

function createSessionId() {
  return `flow-${Date.now()}-${crypto.randomUUID()}`;
}

function pickMimeType() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus"
  ];

  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? "";
}

export function useLongRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [durationMs, setDurationMs] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioSize, setAudioSize] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [chunkCount, setChunkCount] = useState(0);
  const [inputLevel, setInputLevel] = useState(0);
  const [soundDetected, setSoundDetected] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const levelFrameRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const sequenceRef = useRef(0);
  const sessionIdRef = useRef(createSessionId());
  const stateRef = useRef<RecorderState>("idle");
  const lastTickRef = useRef<number | null>(null);
  const durationRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const mimeTypeRef = useRef("");
  const finalizeOnStopRef = useRef(true);
  const stopResolverRef = useRef<(() => void) | null>(null);

  const setRecorderState = useCallback((nextState: RecorderState) => {
    stateRef.current = nextState;
    setState(nextState);
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current && !wakeLockRef.current.released) {
      await wakeLockRef.current.release().catch(() => undefined);
    }
    wakeLockRef.current = null;
  }, []);

  const stopLevelMonitor = useCallback(() => {
    if (levelFrameRef.current) {
      window.cancelAnimationFrame(levelFrameRef.current);
      levelFrameRef.current = null;
    }

    void audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
    analyserRef.current = null;
    setInputLevel(0);
    setSoundDetected(false);
  }, []);

  const startLevelMonitor = useCallback((stream: MediaStream) => {
    stopLevelMonitor();

    const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextConstructor) {
      return;
    }

    const audioContext = new AudioContextConstructor();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.72;
    audioContext.createMediaStreamSource(stream).connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const value of data) {
        const centered = (value - 128) / 128;
        sum += centered * centered;
      }

      const rms = Math.sqrt(sum / data.length);
      const normalized = Math.min(1, rms * 7);
      setInputLevel(normalized);
      setSoundDetected(normalized > 0.09);
      levelFrameRef.current = window.requestAnimationFrame(tick);
    };

    tick();
  }, [stopLevelMonitor]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    lastTickRef.current = null;
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    lastTickRef.current = performance.now();
    timerRef.current = window.setInterval(() => {
      if (stateRef.current !== "recording") {
        lastTickRef.current = performance.now();
        return;
      }

      const now = performance.now();
      const lastTick = lastTickRef.current ?? now;
      durationRef.current += now - lastTick;
      lastTickRef.current = now;
      setDurationMs(durationRef.current);
    }, 500);
  }, [stopTimer]);

  const getAudioBlob = useCallback(async () => {
    const storedChunks = await getAudioChunks(sessionIdRef.current).catch(() => []);
    const chunks = storedChunks.length ? storedChunks : chunksRef.current;

    if (!chunks.length) {
      return null;
    }

    return new Blob(chunks, {
      type: mimeTypeRef.current || chunks[0].type || "audio/webm"
    });
  }, []);

  const finalizeAudio = useCallback(async () => {
    const blob = await getAudioBlob();

    if (!blob) {
      return;
    }

    const url = URL.createObjectURL(blob);
    setAudioUrl((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous);
      }
      return url;
    });
    setAudioSize(blob.size);
  }, [getAudioBlob]);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Enregistrement audio indisponible dans ce navigateur.");
      return false;
    }

    try {
      setError(null);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }

      await clearAudioSession(sessionIdRef.current).catch(() => undefined);
      sessionIdRef.current = createSessionId();
      finalizeOnStopRef.current = true;
      chunksRef.current = [];
      sequenceRef.current = 0;
      durationRef.current = 0;
      setDurationMs(0);
      setAudioSize(0);
      setChunkCount(0);
      setInputLevel(0);
      setSoundDetected(false);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const mimeType = pickMimeType();
      mimeTypeRef.current = mimeType;
      streamRef.current = stream;
      startLevelMonitor(stream);

      const recorderOptions: MediaRecorderOptions = {
        audioBitsPerSecond: AUDIO_BITS_PER_SECOND
      };
      if (mimeType) {
        recorderOptions.mimeType = mimeType;
      }

      const recorder = new MediaRecorder(stream, recorderOptions);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (!event.data.size) {
          return;
        }

        const sequence = sequenceRef.current;
        sequenceRef.current += 1;
        chunksRef.current.push(event.data);
        setChunkCount(sequenceRef.current);
        setAudioSize((current) => current + event.data.size);

        void saveAudioChunk({
          sessionId: sessionIdRef.current,
          sequence,
          createdAt: Date.now(),
          blob: event.data
        }).catch(() => undefined);
      };

      recorder.onstop = () => {
        if (finalizeOnStopRef.current) {
          void finalizeAudio().finally(() => {
            stopResolverRef.current?.();
            stopResolverRef.current = null;
          });
        } else {
          stopResolverRef.current?.();
          stopResolverRef.current = null;
        }
      };

      recorder.start(CHUNK_INTERVAL_MS);
      setRecorderState("recording");
      startTimer();

      if (navigator.wakeLock?.request) {
        wakeLockRef.current = await navigator.wakeLock.request("screen").catch(() => null);
      }

      return true;
    } catch (captureError) {
      const message =
        captureError instanceof Error
          ? captureError.message
          : "Impossible d'activer le micro.";
      setError(message);
      setRecorderState("idle");
      stopTimer();
      stopLevelMonitor();
      return false;
    }
  }, [audioUrl, finalizeAudio, setRecorderState, startLevelMonitor, startTimer, stopLevelMonitor, stopTimer]);

  const pause = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.pause();
      setRecorderState("paused");
    }
  }, [setRecorderState]);

  const resume = useCallback(() => {
    if (recorderRef.current?.state === "paused") {
      recorderRef.current.resume();
      lastTickRef.current = performance.now();
      setRecorderState("recording");
    }
  }, [setRecorderState]);

  const stop = useCallback(async (finalize = true) => {
    finalizeOnStopRef.current = finalize;
    const recorder = recorderRef.current;
    let stopped = Promise.resolve();

    if (recorder && recorder.state !== "inactive") {
      stopped = new Promise<void>((resolve) => {
        stopResolverRef.current = resolve;
      });
      recorder.requestData();
      recorder.stop();
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    setRecorderState("stopped");
    stopTimer();
    stopLevelMonitor();
    await releaseWakeLock();
    await stopped;
  }, [releaseWakeLock, setRecorderState, stopLevelMonitor, stopTimer]);

  const reset = useCallback(async () => {
    await stop(false);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    await clearAudioSession(sessionIdRef.current).catch(() => undefined);
    chunksRef.current = [];
    sequenceRef.current = 0;
    sessionIdRef.current = createSessionId();
    durationRef.current = 0;
    setDurationMs(0);
    setAudioUrl(null);
    setAudioSize(0);
    setChunkCount(0);
    setError(null);
    setRecorderState("idle");
    finalizeOnStopRef.current = true;
  }, [audioUrl, setRecorderState, stop]);

  const downloadAudio = useCallback(async () => {
    const blob = await getAudioBlob();
    if (!blob) {
      return;
    }

    const extension = blob.type.includes("mp4") ? "m4a" : "webm";
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ostiro-flow-${new Date().toISOString().slice(0, 10)}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  }, [getAudioBlob]);

  useEffect(() => {
    return () => {
      stopTimer();
      void releaseWakeLock();
    streamRef.current?.getTracks().forEach((track) => track.stop());
      stopLevelMonitor();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl, releaseWakeLock, stopLevelMonitor, stopTimer]);

  return {
    state,
    durationMs,
    audioUrl,
    audioSize,
    chunkCount,
    inputLevel,
    soundDetected,
    error,
    start,
    pause,
    resume,
    stop,
    reset,
    downloadAudio,
    getAudioBlob
  };
}
