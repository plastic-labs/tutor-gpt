"use client";
import Image from "next/image";

import banner from "@/public/bloom2x1.svg";
import icon from "@/public/bloomicon.jpg";
import usericon from "@/public/usericon.svg";

import { FaLightbulb, FaPaperPlane } from "react-icons/fa";
import { GrClose } from "react-icons/gr";
import { useRef, useState } from "react";

import ReactMarkdown from "react-markdown";

export default function Home() {
  const [isThoughtsOpen, setIsThoughtsOpen] = useState(false);
  const [thoughts, setThoughts] = useState<string[]>([]);
  const [messages, setMessages] = useState([
    {
      text: `I’m your Aristotelian learning companion — here to help you follow your curiosity in whatever direction you like. My engineering makes me extremely receptive to your needs and interests. You can reply normally, and I’ll always respond!\n\nIf I&apos;m off track, just say so!\n\nNeed to leave or just done chatting? Let me know! I’m conversational by design so I’ll say goodbye 😊.`,
      isUser: false,
    },
  ]);

  const input = useRef<HTMLInputElement>(null);

  async function chat() {
    const textbox = input.current!;
    const message = textbox.value;
    textbox.value = "";

    setMessages((prev) => [
      ...prev,
      {
        text: message,
        isUser: true,
      },
      {
        text: "Thinking...",
        isUser: false,
      },
    ]);

    const data = await fetch("http://localhost:8000/stream", {
      method: "POST",
      body: JSON.stringify({
        conversation_id: "ayush1",
        // TODO: handle converations
        message: message,
      }),
      // no cors
      // mode: "no-cors",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const reader = data.body?.pipeThrough(new TextDecoderStream()).getReader()!;

    // clear the last message
    setMessages((prev) => {
      prev[prev.length - 1].text = "";
      return [...prev];
    });

    // the thought is the first chunk sent
    const { done, value } = await reader.read();
    setThoughts((prev) => [...prev, value as string]);

    // process the response chunks
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      console.log(value);
      setMessages((prev) => {
        prev[prev.length - 1].text += value;
        return [...prev];
      });
    }
  }

  return (
    <main className="flex h-[100dvh] w-screen flex-col pb-[env(keyboard-inset-height)] lg:container lg:mx-auto text-sm lg:text-2xl overflow-hidden relative">
      <nav className="flex justify-between items-center p-4 border-b border-gray-300">
        <Image src={banner} alt="banner" className="h-10  w-auto" />
        <button
          className="bg-neon-green rounded-lg px-4 py-2 flex justify-center items-center gap-2"
          onClick={() => setIsThoughtsOpen(true)}
        >
          See Thoughts
          <FaLightbulb className="inline" />
        </button>
      </nav>
      <section className="flex flex-col flex-1 overflow-y-auto">
        {messages.map((message, i) => {
          return (
            <Message isUser={message.isUser} key={i}>
              <ReactMarkdown>{message.text}</ReactMarkdown>
            </Message>
          );
        })}
      </section>
      <section
        id="send"
        className="flex p-3 lg:p-5 gap-3 border-t border-gray-300"
      >
        <input
          type="text"
          ref={input}
          placeholder="Type a message..."
          className="flex-1 px-3 py-1 lg:px-5 lg:py-3 bg-gray-100 text-gray-400 rounded-2xl"
        />
        <button
          className="bg-dark-green text-neon-green rounded-full px-4 py-2 lg:px-7 lg:py-3 flex justify-center items-center gap-2"
          onClick={chat}
        >
          <FaPaperPlane className="inline" />
        </button>
      </section>
      <section
        className={
          "absolute h-[100dvh] flex flex-col w-4/5 right-0 top-0 bg-neon-green transition-all duration-300 ease-in-out " +
          (isThoughtsOpen ? "translate-x-0 shadow-lg" : "translate-x-full")
        }
      >
        <div className="flex flex-row-reverse p-4">
          <button
            className="text-dark-green text-xl"
            onClick={() => setIsThoughtsOpen(false)}
          >
            <GrClose className="inline" />
          </button>
        </div>
        <div className="flex flex-col flex-1 overflow-y-auto px-4 gap-2">
          <h1 className="text-2xl font-bold">Thoughts</h1>
          {thoughts.length ? (
            thoughts.map((thought, i) => <p key={i}>{thought}</p>)
          ) : (
            <p>Bloom's thoughts will show up here!</p>
          )}
        </div>
      </section>
    </main>
  );
}

function Message({
  children,
  isUser,
}: {
  children: React.ReactNode;
  isUser?: boolean;
}) {
  return (
    <article
      className={
        "flex p-5 lg:p-8 gap-2 lg:gap-5 lg:rounded-2xl " +
        (isUser ? "bg-gray-100" : "")
      }
    >
      <Image
        src={isUser ? usericon : icon}
        alt="icon"
        className="rounded-full w-6 h-6 lg:w-12 lg:h-12"
      />
      <div className=" flex flex-col gap-2">{children}</div>
    </article>
  );
}
