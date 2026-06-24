# Ostiro Flow

Application locale de capture audio et transcription longue durée.

## Lancer le projet

```bash
npm install
python -m pip install -r server/requirements.txt
npm run dev
```

Interface : http://127.0.0.1:5173/

API locale : http://127.0.0.1:8787/api/health

## Transcription locale

Ostiro Flow utilise `faster-whisper` côté serveur local. Aucun appel API OpenAI n'est nécessaire.

Options utiles dans `.env.local` :

```bash
OSTIRO_WHISPER_MODEL=base
OSTIRO_WHISPER_DEVICE=cpu
OSTIRO_WHISPER_COMPUTE_TYPE=int8
```
