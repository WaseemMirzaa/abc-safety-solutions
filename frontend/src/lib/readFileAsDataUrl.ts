/** Read a file as a data URL for local demo storage (e.g. localStorage). */
export function readFileAsDataUrl(file: File, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > maxBytes) {
      reject(
        new Error(
          `File is ${(file.size / 1024 / 1024).toFixed(1)} MB. Max for this demo is ${(maxBytes / 1024 / 1024).toFixed(0)} MB (browser storage limit).`,
        ),
      )
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Could not read file.'))
    reader.readAsDataURL(file)
  })
}

export function inferMediaKind(mime: string): 'image' | 'audio' | 'document' | 'other' {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime === 'application/pdf' || mime.includes('document') || mime.includes('text/')) return 'document'
  return 'other'
}
