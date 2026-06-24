export type RecorderState = "idle" | "recording" | "paused" | "stopped";

export type TranscriptSegment = {
  id: string;
  text: string;
  timestampMs: number;
  confidence?: number;
};

export type TranscriptMode = "clean" | "timestamped";

export type SessionSnapshot = {
  title: string;
  language: string;
  transcript: string;
  durationMs: number;
  recordedAt: string;
};
