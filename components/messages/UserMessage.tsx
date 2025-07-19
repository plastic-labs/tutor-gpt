import React from 'react'
import { parseFileUploads } from '@/utils/parseFiles'
import type { Message } from '@/utils/types'
import FileUpload from '../FileUpload'
import MarkdownWrapper from '../markdownWrapper'

interface UserMessageProps {
  message: Message
}

function UserMessage({ message }: UserMessageProps) {
  const { content, files } = parseFileUploads(message.content)

  return (
    <div className="flex flex-col items-end mb-4 gap-1">
      {files.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-end">
          {files.map((file, index) => (
            <FileUpload key={index} file={file} />
          ))}
        </div>
      )}
      <div className="max-w-[80%] bg-secondary-background text-foreground rounded-2xl px-4 py-3">
        <MarkdownWrapper text={content} />
      </div>
    </div>
  )
}

export default UserMessage
