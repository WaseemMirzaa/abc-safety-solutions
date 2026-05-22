import JSZip from 'jszip'
import { resolveMediaUrl } from '@/lib/mediaUrl'

/** Count slides in a .pptx file (OOXML package). */
export async function countPptxSlides(source: File | ArrayBuffer | string): Promise<number> {
  let buffer: ArrayBuffer
  if (typeof source === 'string') {
    const res = await fetch(resolveMediaUrl(source))
    if (!res.ok) throw new Error('Could not read presentation file')
    buffer = await res.arrayBuffer()
  } else if (source instanceof File) {
    buffer = await source.arrayBuffer()
  } else {
    buffer = source
  }
  const zip = await JSZip.loadAsync(buffer)
  const n = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name)).length
  if (n < 1) throw new Error('No slides found in this PowerPoint file')
  return n
}
