"use client";
import Image from "next/image";

import banner from "@/public/bloom2x1.svg";
import Message from "@/components/message";
import Thoughts from "@/components/thoughts";
import Sidebar from "@/components/sidebar"

import { FaLightbulb, FaPaperPlane, FaBars, FaTrash, FaEdit } from "react-icons/fa";
// import { IoIosArrowDown } from "react-icons/io";
// import { GrClose } from "react-icons/gr";
import { useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { dark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { v4 as uuidv4 } from "uuid";
import Typing from "@/components/typing";

// Supabase 
import { Session } from '@supabase/supabase-js'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface Message {
  text: string;
  isUser: boolean;
}

interface Conversation {
  conversation_id: string;
  name: string;
}

const URL = process.env.NEXT_PUBLIC_URL;
const defaultMessage: Message = {
  text: `I&apos;m your Aristotelian learning companion — here to help you follow your curiosity in whatever direction you like. My engineering makes me extremely receptive to your needs and interests. You can reply normally, and I’ll always respond!\n\nIf I&apos;m off track, just say so!\n\nNeed to leave or just done chatting? Let me know! I’m conversational by design so I’ll say goodbye 😊.`,
  isUser: false,
}

export default function Home() {
  const [isThoughtsOpen, setIsThoughtsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [thought, setThought] = useState("");
  const [userId, setUserId] = useState("LOADING");


  const [messages, setMessages] = useState<Array<Message>>([
    defaultMessage,
  ]);
  const [authSession, setAuthSession] = useState<Session | null>(null);
  const [conversations, setConversations] = useState<Array<Conversation>>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation>({ "conversation_id": "", "name": "" })
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const supabase = createClientComponentClient()

  const newChat = useCallback(
    async () => {
      return await fetch(`${URL}/api/conversations/insert?user_id=${userId}`)
        .then((res) => res.json())
        .then(({ conversation_id }) => {
          return conversation_id
        })
        .catch((err) => console.error(err))

    },
    [userId],)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthSession(session);
      if (session) {
        setUserId(session.user.id)
      } else {
        setUserId(`anon_${uuidv4()}`)
      }
    })
  }, [supabase])

  useEffect(() => {
    // console.log(authSession)
    // console.log(userId)
    const getConversations = async () => {
      return await fetch(`${URL}/api/conversations/get?user_id=${userId}`)
        .then((res) => res.json())
        .then(({ conversations }) => {
          // console.log(conversations)
          return conversations
        })
    }
    if (authSession) {
      getConversations()
        .then((conversations) => {
          if (conversations.length > 0) {
            setConversations(conversations)
            setCurrentConversation(conversations[0])
          } else {
            newChat().then((conversation_id) => {
              let newConversation: Conversation = {
                name: "",
                conversation_id
              }
              setCurrentConversation(newConversation)
              setConversations(c => [...c, newConversation])
            })
          }
        })
    } else {
      // TODO store anonymous chats in localstorage or cookies
      if (userId !== "LOADING") {
        newChat().then((conversation_id) => {
          const newConversation: Conversation = {
            name: "",
            conversation_id
          }
          setCurrentConversation(newConversation)
          setConversations(c => [...c, newConversation])
        })
      }
    }
  }, [authSession, userId, newChat])

  useEffect(() => {
    const getMessages = async () => {
      return await fetch(`${URL}/api/messages?user_id=${userId}&conversation_id=${currentConversation.conversation_id}`)
        .then((res) => res.json())
        .then(({ messages }) => {
          const formattedMessages = messages.map((message: any) => {
            return {
              text: message.data.content,
              isUser: message.type === "human",
            }
          })
          return formattedMessages
        })
    }

    if (currentConversation.conversation_id) {
      getMessages().then((messages) => {
        setMessages([defaultMessage, ...messages])
      })
    }

  }, [currentConversation, userId])


  // async function newChat() {
  //   return await fetch(`${URL}/api/conversations/insert?user_id=${userId}`)
  //     .then((res) => res.json())
  //     .then(({ conversation_id }) => {
  //       return conversation_id
  //     })
  //     .catch((err) => console.error(err))
  // }

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
        text: "",
        isUser: false,
      },
    ]);

    const data = await fetch(`${URL}/api/stream`, {
      method: "POST",
      body: JSON.stringify({
        user_id: userId,
        conversation_id: currentConversation.conversation_id,
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

    let isThinking = true;
    setThought("");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      // console.log(value);
      if (isThinking) {
        if (value.includes("❀")) {
          // a bloom delimiter
          isThinking = false;
          continue;
        }
        setThought((prev) => prev + value);
      } else {
        setMessages((prev) => {
          prev[prev.length - 1].text += value;
          return [...prev];
        });
      }
    }
  }

  return (
    <main className="flex h-[100dvh] w-screen flex-col pb-[env(keyboard-inset-height)] text-sm lg:text-base overflow-hidden relative">
      <Sidebar
        conversations={conversations}
        authSession={authSession}
        currentConversation={currentConversation}
        setCurrentConversation={setCurrentConversation}
        setConversations={setConversations}
        newChat={newChat}
        userId={userId}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />
      <div className="flex flex-col w-full h-[100dvh] lg:pl-60 xl:pl-72">
        <nav className="flex justify-between items-center p-4 border-b border-gray-300">
          <FaBars className="inline lg:hidden" onClick={() => setIsSidebarOpen(!isSidebarOpen)} />
          <Image src={banner} alt="banner" className="h-10  w-auto" />
          <button
            className="bg-neon-green rounded-lg px-4 py-2 flex justify-center items-center gap-2"
            onClick={() => setIsThoughtsOpen(true)}
          >
            See Thoughts
            <FaLightbulb className="inline" />
          </button>
        </nav>
        {!authSession && (
          <section className="bg-neon-green text-black text-center py-4">
            <p>To save your conversation history and personalize your messages <span className="cursor-pointer hover:cursor-pointer font-bold underline" onClick={() => router.push("/auth")}>sign in here</span></p>
          </section>
        )}
        <section className="flex flex-col flex-1 overflow-y-auto">

          {messages.map((message, i) => {
            return (
              <Message isUser={message.isUser} key={i}>
                {message.text ? (
                  <ReactMarkdown
                    components={{
                      ol: ({ node, ...props }) => <ol className="list-decimal" {...props} />,
                      ul: ({ node, ...props }) => <ul className="list-disc" {...props} />,
                      code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '')
                        return !inline && match ? (
                          <SyntaxHighlighter
                            {...props}
                            children={String(children).replace(/\n$/, '')}
                            lineProps={{ style: { wordBreak: 'break-all', whiteSpace: 'pre-wrap' } }}
                            style={dark}
                            language={match[1]}
                            PreTag="div"
                            wrapLines={true}
                          />
                        ) : (
                          <code {...props} className={className} style={{ whiteSpace: 'pre-wrap' }}>
                            {children}
                          </code>
                        )
                      }
                    }}
                  >{message.text}</ReactMarkdown>
                ) : (
                  <Typing />
                )}
              </Message>
            );
          })}
        </section>
        <form
          id="send"
          className="flex p-3 lg:p-5 gap-3 border-gray-300"
          onSubmit={(e) => {
            e.preventDefault();
            chat();
          }}
        >
          {/* TODO: validate input */}
          <input
            type="text"
            ref={input}
            placeholder="Type a message..."
            className="flex-1 px-3 py-1 lg:px-5 lg:py-3 bg-gray-100 text-gray-400 rounded-2xl"
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
