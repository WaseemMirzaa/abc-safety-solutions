import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
// ffmpeg-static ships a pre-built binary — no system ffmpeg needed (same package
// upload/video-process.util.ts already depends on for video transcoding).
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const ffmpegPath: string = require('ffmpeg-static') as string

const execFileAsync = promisify(execFile)

/**
 * Downscales + recompresses a rendered slide PNG to a JPEG data URL sized for vision
 * input. LibreOffice/poppler page renders are commonly several MB at high DPI — sending
 * that raw both inflates the request payload (~33% from base64 alone) and image-token
 * cost (cost scales with resolution). 1536px on the long edge is comfortably enough
 * resolution for a model to read slide text/diagrams accurately.
 */
export async function imageFileToVisionDataUrl(filePath: string): Promise<string> {
  const { stdout } = await execFileAsync(
    ffmpegPath,
    [
      '-y',
      '-i', filePath,
      // Scale only if wider than 1536px; never upscale. -2 keeps height even (yuv420p requirement).
      '-vf', "scale='min(1536,iw)':-2",
      '-q:v', '3',
      '-f', 'image2',
      'pipe:1',
    ],
    { maxBuffer: 32 * 1024 * 1024, timeout: 60_000, encoding: 'buffer' as BufferEncoding },
  )
  const buffer = stdout as unknown as Buffer
  return `data:image/jpeg;base64,${buffer.toString('base64')}`
}
