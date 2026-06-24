import { useCallback, useMemo, useRef, useState } from "react";
import type { TranscriptSegment } from "../types";
import { cleanTranscriptText } from "../utils/formatTranscript";

function getRecognitionConstructor() {
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function useSpeechTranscript() {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldListenRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);
  const lastFinalRef = useRef("");
  const baseTimeRef = useRef<number | null>(null);

  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [interim, setInterim] = useState("");
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supported = useMemo(() => getRecognitionConstructor() !== null, []);

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const startRecognition = useCallback(
    (language: string) => {
      const Recognition = getRecognitionConstructor();
      if (!Recognition) {
        setError("Transcription live indisponible dans ce navigateur.");
        return false;
      }

      baseTimeRef.current ??= performance.now();
      clearRestartTimer();
      recognitionRef.current?.abort();

      const recognition = new Recognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setListening(true);
        setError(null);
      };

      recognition.onresult = (event) => {
        let interimText = "";

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const alternative = result[0];
          const text = cleanTranscriptText(alternative.transcript);

          if (!text) {
            continue;
          }

          if (result.isFinal) {
            if (text === lastFinalRef.current) {
              continue;
            }

            lastFinalRef.current = text;
            setSegments((current) => [
              ...current,
              {
                id: crypto.randomUUID(),
                text,
                timestampMs: performance.now() - (baseTimeRef.current ?? performance.now()),
                confidence: alternative.confidence
              }
            ]);
          } else {
            interimText = `${interimText} ${text}`.trim();
          }
        }

        setInterim(interimText);
      };

      recognition.onerror = (event) => {
        if (event.error === "no-speech" || event.error === "aborted") {
          return;
        }
        setError(event.message || event.error);
      };

      recognition.onend = () => {
        setListening(false);
        setInterim("");

        if (shouldListenRef.current) {
          restartTimerRef.current = window.setTimeout(() => {
            startRecognition(language);
          }, 400);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      return true;
    },
    [clearRestartTimer]
  );

  const start = useCallback(
    (language: string) => {
      shouldListenRef.current = true;
      return startRecognition(language);
    },
    [startRecognition]
  );

  const stop = useCallback(() => {
    shouldListenRef.current = false;
    clearRestartTimer();
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
    setInterim("");
  }, [clearRestartTimer]);

  const pause = useCallback(() => {
    shouldListenRef.current = false;
    clearRestartTimer();
    recognitionRef.current?.stop();
    setListening(false);
  }, [clearRestartTimer]);

  const clear = useCallback(() => {
    setSegments([]);
    setInterim("");
    lastFinalRef.current = "";
    baseTimeRef.current = null;
  }, []);

  const removeLastSegment = useCallback(() => {
    setSegments((current) => current.slice(0, -1));
  }, []);

  return {
    supported,
    segments,
    interim,
    listening,
    error,
    start,
    stop,
    pause,
    clear,
    removeLastSegment
  };
}
