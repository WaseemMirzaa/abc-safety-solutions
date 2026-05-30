import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { unlink } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

/** Formats browsers cannot play natively in HTML5 video. */
const TRANSCODE_EXTS = new Set(['.wmv', '.avi', '.mkv', '.flv'])

export function needsBrowserTranscode(filename: string): boolean {
  return TRANSCODE_EXTS.has(extname(filename).toLowerCase())
}

export async function probeVideoDurationSec(filePath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync(
      'ffprobe',
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

export async function transcodeVideoToMp4(inputPath: string, outputPath: string): Promise<void> {
  await execFileAsync(
    'ffmpeg',
    [
      '-y',
      '-i',
      inputPath,
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '23',
      '-c:a',
      'aac',
      '-movflags',
      '+faststart',
      outputPath,
    ],
    { timeout: 1_800_000 },
  )
}

/** Convert WMV/AVI/etc. to MP4 for browser playback; returns final filename on disk. */
export async function prepareBrowserVideo(uploadDir: string, filename: string): Promise<{
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
      await transcodeVideoToMp4(currentPath, mp4Path)
      await unlink(currentPath).catch(() => {})
      currentName = mp4Name
      currentPath = mp4Path
    }
  }

  const durationSec = await probeVideoDurationSec(currentPath)
  return { filename: currentName, durationSec }
}
