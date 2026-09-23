# OpenAI narration setup (AI slide captions + audio)

## 1. Get an OpenAI API key

1. Create or open an account at [https://platform.openai.com](https://platform.openai.com).
2. **API keys → Create new secret key** — copy it (`sk-…`). You won't be able to see it again after leaving the page.
3. Make sure the account/org has billing enabled — Vision (captioning) and TTS (narration audio) calls are pay-as-you-go, not part of any free tier.

## 2. Server `.env` (`backend/.env` on VPS — PM2 runs from `backend/`; project-root `.env` for Docker, since `docker-compose.yml`'s `api` service reads `env_file: .env` at the repo root)

```env
OPENAI_API_KEY=sk-xxxxxxxx
```

Optional tuning (defaults shown — see `.env.example` for full descriptions of each):

```env
OPENAI_VISION_MODEL=gpt-4o-mini
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=alloy
NARRATION_LANGUAGES=en,es
NARRATION_CONCURRENCY=4
```

Never commit the real `.env` — it's gitignored; `.env.example` at the repo root is the checked-in template.

Restart after changing:

```bash
cd backend && npm run build
pm2 restart abc-api
# or, for Docker: docker compose restart api
```

## 3. Verify it's picked up

With no `OPENAI_API_KEY` set, narration silently no-ops — courses still work, slides just have no AI captions/audio, and admin can still type captions by hand. To confirm the key registered:

1. Admin → Courses → edit a course that already has a PDF/PPTX uploaded and rendered.
2. The narration panel should show live generation progress (or "ready") instead of the amber "AI narration is not configured on this server" banner.

## 4. Flow

1. Admin uploads a PDF/PPTX and saves the course.
2. The server renders it to page images, then — in the background, independent of the admin's browser — calls OpenAI's Vision API for a narration script per page in each language configured in `NARRATION_LANGUAGES` (length scales with how detailed the slide is: brief ≈ 2 sentences, standard ≈ 3–5, dense slides ≈ 8–14), then TTS for the matching audio.
3. Progress is visible live under Admin → Courses → edit → the narration panel; it keeps running even if the admin closes the dialog, and resumes automatically after a server restart.
4. Admin can hand-edit any page's caption — saving regenerates just that page+language's audio.
5. Learners see the caption and hear the matching-language audio as each slide opens, in whichever language the site UI is currently set to.

## 5. Cost / throughput

`NARRATION_CONCURRENCY` in `.env.example` documents rough timing guidance for large PDFs and how to tune it against your OpenAI account's rate limits.
