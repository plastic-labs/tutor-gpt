export interface ParsedFile {
  name: string
  extension: string
}

export interface ParsedContent {
  content: string
  files: ParsedFile[]
}

export function parseFileUploads(content: string): ParsedContent {
  const fileRegex = /<file-name>(.*?)<\/file-name>/g
  const files: ParsedFile[] = []
  let match

  while ((match = fileRegex.exec(content)) !== null) {
    const fileName = match[1]
    const extension = fileName.split('.').pop() || ''
    files.push({
      name: fileName,
      extension: extension.toLowerCase(),
    })
  }

  // Remove all file tags from content (they're at the end)
  const cleanedContent = content.replace(fileRegex, '').trim()

  return {
    content: cleanedContent,
    files,
  }
}

export function getFileIcon(extension: string): string {
  const iconMap: { [key: string]: string } = {
    pdf: '📄',
    doc: '📝',
    docx: '📝',
    txt: '📄',
    md: '📝',
    js: '📄',
    ts: '📄',
    py: '🐍',
    java: '☕',
    cpp: '⚡',
    c: '⚡',
    html: '🌐',
    css: '🎨',
    json: '📋',
    xml: '📋',
    zip: '📦',
    rar: '📦',
    jpg: '🖼️',
    jpeg: '🖼️',
    png: '🖼️',
    gif: '🖼️',
    mp4: '🎥',
    mp3: '🎵',
    wav: '🎵',
  }

  return iconMap[extension] || '📄'
}
