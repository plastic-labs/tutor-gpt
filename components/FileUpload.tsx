import React from 'react';
import { ParsedFile, getFileIcon } from '@/utils/parseFiles';
import { X } from 'lucide-react';

interface FileUploadProps {
  file: ParsedFile;
  className?: string;
  onRemove?: () => void;
  showRemove?: boolean;
}

function FileUpload({ file, className = '', onRemove, showRemove = false }: FileUploadProps) {
  const icon = getFileIcon(file.extension);

  return (
    <div
      className={`inline-flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2 mx-1 my-1 hover:bg-muted transition-colors relative ${className}`}
    >
      <span
        className="text-lg"
        role="img"
        aria-label={`${file.extension} file`}
      >
        {icon}
      </span>
      <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
        {file.name}
      </span>
      <span className="text-xs text-muted-foreground uppercase font-semibold">
        {file.extension}
      </span>
      {showRemove && onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 hover:bg-muted-foreground/20 rounded-full p-1 transition-colors"
        >
          <X className="size-3 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

export default FileUpload;
