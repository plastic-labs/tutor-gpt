import React from 'react';
import { ParsedFile, getFileIcon } from '@/utils/parseFiles';

interface FileUploadProps {
  file: ParsedFile;
  className?: string;
}

/**
 * Displays a styled file preview with an icon, file name, and extension.
 *
 * Renders a container showing the file's icon based on its extension, the file name with truncation for long names, and the file extension in uppercase. Supports additional styling via the {@link className} prop and includes accessibility attributes for the icon.
 */
function FileUpload({ file, className = '' }: FileUploadProps) {
  const icon = getFileIcon(file.extension);

  return (
    <div
      className={`inline-flex items-center gap-2 bg-white border border-gray-300 rounded-xl px-3 py-2 mx-1 my-1 hover:bg-gray-100 transition-colors ${className}`}
    >
      <span
        className="text-lg"
        role="img"
        aria-label={`${file.extension} file`}
      >
        {icon}
      </span>
      <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
        {file.name}
      </span>
      <span className="text-xs text-gray-500 uppercase font-semibold">
        {file.extension}
      </span>
    </div>
  );
}

export default FileUpload;
