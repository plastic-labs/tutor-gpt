"use client";
import Image from "next/image";

import banner from "@/public/bloom2x1.svg";
import Message from "@/components/message";
import Thoughts from "@/components/thoughts";
import Sidebar from "@/components/sidebar";

import { FaLightbulb, FaPaperPlane, FaBars } from "react-icons/fa";
import { useRef, useEffect, useState } from "react";

import Link from "next/link";
import MarkdownWrapper from "@/components/markdownWrapper";
import { API, Conversation } from "@/utils/api";

interface Message {
  text: string;
  isUser: boolean;
}

const url = process.env.NEXT_PUBLIC_API_URL as string;

const defaultMessage: Message = {
  text: `I&apos;m your Aristotelian learning companion — here to help you follow your curiosity in whatever direction you like. My engineering makes me extremely receptive to your needs and interests. You can reply normally, and I’ll always respond!\n\nIf I&apos;m off track, just say so!\n\nNeed to leave or just done chatting? Let me know! I’m conversational by design so I’ll say goodbye 😊.`,
  isUser: false,
};

export default function Home() {
  const [isThoughtsOpen, setIsThoughtsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [thought, setThought] = useState("");
  const [canSend, setCanSend] = useState(false);
  const [api, setApi] = useState<API>();

  const [messages, setMessages] = useState<Message[]>([defaultMessage]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] =
    useState<Conversation>();

  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const api = await API.create(url);
      setApi(api);
      const conversations = await api.getConversations();
      setConversations(conversations);
      setCurrentConversation(conversations[0]);
      setCanSend(true);
    })();
  }, []);

  async function chat() {
    const textbox = input.current!;
    const message = textbox.value;
    textbox.value = "";

    setCanSend(false); // Disable sending more messages until the current generation is done

    setMessages((prev) => [
      ...prev,
      {
        text: message,
        isUser: true,
      },
      {
        text: "",
        isUser: false,
      },
    ]);

    const reader = await currentConversation!.chat(message);

    let isThinking = true;
    setThought("");

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        // console.log("done");
        setCanSend(true);
        break;
      }
      // console.log(value);
      if (isThinking) {
        if (value.includes("❀")) {
          // a bloom delimiter
          isThinking = false;
          continue;
        }
        setThought((prev) => prev + value);
      } else {
        if (value.includes("❀")) {
          setCanSend(true); // Bloom delimeter
          continue;
        }
        setMessages((prev) => {
          prev[prev.length - 1].text += value;
          return [...prev];
        });

        if (isAtBottom.current) {
          const messageContainer = messageContainerRef.current;
          if (messageContainer) {
            messageContainer.scrollTop = messageContainer.scrollHeight;
          }
        }
      }
    }
  }

  return (
    <main className="flex h-[100dvh] w-screen flex-col pb-[env(keyboard-inset-height)] text-sm lg:text-base overflow-hidden relative">
      {/* <Sidebar
        conversations={conversations}
        authSession={authSession}
        currentConversation={currentConversation}
        setCurrentConversation={setCurrentConversation}
        setConversations={setConversations}
        newChat={newChat}
        userId={userId}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      /> */}
      <div className="flex flex-col w-full h-[100dvh] lg:pl-60 xl:pl-72">
        <nav className="flex justify-between items-center p-4 border-b border-gray-300">
          <FaBars
            className="inline lg:hidden"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          />
          <Image src={banner} alt="banner" className="h-10  w-auto" />
          <button
            className="bg-neon-green rounded-lg px-4 py-2 flex justify-center items-center gap-2"
            onClick={() => setIsThoughtsOpen(true)}
          >
            See Thoughts
            <FaLightbulb className="inline" />
          </button>
        </nav>
        {!api?.session && (
          <section className="bg-neon-green text-black text-center py-4">
            <p>
              To save your conversation history and personalize your messages{" "}
              <Link
                className="cursor-pointer hover:cursor-pointer font-bold underline"
                href={"/auth"}
              >
                sign in here
              </Link>
            </p>
          </section>
        )}
        <section
          className="flex flex-col flex-1 overflow-y-auto lg:px-5"
          ref={messageContainerRef}
        >
          {messages.map((message, i) => (
            <Message isUser={message.isUser} key={i}>
              <MarkdownWrapper text={message.text} />
            </Message>
          ))}
        </section>
        <form
          id="send"
          className="flex p-3 lg:p-5 gap-3 border-gray-300"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSend && input.current?.value) {
              chat();
            }
          }}
        >
          {/* TODO: validate input */}
          <input
            type="text"
            ref={input}
            placeholder="Type a message..."
            className={`flex-1 px-3 py-1 lg:px-5 lg:py-3 bg-gray-100 text-gray-400 rounded-2xl border-2 ${
              canSend ? " border-green-200" : "border-red-200 opacity-50"
            }`}
            disabled={!canSend}
          />
          <button
            className="bg-dark-green text-neon-green rounded-full px-4 py-2 lg:px-7 lg:py-3 flex justify-center items-center gap-2"
            type="submit"
          >
            <FaPaperPlane className="inline" />
          </button>
        </form>
      </div>
      <Thoughts
        thought={thought}
        setIsThoughtsOpen={setIsThoughtsOpen}
        isThoughtsOpen={isThoughtsOpen}
      />
    </main>
  );
}
