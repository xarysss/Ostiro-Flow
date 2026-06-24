import json
import os
import sys

from faster_whisper import WhisperModel


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")

    if len(sys.argv) < 2:
        print("Audio path is required.", file=sys.stderr)
        return 1

    audio_path = sys.argv[1]
    model_name = os.getenv("OSTIRO_WHISPER_MODEL", "base")
    device = os.getenv("OSTIRO_WHISPER_DEVICE", "cpu")
    compute_type = os.getenv("OSTIRO_WHISPER_COMPUTE_TYPE", "int8")
    language = os.getenv("OSTIRO_TRANSCRIBE_LANGUAGE", "fr") or None
    initial_prompt = os.getenv(
        "OSTIRO_WHISPER_PROMPT",
        "Transcription en francais propre. Le produit s'appelle Ostiro Flow.",
    )

    model = WhisperModel(model_name, device=device, compute_type=compute_type)
    segments, info = model.transcribe(
        audio_path,
        beam_size=5,
        condition_on_previous_text=True,
        initial_prompt=initial_prompt,
        language=language,
        vad_filter=True,
    )

    text = " ".join(segment.text.strip() for segment in segments if segment.text.strip())
    print(
        json.dumps(
            {
                "text": text.strip(),
                "language": info.language,
                "duration": info.duration,
                "model": model_name,
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
