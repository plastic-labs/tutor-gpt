import ReactMarkdown from "react-markdown";
import SyntaxHighlighter from "react-syntax-highlighter";
import { dark } from "react-syntax-highlighter/dist/esm/styles/prism";
import Typing from "./typing";
import { text } from "stream/consumers";

export default function MarkdownWrapper({ text }: { text: string }) {
  return text ? (
    <ReactMarkdown
      components={{
        ol: ({ node, ...props }) => <ol className="list-decimal" {...props} />,
        ul: ({ node, ...props }) => <ul className="list-disc" {...props} />,
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          return !inline && match ? (
            <SyntaxHighlighter
              {...props}
              children={String(children).replace(/\n$/, "")}
              lineProps={{
                style: {
                  wordBreak: "break-all",
                  whiteSpace: "pre-wrap",
                },
              }}
              style={dark}
              language={match[1]}
              PreTag="div"
              wrapLines={true}
            />
          ) : (
            <code
              {...props}
              className={className}
              style={{ whiteSpace: "pre-wrap" }}
            >
              {children}
            </code>
          );
        },
      }}
    >
      {text}
    </ReactMarkdown>
  ) : (
    <Typing />
  );
}
