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
    <div className="mb-4 flex flex-col items-end gap-1">
      {files.length > 0 && (
        <div className="flex flex-wrap justify-end gap-1">
          {files.map((file, index) => (
            <FileUpload key={index} file={file} />
          ))}
        </div>
      )}
      <div className="max-w-[80%] rounded-2xl bg-secondary-background px-4 py-3 text-foreground">
        <MarkdownWrapper text={content} />
      </div>
    </div>
  )
}

export default UserMessage
