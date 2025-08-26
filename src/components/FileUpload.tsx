import { X } from 'lucide-react'
import { getFileIcon, type ParsedFile } from '@/utils/parseFiles'

interface FileUploadProps {
  file: ParsedFile
  className?: string
  onRemove?: () => void
  showRemove?: boolean
}

function FileUpload({
  file,
  className = '',
  onRemove,
  showRemove = false,
}: FileUploadProps) {
  const icon = getFileIcon(file.extension)

  return (
    <div
      className={`relative mx-1 my-1 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 transition-colors hover:bg-muted ${className}`}
    >
      <span
        className="text-lg"
        role="img"
        aria-label={`${file.extension} file`}
      >
        {icon}
      </span>
      <span className="max-w-[200px] truncate font-medium text-foreground text-sm">
        {file.name}
      </span>
      <span className="font-semibold text-muted-foreground text-xs uppercase">
        {file.extension}
      </span>
      {showRemove && onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 rounded-full p-1 transition-colors hover:bg-muted-foreground/20"
        >
          <X className="size-3 text-muted-foreground" />
        </button>
      )}
    </div>
  )
}

export default FileUpload
