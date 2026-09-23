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
  /** How dense the slide content is — drives caption length (and thus TTS length). */
  detailLevel: NarrationDetailLevel
  texts: Record<string, string>
}

export type NarrationAudioResult = {
  audioUrl: string
  durationSec: number
}

export type NarrationDetailLevel = 'title' | 'brief' | 'standard' | 'detailed'

/**
 * Soft ceilings per content density (~2.5 words/sec spoken).
 * OpenAI Structured Outputs (strict mode) does not support minLength/maxLength on
 * string properties, so length is enforced in code after the model responds.
 *
 * - title: section divider / heading only (~few seconds)
 * - brief: light slide, few bullets (~15s)
 * - standard: normal instructional page (~30–40s)
 * - detailed: dense text, multi-bullet, diagrams with callouts (~60–75s)
 */
const CAPTION_CHAR_LIMITS: Record<NarrationDetailLevel, number> = {
  title: 60,
  brief: 280,
  standard: 560,
  detailed: 1100,
}

/** Default when detailLevel is missing/unknown. */
const DEFAULT_CAPTION_CHARS = CAPTION_CHAR_LIMITS.standard
/** A titleOnly=true page's spoken text should be a short heading, never a full sentence —
 *  used as a code-level backstop against the model mis-flagging a real content page. */
const TITLE_ONLY_MAX_CHARS = CAPTION_CHAR_LIMITS.title

export function capNarrationText(raw: string, maxChars = DEFAULT_CAPTION_CHARS): string {
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

function parseDetailLevel(raw: unknown, titleOnlyFlag: boolean, longestText: number): NarrationDetailLevel {
  const allowed: NarrationDetailLevel[] = ['title', 'brief', 'standard', 'detailed']
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  let level = (allowed.includes(value as NarrationDetailLevel) ? value : 'standard') as NarrationDetailLevel
  // Safety: don't trust titleOnly / title when the model actually wrote a long explanation.
  if ((titleOnlyFlag || level === 'title') && longestText > TITLE_ONLY_MAX_CHARS) {
    level = longestText > CAPTION_CHAR_LIMITS.standard ? 'detailed' : 'standard'
  }
  if (titleOnlyFlag && longestText <= TITLE_ONLY_MAX_CHARS) return 'title'
  return level
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
        detailLevel: {
          type: 'string',
          enum: ['title', 'brief', 'standard', 'detailed'],
          description:
            'How much instructional content is on the slide. Use "detailed" when there are long ' +
            'paragraphs, many bullets, tables, multi-step procedures, or dense diagrams that need ' +
            'a thorough spoken explanation. Use "brief" for a light slide with little text. ' +
            'Use "standard" for a typical training page. Use "title" only for section dividers.',
        },
        texts: {
          type: 'object',
          additionalProperties: false,
          properties: langProperties,
          required: languages,
        },
      },
      required: ['titleOnly', 'detailLevel', 'texts'],
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
                  'You write spoken narration scripts for workplace safety e-learning slides. ' +
                  'Look carefully at how much text and instructional content is on the image, then ' +
                  'set detailLevel and write matching-length narration for EVERY target language.\n\n' +
                  'Length rules (apply the SAME depth in each language — do not shorten one language):\n' +
                  '- title: section divider / heading only → a few spoken words (the title).\n' +
                  '- brief: little text (1–3 short bullets or a simple graphic) → 2 short sentences.\n' +
                  '- standard: normal training page → 3–5 clear sentences covering the main points.\n' +
                  '- detailed: long paragraphs, many bullets, tables, multi-step procedures, or dense ' +
                  'diagrams → a thorough explanation (about 8–14 sentences). Walk through the key ' +
                  'points in order, explain what learners must remember, and do NOT compress away ' +
                  'important requirements, warnings, or steps that appear on the slide.\n\n' +
                  'Write each language independently as if composed natively in it; do NOT produce a ' +
                  "literal translation of another language's text. Prefer clarity for audio narration " +
                  '(complete sentences, natural spoken flow). Every language must get real, non-empty ' +
                  'text — never leave a language blank. If titleOnly=true, detailLevel must be "title" ' +
                  'and each language is just the spoken title (a few words), not padded sentences.',
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text:
                      `Write narration for this slide. Target languages: ${languages.join(', ')}. ` +
                      'Match explanation length to how detailed the slide content is.',
                  },
                  { type: 'image_url', image_url: { url: dataUrl } },
                ],
              },
            ],
            response_format: {
              type: 'json_schema',
              json_schema: { name: 'slide_caption', strict: true, schema },
            },
            // Bilingual detailed captions need more headroom than short 2–3 sentence ones.
            max_tokens: 2800,
          })

          const raw = completion.choices[0]?.message?.content
          if (!raw) throw new Error('OpenAI returned an empty caption response')

          let parsed: {
            titleOnly?: boolean
            detailLevel?: string
            texts?: Record<string, string>
          }
          try {
            parsed = JSON.parse(raw) as typeof parsed
          } catch {
            throw new Error('OpenAI returned malformed JSON for slide caption')
          }

          const longestRaw = Math.max(
            0,
            ...languages.map((lang) => String(parsed.texts?.[lang] ?? '').trim().length),
          )
          const detailLevel = parseDetailLevel(parsed.detailLevel, Boolean(parsed.titleOnly), longestRaw)
          const maxChars = CAPTION_CHAR_LIMITS[detailLevel]

          const texts: Record<string, string> = {}
          for (const lang of languages) {
            texts[lang] = capNarrationText(String(parsed.texts?.[lang] ?? ''), maxChars)
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
          const titleOnly = detailLevel === 'title' && longestText <= TITLE_ONLY_MAX_CHARS

          return { titleOnly, detailLevel, texts }
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
