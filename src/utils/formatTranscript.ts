import type { TranscriptMode, TranscriptSegment } from "../types";

export function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatBytes(bytes: number) {
  if (!bytes) {
    return "0 Mo";
  }

  const units = ["octets", "Ko", "Mo", "Go"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;

  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function cleanTranscriptText(input: string) {
  return input
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,.;:!?])([^\s])/g, "$1 $2")
    .replace(/\bostiro\s+flow\b/gi, "Ostiro Flow")
    .replace(/\bopen\s*ai\b/gi, "OpenAI")
    .replace(/(^|[.!?]\s+)([a-zà-ÿ])/g, (_, prefix: string, letter: string) =>
      `${prefix}${letter.toUpperCase()}`
    )
    .trim();
}

export function polishTranscriptText(input: string) {
  const clean = cleanTranscriptText(input);
  const sentences = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g);

  if (!sentences || sentences.length < 5) {
    return clean;
  }

  const paragraphs: string[] = [];
  for (let index = 0; index < sentences.length; index += 4) {
    paragraphs.push(sentences.slice(index, index + 4).join(" ").trim());
  }

  return paragraphs.join("\n\n");
}

function timestamp(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function buildTranscript(
  segments: TranscriptSegment[],
  mode: TranscriptMode,
  interim = ""
) {
  const lines = segments.map((segment, index) => {
    const clean = cleanTranscriptText(segment.text);
    if (mode === "timestamped") {
      return `[${timestamp(segment.timestampMs)}] ${clean}`;
    }

    const previous = segments[index - 1];
    const shouldBreak = previous && segment.timestampMs - previous.timestampMs > 28_000;
    return `${shouldBreak ? "\n" : ""}${clean}`;
  });

  const transcript = lines.join(mode === "timestamped" ? "\n" : " ");
  const cleanedInterim = cleanTranscriptText(interim);

  if (!cleanedInterim) {
    return transcript.trim();
  }

  return `${transcript.trim()}${transcript ? "\n\n" : ""}${cleanedInterim}`.trim();
}

export function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function averageConfidence(segments: TranscriptSegment[]) {
  const values = segments
    .map((segment) => segment.confidence)
    .filter((confidence): confidence is number => typeof confidence === "number" && confidence > 0);

  if (!values.length) {
    return null;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function downloadTextFile(filename: string, content: string, type = "text/plain") {
  const blob = new Blob([content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
