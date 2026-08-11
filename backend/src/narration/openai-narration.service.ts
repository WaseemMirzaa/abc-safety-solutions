import { Injectable, Logger } from '@nestjs/common'
import OpenAI from 'openai'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { withRetries } from '../common/retry.util'
import { imageFileToVisionDataUrl } from './narration-media.util'
import { probeVideoDurationSec } from '../upload/video-process.util'
import { uploadDir, uploadUrlForFile } from '../upload/upload-storage'
import { NarrationRateLimiterService } from './narration-rate-limiter.service'

export type NarrationTextResult = {
  titleOnly: boolean
  texts: Record<string, string>
}

export type NarrationAudioResult = {
  audioUrl: string
  durationSec: number
}

/** ~15s of natural speech at ~2.5 words/sec — ties the cap to LEARNER_SLIDE_DWELL_SEC
 *  instead of an arbitrary "2-3 lines" nobody can verify against the actual data.
 *  OpenAI Structured Outputs (strict mode) does not support minLength/maxLength on
 *  string properties, so this is enforced in code, not the JSON schema. */
const MAX_CAPTION_CHARS = 240
/** A titleOnly=true page's spoken text should be a short heading, never a full sentence —
 *  used as a code-level backstop against the model mis-flagging a real content page. */
const TITLE_ONLY_MAX_CHARS = 60

export function capNarrationText(raw: string, maxChars = MAX_CAPTION_CHARS): string {
  const text = (raw ?? '').trim().replace(/\s+/g, ' ')
  if (text.length <= maxChars) return text
  const truncated = text.slice(0, maxChars)
  const lastBreak = Math.max(
    truncated.lastIndexOf('. '),
    truncated.lastIndexOf('? '),
    truncated.lastIndexOf('! '),
  )
  const cut = lastBreak > maxChars * 0.4 ? truncated.slice(0, lastBreak + 1) : truncated
  return cut.trim()
}

@Injectable()
export class OpenAiNarrationService {
  private readonly log = new Logger(OpenAiNarrationService.name)
  private client: OpenAI | null = null

  constructor(private readonly limiter: NarrationRateLimiterService) {}

  isEnabled(): boolean {
    return Boolean(process.env.OPENAI_API_KEY)
  }

  private getClient(): OpenAI {
    if (!this.client) {
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) throw new Error('OPENAI_API_KEY is not set — AI narration is disabled.')
      // maxRetries: 0 — all retry/backoff goes through common/retry.util.ts so behaviour
      // (attempts, delay, what counts as retryable) is consistent and doesn't double-stack.
      this.client = new OpenAI({ apiKey, maxRetries: 0 })
    }
    return this.client
  }

  private visionModel(): string {
    return process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini'
  }

  private ttsModel(): string {
    return process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts'
  }

  private ttsVoice(): string {
    return process.env.OPENAI_TTS_VOICE || 'alloy'
  }

  /**
   * Vision + structured output: one call captions the page in every target language at
   * once (cheaper and keeps languages grounded in the same visual read than N separate
   * calls would, at the cost of a mild translation-ese risk the prompt explicitly guards
   * against by asking for independently-composed text per language).
   */
  async describeSlideImage(imagePath: string, languages: string[]): Promise<NarrationTextResult> {
    const dataUrl = await imageFileToVisionDataUrl(imagePath)
    const client = this.getClient()

    // Strict-mode Structured Outputs requires every property in `required` — there is no
    // "optional key" concept, so texts.<lang> is always a string (short when titleOnly).
    const langProperties: Record<string, unknown> = {}
    for (const lang of languages) {
      langProperties[lang] = { type: 'string', description: `Caption text in language "${lang}"` }
    }

    const schema = {
      type: 'object',
      additionalProperties: false,
      properties: {
        titleOnly: {
          type: 'boolean',
          description:
            'true ONLY if the page contains solely a heading/title/section-divider with no body ' +
            'paragraphs, bullet content, diagram callouts, or instructional text requiring explanation.',
        },
        texts: {
          type: 'object',
          additionalProperties: false,
          properties: langProperties,
          required: languages,
        },
      },
      required: ['titleOnly', 'texts'],
    }

    return withRetries(
      // The rate-limiter acquisition happens INSIDE each retry attempt, not around the
      // whole withRetries call — holding a concurrency slot through backoff sleeps (which
      // do no network work) would starve other pages' work of slots for no reason during
      // exactly the condition (429s) this retry logic exists to handle.
      () =>
        this.limiter.run(async () => {
          const completion = await client.chat.completions.create({
            model: this.visionModel(),
            messages: [
              {
                role: 'system',
                content:
                  'You caption training-course slide images for a workplace safety e-learning platform. ' +
                  'For each requested language, write 2-3 short, natural sentences describing what the ' +
                  'learner should take away from this slide — write each language independently as if ' +
                  "composed natively in it; do NOT produce a literal translation of another language's text. " +
                  'If, and only if, the slide is a section-divider containing nothing but a title/heading ' +
                  "with no body content, set titleOnly=true and make each language's text just that title " +
                  'spoken naturally (a few words) — do not pad it into full sentences. Every language must ' +
                  'get real, non-empty text — never leave a language blank.',
              },
              {
                role: 'user',
                content: [
                  { type: 'text', text: `Caption this slide. Target languages: ${languages.join(', ')}.` },
                  { type: 'image_url', image_url: { url: dataUrl } },
                ],
              },
            ],
            response_format: {
              type: 'json_schema',
              json_schema: { name: 'slide_caption', strict: true, schema },
            },
            max_tokens: 900,
          })

          const raw = completion.choices[0]?.message?.content
          if (!raw) throw new Error('OpenAI returned an empty caption response')

          let parsed: { titleOnly?: boolean; texts?: Record<string, string> }
          try {
            parsed = JSON.parse(raw) as typeof parsed
          } catch {
            throw new Error('OpenAI returned malformed JSON for slide caption')
          }

          const texts: Record<string, string> = {}
          for (const lang of languages) {
            texts[lang] = capNarrationText(String(parsed.texts?.[lang] ?? ''))
          }

          // Strict-mode schema can't enforce minLength, so an empty string per language is
          // structurally valid — without this check it would persist as "success" and the
          // page would sit in 'pending' forever (never 'ready', never retried as 'failed').
          // Throwing here makes it a real retryable failure like any other, consistent with
          // setManualText's equivalent guard on the admin hand-edit path.
          const emptyLangs = languages.filter((lang) => !texts[lang])
          if (emptyLangs.length) {
            throw new Error(`OpenAI returned empty caption text for: ${emptyLangs.join(', ')}`)
          }

          // Safety backstop: a false titleOnly=true silently drops real instructional content
          // (the failure mode that actually matters for a compliance course), so only trust
          // the model's flag when the text it produced is actually short — otherwise treat it
          // as a full content page. The reverse (long text on a real title page) just reads a
          // few extra words aloud — safe direction to err in.
          const longestText = Math.max(0, ...Object.values(texts).map((t) => t.length))
          const titleOnly = Boolean(parsed.titleOnly) && longestText <= TITLE_ONLY_MAX_CHARS

          return { titleOnly, texts }
        }),
      {
        attempts: 4,
        delayMs: 1200,
        onRetry: (err, attempt) =>
          this.log.warn(`describeSlideImage retry ${attempt + 1}: ${err instanceof Error ? err.message : String(err)}`),
      },
    )
  }

  /** TTS for one page's text in one language. Saved alongside other uploads (/uploads/*). */
  async synthesizeSpeech(text: string, _lang: string): Promise<NarrationAudioResult> {
    const client = this.getClient()
    // Same limiter-inside-retry ordering as describeSlideImage — see the comment there.
    const speech = await withRetries(
      () =>
        this.limiter.run(() =>
          client.audio.speech.create({
            model: this.ttsModel(),
            // Same voice for every language of a given page — narration-persona consistency.
            voice: this.ttsVoice(),
            input: text,
            response_format: 'mp3',
          }),
        ),
      {
        attempts: 4,
        delayMs: 1200,
        onRetry: (err, attempt) =>
          this.log.warn(`synthesizeSpeech retry ${attempt + 1}: ${err instanceof Error ? err.message : String(err)}`),
      },
    )
    const buffer = Buffer.from(await speech.arrayBuffer())
    const filename = `${randomUUID()}.mp3`
    const filePath = join(uploadDir(), filename)
    await writeFile(filePath, buffer)
    const durationSec = Math.round((await probeVideoDurationSec(filePath)) || 0)
    return { audioUrl: uploadUrlForFile(filename), durationSec }
  }
}
