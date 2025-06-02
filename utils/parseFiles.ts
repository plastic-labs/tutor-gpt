export interface ParsedFile {
  name: string;
  extension: string;
}

export interface ParsedContent {
  content: string;
  files: ParsedFile[];
}

/**
 * Extracts file names enclosed in `<file-name>` tags from the input string and returns the cleaned content and parsed file metadata.
 *
 * @param content - The string containing file name tags and content.
 * @returns An object with the cleaned content (with file tags removed) and an array of parsed files, each with its name and lowercase extension.
 */
export function parseFileUploads(content: string): ParsedContent {
  const fileRegex = /<file-name>(.*?)<\/file-name>/g;
  const files: ParsedFile[] = [];
  let match;
  
  while ((match = fileRegex.exec(content)) !== null) {
    const fileName = match[1];
    const extension = fileName.split('.').pop() || '';
    files.push({
      name: fileName,
      extension: extension.toLowerCase()
    });
  }
  
  // Remove all file tags from content (they're at the end)
  const cleanedContent = content.replace(fileRegex, '').trim();
  
  return {
    content: cleanedContent,
    files
  };
}

/**
 * Returns an emoji icon representing the file type for a given extension.
 *
 * @param extension - The file extension to map to an icon.
 * @returns An emoji corresponding to the file type, or a default document icon if the extension is unrecognized.
 */
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
    wav: '🎵'
  };
  
  return iconMap[extension] || '📄';
}