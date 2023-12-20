import ReactMarkdown from "react-markdown";
import SyntaxHighlighter from "react-syntax-highlighter";
import { dark } from "react-syntax-highlighter/dist/esm/styles/prism";
import Typing from "./typing";
import { text } from "stream/consumers";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

export default function MarkdownWrapper({ text }: { text: string }) {
  return text ? (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      // @ts-expect-error i think typing is wrong from the library itself, this comment should raise an error once its fixed. // TODO: remove this comment
      rehypePlugins={[rehypeKatex]}
      components={{
        ol: ({ node, ...props }) => { const { ordered, ...filteredProps } = props; return <ol className="list-decimal" {...filteredProps} /> },
        ul: ({ node, ...props }) => { const { ordered, ...filteredProps } = props; return <ul className="list-disc" {...filteredProps} /> },
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
