import { execFile, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { unlink } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { promisify } from 'node:util'
// ffmpeg-static and @ffprobe-installer ship pre-built binaries — no system ffmpeg needed.
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const ffmpegPath: string = require('ffmpeg-static') as string
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const ffprobePath: string = (require('@ffprobe-installer/ffprobe') as { path: string }).path

if (!ffmpegPath) throw new Error('ffmpeg-static: binary path not resolved')
if (!ffprobePath) throw new Error('@ffprobe-installer/ffprobe: binary path not resolved')

const execFileAsync = promisify(execFile)

/** Formats browsers cannot play natively in HTML5 video. */
const TRANSCODE_EXTS = new Set(['.wmv', '.avi', '.mkv', '.flv'])

export function needsBrowserTranscode(filename: string): boolean {
  return TRANSCODE_EXTS.has(extname(filename).toLowerCase())
}

export async function probeVideoDurationSec(filePath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync(
      ffprobePath,
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        filePath,
      ],
      { timeout: 120_000 },
    )
    const sec = parseFloat(String(stdout).trim())
    return Number.isFinite(sec) && sec > 0 ? sec : 0
  } catch {
    return 0
  }
}

export function transcodeVideoToMp4(
  inputPath: string,
  outputPath: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      '-y', '-i', inputPath,
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
      '-c:a', 'aac', '-movflags', '+faststart',
      '-progress', 'pipe:1',
      outputPath,
    ]
    const proc = spawn(ffmpegPath, args)
    let totalSec = 0
    let stderrTail = ''

    proc.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      stderrTail = (stderrTail + text).slice(-300)
      // Parse duration from stderr: "Duration: HH:MM:SS.xx"
      if (totalSec === 0) {
        const m = text.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/)
        if (m) {
          totalSec = parseInt(m[1], 10) * 3600 + parseInt(m[2], 10) * 60 + parseFloat(m[3])
        }
      }
    })

    proc.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      // Parse out_time_us from -progress pipe:1 output
      const m = text.match(/out_time_us=(\d+)/)
      if (m && totalSec > 0) {
        const currentSec = parseInt(m[1], 10) / 1_000_000
        onProgress?.(Math.min(99, Math.round((currentSec / totalSec) * 100)))
      }
    })

    proc.on('close', (code) => {
      if (code === 0) {
        onProgress?.(100)
        resolve()
      } else {
        reject(new Error(`ffmpeg exited with code ${code ?? 'null'}. stderr: ${stderrTail}`))
      }
    })

    proc.on('error', (err) => reject(err))
  })
}

/** Convert WMV/AVI/etc. to MP4 for browser playback; returns final filename on disk. */
export async function prepareBrowserVideo(
  uploadDir: string,
  filename: string,
  onProgress?: (pct: number) => void,
): Promise<{
  filename: string
  durationSec: number
}> {
  const ext = extname(filename).toLowerCase()
  let currentName = filename
  let currentPath = join(uploadDir, currentName)

  if (needsBrowserTranscode(currentName)) {
    const base = basename(currentName, ext)
    const mp4Name = `${base}.mp4`
    const mp4Path = join(uploadDir, mp4Name)
    if (existsSync(mp4Path)) {
      // Already transcoded from a prior run — reuse the existing MP4.
      currentName = mp4Name
      currentPath = mp4Path
    } else {
      await transcodeVideoToMp4(currentPath, mp4Path, onProgress)
      await unlink(currentPath).catch(() => {})
      currentName = mp4Name
      currentPath = mp4Path
    }
  }

  const durationSec = await probeVideoDurationSec(currentPath)
  return { filename: currentName, durationSec }
}
